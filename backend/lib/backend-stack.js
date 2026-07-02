// ─── LeafFilter Lighting — Backend Stack (Phase 1 scaffold) ──────────────────
//
// Implements the serverless core from docs/backend-architecture.md §3.1:
//   • Cognito user pool            — customer identity (arch §3.6)
//   • DynamoDB single table        — accounts / devices / zones / schedules (§4)
//   • HTTP API + JWT authorizer    — the App API the phone talks to (§3.3)
//   • Lambda handlers              — devices, state (shadow proxy), schedules, config
//   • Daily materializer (stub)    — schedule execution pipeline (§3.5)
//
// NOT in this scaffold yet (deliberate, needs IT/account decisions):
//   • IoT fleet provisioning template + claim-cert flow (§3.4) — requires the
//     factory/claim-cert conversation; devices.mjs documents the contract.
//   • EventBridge Scheduler one-shot fan-out — materializer logs its plan
//     until IoT things exist to target.
//   • WAF, custom domain, multi-stage pipelines — GA hardening (§7 Phase 3).
// ─────────────────────────────────────────────────────────────────────────────

const { Stack, Duration, RemovalPolicy, CfnOutput } = require('aws-cdk-lib');
const cognito = require('aws-cdk-lib/aws-cognito');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const events = require('aws-cdk-lib/aws-events');
const targets = require('aws-cdk-lib/aws-events-targets');
const apigwv2 = require('aws-cdk-lib/aws-apigatewayv2');
const { HttpLambdaIntegration } = require('aws-cdk-lib/aws-apigatewayv2-integrations');
const { HttpJwtAuthorizer } = require('aws-cdk-lib/aws-apigatewayv2-authorizers');
const path = require('node:path');

class LightingBackendStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const stage = props.stage ?? 'dev';
    const isProd = stage === 'prod';

    // ── Identity: Cognito user pool (arch §3.6) ──────────────────────────────
    const userPool = new cognito.UserPool(this, 'Customers', {
      userPoolName: `lf-lighting-customers-${stage}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: { minLength: 10 },
      mfa: cognito.Mfa.OPTIONAL,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('MobileApp', {
      authFlows: { userSrp: true },
      accessTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // ── Data: single-table DynamoDB (arch §4) ────────────────────────────────
    // PK / SK item layout:
    //   ACCOUNT#<sub>  PROFILE            account profile (lat/lon for sunset)
    //   ACCOUNT#<sub>  DEVICE#<deviceId>  ownership binding + device meta/zones
    //   ACCOUNT#<sub>  SCHEDULES          full schedule list (replace-on-write)
    //   ACCOUNT#<sub>  CONFIG             zones/scenes/vacation snapshot
    //   DEVICE#<serial> CLAIM             pending claim: popToken (+TTL), set at provisioning
    // GSI1 (deviceId → owner) for reverse lookups:
    //   GSI1PK = DEVICE#<deviceId>, GSI1SK = ACCOUNT#<sub>
    const table = new dynamodb.Table(this, 'Data', {
      tableName: `lf-lighting-${stage}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      removalPolicy: isProd ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // ── Lambda handlers ──────────────────────────────────────────────────────
    const fn = (name, file, extraEnv = {}) =>
      new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        handler: `${file}.handler`,
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
        timeout: Duration.seconds(10),
        memorySize: 256,
        environment: { TABLE_NAME: table.tableName, STAGE: stage, ...extraEnv },
      });

    const devicesFn = fn('DevicesFn', 'devices');
    const stateFn = fn('StateFn', 'state');
    const schedulesFn = fn('SchedulesFn', 'schedules');
    const configFn = fn('ConfigFn', 'config');
    const materializerFn = fn('MaterializerFn', 'materializer');
    materializerFn.addEnvironment('IS_MATERIALIZER', '1');

    table.grantReadWriteData(devicesFn);
    table.grantReadData(stateFn);
    table.grantReadWriteData(schedulesFn);
    table.grantReadWriteData(configFn);
    table.grantReadData(materializerFn);

    // Shadow proxy: the ONLY writer to IoT from the API tier (arch §3.3).
    // Scoped to this account/region's things; per-thing scoping tightens in
    // Phase 2 when thing names are formalized (lf-<serial>).
    const shadowPolicy = new iam.PolicyStatement({
      actions: ['iot:GetThingShadow', 'iot:UpdateThingShadow'],
      resources: [`arn:aws:iot:${this.region}:${this.account}:thing/lf-*`],
    });
    stateFn.addToRolePolicy(shadowPolicy);
    materializerFn.addToRolePolicy(shadowPolicy);
    // Resolve the account-specific IoT data endpoint at runtime
    const describeEndpoint = new iam.PolicyStatement({
      actions: ['iot:DescribeEndpoint'],
      resources: ['*'],
    });
    stateFn.addToRolePolicy(describeEndpoint);
    materializerFn.addToRolePolicy(describeEndpoint);

    // ── App API: HTTP API + Cognito JWT authorizer (arch §3.3, §3.6) ────────
    const authorizer = new HttpJwtAuthorizer(
      'CognitoJwt',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );

    const api = new apigwv2.HttpApi(this, 'AppApi', {
      apiName: `lf-lighting-api-${stage}`,
      defaultAuthorizer: authorizer, // every route requires a signed-in customer
      corsPreflight: {
        allowOrigins: ['*'], // dev: browser prototype; tighten to app origins at GA
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ['Authorization', 'Content-Type'],
      },
    });

    const routes = [
      ['GET', '/devices', devicesFn],
      ['POST', '/devices/claim', devicesFn],
      ['GET', '/devices/{deviceId}/state', stateFn],
      ['PUT', '/devices/{deviceId}/state', stateFn],
      ['PUT', '/schedules', schedulesFn],
      ['PUT', '/config', configFn],
    ];
    for (const [method, routePath, handler] of routes) {
      api.addRoutes({
        path: routePath,
        methods: [apigwv2.HttpMethod[method]],
        integration: new HttpLambdaIntegration(`${method}${routePath.replace(/\W/g, '')}`, handler),
      });
    }

    // ── Schedule pipeline: daily materializer (arch §3.5) ────────────────────
    // Runs hourly in the scaffold (cheap, and homes span time zones — each run
    // materializes accounts whose local "just after midnight" window it hits).
    new events.Rule(this, 'MaterializerTick', {
      schedule: events.Schedule.rate(Duration.hours(1)),
      targets: [new targets.LambdaFunction(materializerFn)],
    });

    // ── Outputs the app needs (paste into localStorage for dev, arch §3.3) ──
    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, 'TableName', { value: table.tableName });
  }
}

module.exports = { LightingBackendStack };

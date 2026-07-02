#!/usr/bin/env node
// LeafFilter Lighting backend — CDK entry point.
// Region defaults to us-east-1 (IoT Core + full service coverage, lowest
// pricing tier). Override with CDK_DEFAULT_REGION / standard env config once
// IT confirms the landing-zone region.
const cdk = require('aws-cdk-lib');
const { LightingBackendStack } = require('../lib/backend-stack');

const app = new cdk.App();

new LightingBackendStack(app, 'LightingBackendDev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  stage: 'dev',
  description: 'LeafFilter Lighting cloud backend (dev) — docs/backend-architecture.md',
});

app.synth();

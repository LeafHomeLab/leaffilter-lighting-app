# LeafFilter Lighting — Cloud Backend (Phase 1 scaffold)

Implements the serverless core of `docs/backend-architecture.md` (§3): Cognito
customer identity, the App API (HTTP API + JWT authorizer), the device/ownership
registry (DynamoDB single table), the shadow proxy for remote light control,
schedule/config sync, and the hourly schedule-materializer pipeline (logic
stubbed, plumbing real).

> **Destination:** moves to its own repo (`lighting-backend`) once the company
> GitHub org repos exist. Versioned here in `backend/` until then.

## What IT must provide before this deploys

1. An **AWS dev account** (sandbox is fine) with an IAM role/user that can run
   CDK deployments, and confirmation of the target **region** (scaffold
   defaults to `us-east-1`).
2. That's it for the dev stack. Fleet provisioning (claim certs), custom
   domains, WAF, and multi-stage pipelines are Phase 2/3 items (§7).

## Deploy (once an account exists)

```bash
cd backend
npm install
npx cdk bootstrap            # once per account/region
npm run deploy               # stack: LightingBackendDev
```

Outputs to wire into the app (browser console / dev build):

```js
localStorage.lf_cloud_enabled  = '1';
localStorage.lf_cloud_api_base = '<ApiUrl output>';
localStorage.lf_cloud_token    = '<Cognito ID/access token>';   // until the sign-in UI lands
localStorage.lf_cloud_device_id = 'lf-<serial>';                // until the claim flow lands
```

Create a dev user + token without the app UI:

```bash
aws cognito-idp sign-up --client-id <UserPoolClientId> --username you@example.com --password '<pw>'
aws cognito-idp admin-confirm-sign-up --user-pool-id <UserPoolId> --username you@example.com
aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH \
  --client-id <UserPoolClientId> \
  --auth-parameters USERNAME=you@example.com,PASSWORD='<pw>'
# → AuthenticationResult.AccessToken  (note: enable USER_PASSWORD_AUTH on the
#   client first, or use USER_SRP via a helper — SRP is the production flow)
```

## Layout

| Path | What |
|---|---|
| `bin/app.js`, `lib/backend-stack.js` | CDK app + the whole stack |
| `lambda/util.mjs` | shared: DDB doc client, JWT sub, router, errors |
| `lambda/devices.mjs` | `GET /devices`, `POST /devices/claim` (PoP-token claim contract, §3.4) |
| `lambda/state.mjs` | `GET/PUT /devices/{id}/state` — shadow proxy, ownership-checked (§3.3) |
| `lambda/schedules.mjs` | `PUT /schedules` — replaces the app's `syncSchedules` stub |
| `lambda/config.mjs` | `PUT /config` — durable copy of the phone's `lf_state_v2` snapshot |
| `lambda/materializer.mjs` | hourly schedule expansion (Phase 2 fills in Scheduler fan-out) |

## Known scaffold shortcuts (must close before customer installs)

- **Dev-mode claim**: unregistered serials can be claimed when `STAGE=dev`
  (no fleet-provisioning pipeline yet). Production verifies the
  device-registered PoP token strictly — see `devices.mjs`.
- **CORS `*`** on the API (browser prototype convenience).
- **No IoT thing/cert provisioning** in the stack yet — the §3.4 fleet
  provisioning template lands with the factory/claim-cert decision.
- Materializer logs instead of creating EventBridge Scheduler one-shots.

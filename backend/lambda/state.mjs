// Shadow proxy: the app's remote transport for live light state (arch §3.3).
// GET  → shadow reported (what the controller last published)
// PUT  → shadow desired  (the same WLED /json/state payload the LAN path sends)
// Ownership is enforced on every call: the device must be bound to the
// caller's account in the registry.
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  IoTDataPlaneClient,
  GetThingShadowCommand,
  UpdateThingShadowCommand,
} from '@aws-sdk/client-iot-data-plane';
import { ddb, TABLE, accountSub, parseBody, json, router, HttpError } from './util.mjs';

const iot = new IoTDataPlaneClient({});

async function assertOwnership(event) {
  const sub = accountSub(event);
  const deviceId = event.pathParameters?.deviceId;
  if (!deviceId) throw new HttpError(400, 'deviceId required');
  const res = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `ACCOUNT#${sub}`, SK: `DEVICE#${deviceId}` },
  }));
  if (!res.Item) throw new HttpError(404, 'Device not found on this account');
  return deviceId; // thing name === deviceId (lf-<serial>)
}

async function getState(event) {
  const thingName = await assertOwnership(event);
  try {
    const res = await iot.send(new GetThingShadowCommand({ thingName }));
    const shadow = JSON.parse(new TextDecoder().decode(res.payload));
    return json(200, {
      reported: shadow.state?.reported ?? null,
      desired: shadow.state?.desired ?? null,
      connected: true, // Phase 2: real presence via IoT lifecycle events
    });
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      // Device claimed but never connected (or spike hardware offline)
      return json(200, { reported: null, desired: null, connected: false });
    }
    throw err;
  }
}

async function putState(event) {
  const thingName = await assertOwnership(event);
  const desired = parseBody(event); // WLED /json/state shape — passed through verbatim
  if (typeof desired !== 'object' || Array.isArray(desired)) {
    throw new HttpError(400, 'Expected a WLED state object');
  }
  await iot.send(new UpdateThingShadowCommand({
    thingName,
    payload: new TextEncoder().encode(JSON.stringify({ state: { desired } })),
  }));
  return json(200, { accepted: desired });
}

export const handler = router({
  'GET /devices/{deviceId}/state': getState,
  'PUT /devices/{deviceId}/state': putState,
});

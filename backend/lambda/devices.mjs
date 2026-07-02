// Device registry: list the account's controllers, claim a new one.
// Claim contract (arch doc §3.4): the firmware registers DEVICE#<serial>/CLAIM
// with its boot-generated popToken when it first connects (Phase 2, via IoT
// rule). The app reads the same token over BLE (physical proximity) and
// presents it here — a serial alone can never hijack a device.
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE, accountSub, parseBody, json, router, HttpError } from './util.mjs';

async function listDevices(event) {
  const sub = accountSub(event);
  const res = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `ACCOUNT#${sub}`, ':sk': 'DEVICE#' },
  }));
  const devices = (res.Items ?? []).map(({ deviceId, serial, name, zones, firmware, lastSeen }) =>
    ({ deviceId, serial, name, zones: zones ?? [], firmware, lastSeen }));
  return json(200, { devices });
}

async function claimDevice(event) {
  const sub = accountSub(event);
  const { serial, popToken } = parseBody(event);
  if (!serial || !popToken) throw new HttpError(400, 'serial and popToken required');

  const claim = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `DEVICE#${serial}`, SK: 'CLAIM' },
  }));

  if (process.env.STAGE === 'dev' && !claim.Item) {
    // Dev convenience: no fleet-provisioning pipeline yet, so allow claiming
    // unregistered serials. MUST be removed before any customer install —
    // production claims strictly verify the device-registered popToken.
    console.warn(`[claim] dev mode: accepting unregistered serial ${serial}`);
  } else {
    if (!claim.Item) throw new HttpError(404, 'Unknown device');
    if (claim.Item.claimedBy && claim.Item.claimedBy !== sub) {
      throw new HttpError(409, 'Device already claimed by another account');
    }
    if (claim.Item.popToken !== popToken) throw new HttpError(403, 'Invalid claim token');
  }

  const deviceId = `lf-${serial}`;
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `ACCOUNT#${sub}`,
      SK: `DEVICE#${deviceId}`,
      GSI1PK: `DEVICE#${deviceId}`,
      GSI1SK: `ACCOUNT#${sub}`,
      deviceId,
      serial,
      name: 'LeafFilter Controller',
      claimedAt: new Date().toISOString(),
    },
  }));
  // Mark the claim consumed (idempotent re-claim by same account stays ok)
  if (claim.Item) {
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: { ...claim.Item, claimedBy: sub },
    }));
  }
  return json(200, { deviceId });
}

export const handler = router({
  'GET /devices': listDevices,
  'POST /devices/claim': claimDevice,
});

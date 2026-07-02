// Config snapshot sync: zones, scenes, vacation settings — the durable copy
// of what today lives only in the phone's localStorage (lf_state_v2), so a
// reinstall restores the customer's setup (arch §4). Live light state is NOT
// stored here; the device shadow owns that (conflict rule, arch §3.3).
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE, accountSub, parseBody, json, router, HttpError } from './util.mjs';

const MAX_SNAPSHOT_BYTES = 200 * 1024;

async function putConfig(event) {
  const sub = accountSub(event);
  if ((event.body?.length ?? 0) > MAX_SNAPSHOT_BYTES) {
    throw new HttpError(413, 'Snapshot too large');
  }
  const snapshot = parseBody(event);
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `ACCOUNT#${sub}`,
      SK: 'CONFIG',
      snapshot,
      updatedAt: new Date().toISOString(),
    },
  }));
  return json(200, { ok: true });
}

export const handler = router({
  'PUT /config': putConfig,
});

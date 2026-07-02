// Schedule sync: the app PUTs its full schedule list (same entry shape as
// state.schedules in the app — trigger/timeVal/repeat/zones/scene/vacation).
// The hourly materializer turns these into concrete fire events (arch §3.5).
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE, accountSub, parseBody, json, router, HttpError } from './util.mjs';

async function putSchedules(event) {
  const sub = accountSub(event);
  const { schedules } = parseBody(event);
  if (!Array.isArray(schedules)) throw new HttpError(400, 'schedules array required');
  if (schedules.length > 100) throw new HttpError(400, 'Too many schedules');

  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: {
      PK: `ACCOUNT#${sub}`,
      SK: 'SCHEDULES',
      schedules,
      updatedAt: new Date().toISOString(),
    },
  }));
  return json(200, { count: schedules.length });
}

export const handler = router({
  'PUT /schedules': putSchedules,
});

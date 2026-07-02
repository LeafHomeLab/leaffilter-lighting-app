// Schedule materializer (arch §3.5) — SCAFFOLD.
//
// Production shape: runs hourly; for each account whose local time just
// passed midnight, expands the next 24h of schedules into concrete fire
// times (sunset/sunrise from the account's lat/lon, repeat rules with
// correct TZ/DST, that night's randomized vacation on/off pair), creating
// one EventBridge Scheduler one-shot per fire → Lambda → shadow desired.
//
// Scaffold behavior: logs the plan it WOULD create. This keeps the pipeline
// wired end-to-end (rule → lambda → data model) so Phase 2 fills in the
// expansion logic + Scheduler fan-out without re-plumbing anything.
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE } from './util.mjs';

export const handler = async () => {
  // Scan is acceptable at scaffold scale; Phase 2 replaces this with a GSI
  // over accounts-with-schedules partitioned by timezone bucket.
  const res = await ddb.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: { ':sk': 'SCHEDULES' },
  }));

  let total = 0;
  for (const item of res.Items ?? []) {
    const active = (item.schedules ?? []).filter((s) => s.active);
    total += active.length;
    console.log(`[materializer] ${item.PK}: ${active.length} active schedule(s)`,
      active.map((s) => `${s.trigger}@${s.timeVal || s.trigger} → ${s.scene}`));
    // TODO(Phase 2): expand to fire times; CreateSchedule one-shots via
    // @aws-sdk/client-scheduler; write ScheduleExecution audit records.
  }
  console.log(`[materializer] pass complete: ${res.Count ?? 0} account(s), ${total} active schedule(s)`);
  return { accounts: res.Count ?? 0, activeSchedules: total };
};

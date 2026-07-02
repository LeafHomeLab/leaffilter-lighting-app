// Shared helpers for the App API handlers.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE = process.env.TABLE_NAME;

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

/** Cognito subject (account id) from the HTTP API JWT authorizer context. */
export function accountSub(event) {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) throw new HttpError(401, 'Not authenticated');
  return sub;
}

export function parseBody(event) {
  try {
    return JSON.parse(event.body ?? '{}');
  } catch {
    throw new HttpError(400, 'Invalid JSON body');
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(status, body) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/** Wraps a route map { 'METHOD /path': fn } with error handling. */
export function router(routes) {
  return async (event) => {
    const key = `${event.requestContext.http.method} ${event.routeKey.split(' ')[1]}`;
    const fn = routes[key];
    try {
      if (!fn) throw new HttpError(404, `No route ${key}`);
      return await fn(event);
    } catch (err) {
      const status = err.status ?? 500;
      if (status === 500) console.error('Unhandled:', err);
      return json(status, { error: status === 500 ? 'Internal error' : err.message });
    }
  };
}

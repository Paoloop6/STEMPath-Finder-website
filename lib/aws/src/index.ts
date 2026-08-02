// Server-only AWS configuration and storage helpers.
//
// Credentials are never read from source code or from custom env vars. The
// clients rely on the AWS SDK default credential provider chain (AWS_PROFILE /
// ~/.aws/credentials, SSO, or instance roles in production). Never import this
// module from browser-facing code: it would fail to resolve credentials and
// would leak infrastructure names into the bundle.

import { createHash } from "node:crypto";

import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in STEMPath-Finder/.env (server-side only).`,
    );
  }
  return value;
}

export const awsConfig = {
  get region(): string {
    return requireEnv("AWS_REGION");
  },
  get s3Bucket(): string {
    return requireEnv("AWS_S3_BUCKET");
  },
  get dynamoTable(): string {
    return requireEnv("DYNAMODB_TABLE");
  },
} as const;

// Re-exported so server-side consumers depend on @workspace/aws alone rather
// than pinning their own copies of the SDK packages.
export { DescribeTableCommand } from "@aws-sdk/client-dynamodb";
export {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
export {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

let s3Singleton: S3Client | undefined;
let dynamoSingleton: DynamoDBDocumentClient | undefined;

export function getS3Client(): S3Client {
  s3Singleton ??= new S3Client({ region: awsConfig.region });
  return s3Singleton;
}

export function getDynamoDocumentClient(): DynamoDBDocumentClient {
  if (!dynamoSingleton) {
    const base = new DynamoDBClient({ region: awsConfig.region });
    dynamoSingleton = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return dynamoSingleton;
}

// --------------------------------------------------------------------------
// Hashing
// --------------------------------------------------------------------------

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

// --------------------------------------------------------------------------
// S3 helpers
// --------------------------------------------------------------------------

export async function uploadJson(key: string, value: unknown): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: "application/json",
    }),
  );
}

export async function uploadText(
  key: string,
  body: string,
  contentType = "text/plain; charset=utf-8",
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function readJson<T = unknown>(key: string): Promise<T> {
  const result = await getS3Client().send(
    new GetObjectCommand({ Bucket: awsConfig.s3Bucket, Key: key }),
  );
  const text = await result.Body?.transformToString();
  if (text === undefined) {
    throw new Error(`S3 object ${key} had no body`);
  }
  return JSON.parse(text) as T;
}

export async function deleteObject(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: awsConfig.s3Bucket, Key: key }),
  );
}

/**
 * Temporary, server-generated read access to a private S3 object. Never hand
 * the underlying key or credentials to the browser — only this expiring URL.
 */
export async function getPresignedReadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: awsConfig.s3Bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

// --------------------------------------------------------------------------
// DynamoDB helpers (single-table: PK / SK)
// --------------------------------------------------------------------------

export type Key = { PK: string; SK: string };

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await getDynamoDocumentClient().send(
    new PutCommand({ TableName: awsConfig.dynamoTable, Item: item }),
  );
}

export async function getItem<T = Record<string, unknown>>(
  key: Key,
): Promise<T | undefined> {
  const result = await getDynamoDocumentClient().send(
    new GetCommand({ TableName: awsConfig.dynamoTable, Key: key }),
  );
  return result.Item as T | undefined;
}

export async function updateItem(
  key: Key,
  attributes: Record<string, unknown>,
): Promise<void> {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  let i = 0;
  for (const [attr, value] of Object.entries(attributes)) {
    i += 1;
    names[`#a${i}`] = attr;
    values[`:v${i}`] = value;
    sets.push(`#a${i} = :v${i}`);
  }
  if (sets.length === 0) return;
  await getDynamoDocumentClient().send(
    new UpdateCommand({
      TableName: awsConfig.dynamoTable,
      Key: key,
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}

export async function deleteItem(key: Key): Promise<void> {
  await getDynamoDocumentClient().send(
    new DeleteCommand({ TableName: awsConfig.dynamoTable, Key: key }),
  );
}

/**
 * All items under one profile partition (PROFILE + ACTIVITY# + AWARD# rows),
 * following pagination to the end.
 */
export async function queryProfileItems<T = Record<string, unknown>>(
  profileId: string,
): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await getDynamoDocumentClient().send(
      new QueryCommand({
        TableName: awsConfig.dynamoTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `PROFILE#${profileId}` },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...((result.Items ?? []) as T[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

/**
 * Scan the whole table with a partition-key prefix filter, paginated. Used by
 * the server-side repository to list PROFILE rows. Fine at this dataset's
 * scale; switch to a GSI if the table grows past a few thousand items.
 */
export async function queryByPrefix<T = Record<string, unknown>>(
  pkPrefix: string,
  skPrefix?: string,
): Promise<T[]> {
  const { ScanCommand } = await import("@aws-sdk/lib-dynamodb");
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await getDynamoDocumentClient().send(
      new ScanCommand({
        TableName: awsConfig.dynamoTable,
        FilterExpression: skPrefix
          ? "begins_with(PK, :pk) AND begins_with(SK, :sk)"
          : "begins_with(PK, :pk)",
        ExpressionAttributeValues: skPrefix
          ? { ":pk": pkPrefix, ":sk": skPrefix }
          : { ":pk": pkPrefix },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...((result.Items ?? []) as T[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

const BATCH_WRITE_MAX = 25; // hard AWS limit per BatchWriteItem request

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BatchWriteRequest =
  { put: Record<string, unknown> } | { delete: Key };

/**
 * BatchWriteItem in chunks of 25, retrying UnprocessedItems with exponential
 * backoff. Returns the number of write requests successfully submitted.
 */
export async function batchWriteWithRetry(
  requests: BatchWriteRequest[],
): Promise<number> {
  const table = awsConfig.dynamoTable;
  const client = getDynamoDocumentClient();
  let written = 0;

  for (let start = 0; start < requests.length; start += BATCH_WRITE_MAX) {
    let pending = requests
      .slice(start, start + BATCH_WRITE_MAX)
      .map((request) =>
        "put" in request
          ? { PutRequest: { Item: request.put } }
          : { DeleteRequest: { Key: request.delete } },
      );

    for (let attempt = 0; pending.length > 0; attempt += 1) {
      if (attempt > 6) {
        throw new Error(
          `BatchWriteItem still had ${pending.length} unprocessed items after ${attempt} attempts`,
        );
      }
      if (attempt > 0) {
        await sleep(200 * 2 ** attempt);
      }
      const result = await client.send(
        new BatchWriteCommand({ RequestItems: { [table]: pending } }),
      );
      const unprocessed = result.UnprocessedItems?.[table] ?? [];
      written += pending.length - unprocessed.length;
      pending = unprocessed as typeof pending;
    }
  }
  return written;
}

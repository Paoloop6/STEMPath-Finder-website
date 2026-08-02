// AWS storage health check.
//
// Verifies that this machine can reach the project's DynamoDB table and S3
// bucket with the local AWS profile, using short-lived test records that are
// cleaned up before exit. Run with: npm run test:aws-storage
//
// Real data is never touched. In particular PK=PROFILE#test-001 / SK=PROFILE
// must never be modified or deleted by this script.

import {
  awsConfig,
  getDynamoDocumentClient,
  getS3Client,
  DescribeTableCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@workspace/aws";

const TEST_PK = "TEST#aws-storage";
const TEST_SK = "TEST";
const TEST_S3_KEY = "tests/aws-storage-check.json";

function step(message: string): void {
  console.log(`→ ${message}`);
}

async function main(): Promise<void> {
  const dynamo = getDynamoDocumentClient();
  const s3 = getS3Client();
  const table = awsConfig.dynamoTable;
  const bucket = awsConfig.s3Bucket;

  // --- DynamoDB -----------------------------------------------------------

  step(`DescribeTable ${table}`);
  const description = await dynamo.send(
    new DescribeTableCommand({ TableName: table }),
  );
  const status = description.Table?.TableStatus;
  console.log(
    `  table status: ${status}, items: ${description.Table?.ItemCount}`,
  );
  if (status !== "ACTIVE") {
    throw new Error(`Table ${table} is not ACTIVE (status: ${status})`);
  }

  step(`PutItem ${TEST_PK} / ${TEST_SK}`);
  const writtenAt = new Date().toISOString();
  await dynamo.send(
    new PutCommand({
      TableName: table,
      Item: {
        PK: TEST_PK,
        SK: TEST_SK,
        purpose: "storage health check",
        writtenAt,
      },
    }),
  );

  step("GetItem and verify");
  const readBack = await dynamo.send(
    new GetCommand({ TableName: table, Key: { PK: TEST_PK, SK: TEST_SK } }),
  );
  if (readBack.Item?.["writtenAt"] !== writtenAt) {
    throw new Error(
      `DynamoDB read-back mismatch: expected writtenAt=${writtenAt}, got ${JSON.stringify(readBack.Item)}`,
    );
  }
  console.log("  read-back verified");

  // --- S3 -----------------------------------------------------------------

  step(`PutObject s3://${bucket}/${TEST_S3_KEY}`);
  const payload = JSON.stringify({ check: "aws-storage", writtenAt });
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: TEST_S3_KEY,
      Body: payload,
      ContentType: "application/json",
    }),
  );

  step("GetObject and verify");
  const object = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: TEST_S3_KEY }),
  );
  const body = await object.Body?.transformToString();
  if (body !== payload) {
    throw new Error(`S3 read-back mismatch: expected ${payload}, got ${body}`);
  }
  console.log("  read-back verified");

  // --- Cleanup ------------------------------------------------------------

  step("Delete test S3 object");
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: TEST_S3_KEY }));

  step("Delete test DynamoDB item");
  await dynamo.send(
    new DeleteCommand({ TableName: table, Key: { PK: TEST_PK, SK: TEST_SK } }),
  );

  console.log(
    `\n✅ AWS storage health check passed: DynamoDB table "${table}" and ` +
      `S3 bucket "${bucket}" are reachable, writable, and readable.`,
  );
}

main().catch((error: unknown) => {
  console.error("\n❌ AWS storage health check failed:");
  console.error(error);
  process.exit(1);
});

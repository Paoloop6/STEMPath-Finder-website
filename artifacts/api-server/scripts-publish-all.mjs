// One-time bulk publish: marks every opportunity record as reviewed and
// published so the public site shows them. Skips records that are too
// malformed to display (no title or URL) and anything explicitly rejected.
// Run: node --env-file=../../.env scripts-publish-all.mjs

import {
  awsConfig,
  getDynamoDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@workspace/aws";

const client = getDynamoDocumentClient();

const items = [];
let lastKey;
do {
  const result = await client.send(
    new ScanCommand({
      TableName: awsConfig.dynamoTable,
      FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
      ExpressionAttributeValues: { ":pk": "OPPORTUNITY#", ":sk": "OPPORTUNITY" },
      ExclusiveStartKey: lastKey,
    }),
  );
  items.push(...(result.Items ?? []));
  lastKey = result.LastEvaluatedKey;
} while (lastKey);

let published = 0;
let skipped = 0;
for (const item of items) {
  const invalid = !item.title || !(item.official_url || item.source_url);
  const rejected = item.reviewStatus === "rejected";
  if (invalid || rejected) {
    skipped++;
    continue;
  }
  await client.send(
    new UpdateCommand({
      TableName: awsConfig.dynamoTable,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: "SET reviewStatus = :approved, published = :yes",
      ExpressionAttributeValues: { ":approved": "approved", ":yes": true },
    }),
  );
  published++;
}

console.log(`scanned=${items.length} published=${published} skipped=${skipped}`);

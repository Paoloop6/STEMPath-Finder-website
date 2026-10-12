// End-to-end smoke check of the built Express API against a loopback DynamoDB
// protocol fixture. No real accounts, student data, or AWS credentials are used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const opportunity = { ...JSON.parse(readFileSync(new URL('../../data/sample-opportunities.json', import.meta.url)))[0], published: true };
const story = { evidence: 'description', isStudentStory: true, studentName: 'Fictional Student', summary: 'Synthetic test story', graduationYear: null, hometown: null, committedSchool: null, acceptedSchools: [], intendedMajors: [], stats: { gpa: null, sat: null, act: null, apCount: null }, activities: [], awards: [] };
const video = { PK: 'VIDEO#fixture', SK: 'VIDEO', videoId: 'fixture', url: 'https://example.org/video', title: opportunity.title, description: 'Synthetic fixture only', channelTitle: 'Example channel', publishedAt: '2026-01-01', durationSeconds: 120, viewCount: 10, likeCount: 0, thumbnailUrl: 'https://example.org/thumbnail', activities: ['Coding / software projects'], source: 'ec_database', profileId: 'fixture', published: true, story };
const profile = { PK: 'PROFILE#fixture', SK: 'PROFILE', profileId: 'fixture', status: 'completed', anonymousLabel: 'Student 001', acceptedSchools: [], intendedMajors: [] };
const activity = { PK: 'PROFILE#fixture', SK: 'ACTIVITY#fixture', title: 'Fictional coding project', experienceType: 'project', stemField: 'computer science', reviewStatus: 'approved' };
function attribute(value) {
  if (value === null) return { NULL: true };
  if (typeof value === 'string') return { S: value };
  if (typeof value === 'number') return { N: String(value) };
  if (typeof value === 'boolean') return { BOOL: value };
  if (Array.isArray(value)) return { L: value.map(attribute) };
  return { M: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, attribute(v)])) };
}
let videoScans = 0;
const db = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const target = req.headers['x-amz-target']?.split('.').at(-1);
    const prefix = body.ExpressionAttributeValues?.[':pk']?.S;
    let items;
    if (target === 'Query' && prefix === 'PROFILE#fixture') items = [activity, { ...activity, SK: 'ACTIVITY#rejected', reviewStatus: 'rejected' }];
    else if (target === 'Scan' && prefix === 'VIDEO#') { videoScans++; items = [video, { ...video, PK: 'VIDEO#hidden', videoId: 'hidden', published: false }]; }
    else if (target === 'Scan' && prefix === 'PROFILE#') items = [profile];
    else if (target === 'Scan' && prefix === 'OPPORTUNITY#') items = [opportunity];
    else throw new Error(`Unexpected database operation ${target}`);
    res.writeHead(200, { 'content-type': 'application/x-amz-json-1.0' });
    res.end(JSON.stringify({ Items: items.map((item) => attribute(item).M) }));
  } catch (error) { res.writeHead(500).end(JSON.stringify({ message: error.message })); }
});
db.listen(0, '127.0.0.1'); await once(db, 'listening');
const portProbe = createServer(); portProbe.listen(0, '127.0.0.1'); await once(portProbe, 'listening');
const port = portProbe.address().port; await new Promise((resolve) => portProbe.close(resolve));
const child = spawn(process.execPath, ['artifacts/api-server/dist/index.mjs'], {
  cwd: root,
  env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(port), DATABASE_URL: 'postgresql://127.0.0.1:5432/nextstep', SESSION_SECRET: randomBytes(32).toString('hex'), AWS_REGION: 'us-east-1', DYNAMODB_TABLE: 'fixture', AWS_ENDPOINT_URL_DYNAMODB: `http://127.0.0.1:${db.address().port}`, AWS_ACCESS_KEY_ID: 'fixture', AWS_SECRET_ACCESS_KEY: 'fixture', AWS_EC2_METADATA_DISABLED: 'true', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; child.stdout.on('data', (data) => { logs += data; }); child.stderr.on('data', (data) => { logs += data; });
try {
  let healthy = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`);
      assert.equal(response.status, 200); assert.deepEqual(await response.json(), { status: 'ok' });
      healthy = true; break;
    } catch { if (child.exitCode !== null) throw new Error(logs); await delay(100); }
  }
  assert.ok(healthy, 'API did not become healthy');
  const response = await fetch(`http://127.0.0.1:${port}/api/student-videos`);
  assert.equal(response.status, 200, logs);
  const data = await response.json();
  assert.equal(data.count, 1); // unpublished fixture must not be returned
  assert.equal(data.videos[0].videoId, 'fixture');
  assert.equal(data.videos[0].story.studentName, null); // EC Database names are withheld
  assert.equal(data.videos[0].pathway.activities.length, 1); // rejected activity omitted
  assert.equal(data.videos[0].relatedOpportunities.length, 1);
  assert.deepEqual(data.videos[0].activities, ['Coding / software']);
  await fetch(`http://127.0.0.1:${port}/api/student-videos`);
  assert.equal(videoScans, 1, 'normal request should use cached response');
  await fetch(`http://127.0.0.1:${port}/api/student-videos?refresh=true`);
  assert.equal(videoScans, 2, 'refresh should reread videos');
  console.log('PASS: health, Student Stories HTTP response, publication filter, profile-name redaction, activity filter, opportunity links, cache and refresh.');
} finally {
  child.kill('SIGTERM'); await once(child, 'exit');
  db.closeAllConnections(); await new Promise((resolve) => db.close(resolve));
}

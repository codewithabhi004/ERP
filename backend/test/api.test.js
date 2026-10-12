const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const jwt = require('jsonwebtoken');
const { app, prisma } = require('../index');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

test('student, fee and staff records require authentication', async () => {
  for (const path of ['/api/students', '/api/fees', '/api/classes', '/api/users', '/api/attendance']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 401, `${path} must not disclose school records`);
    assert.equal((await response.json()).message, 'Sign in to access this resource.');
  }
});

test('malformed login data is rejected before database access', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '', password: '', role: 'superuser' })
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, 'Please check the submitted information.');
});

test('a valid student session cannot create students, issue invoices or read staff accounts', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalLookup = prisma.user.findUnique;
  const secret = 'test-only-secret-with-more-than-thirty-two-characters';
  process.env.JWT_SECRET = secret;
  prisma.user.findUnique = async ({ where }) => ({
    id: where.id,
    username: 'student1',
    name: 'Student Test',
    role: 'student',
    active: true
  });

  try {
    const token = jwt.sign({ role: 'student' }, secret, { subject: '41', expiresIn: '1m' });
    for (const [path, method] of [
      ['/api/students', 'POST'],
      ['/api/fees', 'POST'],
      ['/api/fees/1/payments', 'POST'],
      ['/api/users', 'GET']
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: method === 'POST' ? JSON.stringify({}) : undefined
      });
      assert.equal(response.status, 403, `${method} ${path} must enforce student permissions`);
    }
  } finally {
    prisma.user.findUnique = originalLookup;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});

test('public demo mode blocks writes for every authenticated role', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalReadOnly = process.env.PUBLIC_DEMO_READ_ONLY;
  const originalLookup = prisma.user.findUnique;
  const secret = 'test-only-secret-with-more-than-thirty-two-characters';
  process.env.JWT_SECRET = secret;
  process.env.PUBLIC_DEMO_READ_ONLY = 'true';
  prisma.user.findUnique = async ({ where }) => ({
    id: where.id,
    username: 'admin1',
    name: 'Demo Administrator',
    role: 'admin',
    active: true
  });

  try {
    const token = jwt.sign({ role: 'admin' }, secret, { subject: '42', expiresIn: '1m' });
    const response = await fetch(`${baseUrl}/api/students`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: 'Public demo accounts are read-only.' });
  } finally {
    prisma.user.findUnique = originalLookup;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalReadOnly === undefined) delete process.env.PUBLIC_DEMO_READ_ONLY;
    else process.env.PUBLIC_DEMO_READ_ONLY = originalReadOnly;
  }
});

test('unknown API routes return a JSON not-found response', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-school-module`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'API endpoint not found.' });
});

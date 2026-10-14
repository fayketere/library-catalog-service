const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const app = require('../app');
const Book = require('../models/Book');
const Genre = require('../models/Genre');
const User = require('../models/User');

async function startServer(t) {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function makeUser(role = 'patron') {
  return {
    _id: { toString: () => '64b000000000000000000003' },
    username: 'reader',
    email: 'reader@library.test',
    role,
    comparePassword: async (password) => password === 'ReaderPass123!',
  };
}

async function login(baseUrl, username, password) {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

test('registers patrons, derives the profile from the session, and revokes the session on logout', async (t) => {
  const baseUrl = await startServer(t);
  const user = makeUser();
  let createdUser;
  t.mock.method(User, 'create', async (data) => {
    createdUser = data;
    return user;
  });

  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'reader',
      email: 'reader@library.test',
      password: 'ReaderPass123!',
      role: 'librarian',
    }),
  });
  assert.equal(registration.status, 201);
  assert.equal(createdUser.role, 'patron');
  const registeredUser = (await registration.json()).user;
  assert.equal(registeredUser.role, 'patron');
  assert.equal(Object.hasOwn(registeredUser, 'password'), false);

  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
  t.mock.method(User, 'findById', async () => user);
  const loginResponse = await login(baseUrl, 'reader', 'ReaderPass123!');
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(Object.hasOwn(await loginResponse.json(), 'token'), false);
  const sessionCookie = cookie.split(';', 1)[0];

  const profileResponse = await fetch(`${baseUrl}/api/users/profile?id=somebody-else`, {
    headers: { cookie: sessionCookie },
  });
  assert.deepEqual(await profileResponse.json(), {
    id: '64b000000000000000000003',
    username: 'reader',
    email: 'reader@library.test',
    role: 'patron',
  });

  const bookPayload = {
    title: 'Restricted',
    author: 'Author',
    isbn: '9780441172719',
    description: 'A book',
    coverImage: 'https://example.test/book.jpg',
    totalCopies: 1,
    availableCopies: 1,
    genre: '64b000000000000000000001',
  };
  assert.equal((await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bookPayload),
  })).status, 401);
  for (const [method, path] of [
    ['POST', '/books'],
    ['PUT', '/books/64b000000000000000000002'],
    ['DELETE', '/books/64b000000000000000000002'],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        cookie: sessionCookie,
        ...(method !== 'DELETE' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method !== 'DELETE' ? { body: JSON.stringify(bookPayload) } : {}),
    });
    assert.equal(response.status, 403);
  }

  assert.equal((await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: sessionCookie },
  })).status, 204);
  assert.equal((await fetch(`${baseUrl}/api/users/profile`, {
    headers: { cookie: sessionCookie },
  })).status, 401);
});

test('allows librarian book mutations and rejects bad login credentials', async (t) => {
  const baseUrl = await startServer(t);
  const librarian = { ...makeUser('librarian'), username: 'librarian', email: 'librarian@library.test' };
  t.mock.method(User, 'findOne', () => ({ select: async () => librarian }));
  t.mock.method(User, 'findById', async () => librarian);
  t.mock.method(Genre, 'exists', async () => ({ _id: '64b000000000000000000001' }));
  t.mock.method(Book, 'create', async (payload) => ({ _id: '64b000000000000000000002', ...payload }));
  t.mock.method(Book, 'findByIdAndUpdate', async (_id, payload) => ({ _id, ...payload }));
  t.mock.method(Book, 'findByIdAndDelete', async () => ({ _id: '64b000000000000000000002' }));

  const invalidLogin = await login(baseUrl, 'librarian', 'wrong-password');
  assert.equal(invalidLogin.status, 401);
  const loginResponse = await login(baseUrl, 'librarian', 'ReaderPass123!');
  assert.equal(loginResponse.status, 200);
  const sessionCookie = loginResponse.headers.get('set-cookie').split(';', 1)[0];
  const payload = {
    title: 'Allowed',
    author: 'Librarian',
    isbn: '9780441172719',
    description: 'A book',
    coverImage: 'https://example.test/book.jpg',
    totalCopies: 1,
    availableCopies: 1,
    genre: '64b000000000000000000001',
  };
  for (const [method, path] of [
    ['POST', '/books'],
    ['PUT', '/books/64b000000000000000000002'],
    ['DELETE', '/books/64b000000000000000000002'],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        cookie: sessionCookie,
        ...(method !== 'DELETE' ? { 'content-type': 'application/json' } : {}),
      },
      ...(method !== 'DELETE' ? { body: JSON.stringify(payload) } : {}),
    });
    assert.equal(response.status, method === 'DELETE' ? 204 : method === 'POST' ? 201 : 200);
  }
});

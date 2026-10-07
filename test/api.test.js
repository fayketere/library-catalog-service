const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');

const app = require('../app');
const Book = require('../models/Book');
const Genre = require('../models/Genre');

const genreId = '64b000000000000000000001';
const bookId = '64b000000000000000000002';
const genre = { _id: genreId, name: 'Science Fiction', slug: 'science-fiction' };
const book = {
  _id: bookId,
  title: 'Dune',
  author: 'Frank Herbert',
  isbn: '9780441172719',
  description: 'A desert planet.',
  coverImage: 'https://example.test/dune.jpg',
  totalCopies: 8,
  availableCopies: 5,
  genre,
};

function query(value) {
  return {
    populate() { return this; },
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

test('genre and book routes validate inputs and support CRUD and combined filtering', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let genreHasBooks = false;

  t.mock.method(Genre, 'find', () => query([genre]));
  t.mock.method(Genre, 'findById', () => Promise.resolve({
    ...genre,
    deleteOne: async () => {},
  }));
  t.mock.method(Genre, 'create', async (payload) => ({ _id: genreId, ...payload }));
  t.mock.method(Genre, 'findByIdAndUpdate', async (_id, payload) => ({ _id: genreId, ...payload }));
  t.mock.method(Genre, 'exists', async () => ({ _id: genreId }));
  t.mock.method(Book, 'exists', async () => genreHasBooks ? { _id: bookId } : null);
  t.mock.method(Book, 'find', (filter) => {
    assert.equal(filter.genre, genreId);
    assert.equal(filter.$or[0].title.flags, 'i');
    assert.equal(filter.$or[0].title.source, 'dune');
    const bookListQuery = query([book]);
    bookListQuery.skip = (offset) => {
      assert.equal(offset, 5);
      return bookListQuery;
    };
    bookListQuery.limit = (limit) => {
      assert.equal(limit, 5);
      return bookListQuery;
    };
    return bookListQuery;
  });
  t.mock.method(Book, 'countDocuments', async () => 12);
  t.mock.method(Book, 'findById', () => query(book));
  t.mock.method(Book, 'create', async (payload) => ({ _id: bookId, ...payload }));
  t.mock.method(Book, 'findByIdAndUpdate', async (_id, payload) => ({ _id: bookId, ...payload }));
  t.mock.method(Book, 'findByIdAndDelete', async () => book);

  const invalidBook = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(invalidBook.status, 400);
  const invalidBody = await invalidBook.json();
  assert.deepEqual(
    invalidBody.errors.map((error) => error.field),
    ['title', 'author', 'isbn', 'description', 'coverImage', 'totalCopies', 'availableCopies', 'genre'],
  );
  assert.equal(Object.hasOwn(invalidBody, 'stack'), false);

  assert.equal((await fetch(`${baseUrl}/genres`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`)).status, 200);
  const createdGenre = await fetch(`${baseUrl}/genres`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: genre.name, slug: genre.slug }),
  });
  assert.equal(createdGenre.status, 201);
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Sci-Fi', slug: 'sci-fi' }),
  })).status, 200);

  const bookPayload = {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    description: book.description,
    coverImage: book.coverImage,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    genre: genreId,
  };
  const filteredBooks = await fetch(`${baseUrl}/books?genre=${genreId}&search=dune&page=2&limit=5`);
  assert.equal(filteredBooks.status, 200);
  assert.deepEqual((await filteredBooks.json()).pagination, {
    page: 2,
    limit: 5,
    total: 12,
    totalPages: 3,
  });
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bookPayload),
  })).status, 201);
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bookPayload),
  })).status, 200);
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`, { method: 'DELETE' })).status, 204);

  genreHasBooks = true;
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`, { method: 'DELETE' })).status, 409);
  genreHasBooks = false;
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`, { method: 'DELETE' })).status, 204);
});

test('invalid genre references and malformed JSON return field-specific JSON errors', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.mock.method(Genre, 'exists', async () => null);

  const invalidGenre = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Dune',
      author: 'Frank Herbert',
      isbn: '9780441172719',
      description: 'A desert planet.',
      coverImage: 'https://example.test/dune.jpg',
      totalCopies: 8,
      availableCopies: 5,
      genre: genreId,
    }),
  });
  assert.equal(invalidGenre.status, 400);
  assert.deepEqual((await invalidGenre.json()).errors, [
    { field: 'genre', message: 'genre id does not exist' },
  ]);

  const malformed = await fetch(`${baseUrl}/books`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, 'Invalid JSON request body');
});

test('missing resources return 404 and invalid query and field types return 400', async (t) => {
  const server = app.listen(0);
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.mock.method(Genre, 'findById', async () => null);
  t.mock.method(Genre, 'findByIdAndUpdate', async () => null);
  t.mock.method(Genre, 'exists', async () => ({ _id: genreId }));
  t.mock.method(Book, 'findById', () => query(null));
  t.mock.method(Book, 'findByIdAndUpdate', async () => null);
  t.mock.method(Book, 'findByIdAndDelete', async () => null);

  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Missing', slug: 'missing' }),
  })).status, 404);
  assert.equal((await fetch(`${baseUrl}/genres/${genreId}`, { method: 'DELETE' })).status, 404);
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      coverImage: book.coverImage,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      genre: genreId,
    }),
  })).status, 404);
  assert.equal((await fetch(`${baseUrl}/books/${bookId}`, { method: 'DELETE' })).status, 404);

  const invalidPagination = await fetch(`${baseUrl}/books?page=0`);
  assert.equal(invalidPagination.status, 400);
  assert.deepEqual((await invalidPagination.json()).errors, [
    { field: 'page', message: 'page must be a positive integer' },
  ]);

  const invalidGenreType = await fetch(`${baseUrl}/genres`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 42, slug: 'fiction' }),
  });
  assert.equal(invalidGenreType.status, 400);
  assert.deepEqual((await invalidGenreType.json()).errors, [
    { field: 'name', message: 'name must be a string' },
  ]);
});

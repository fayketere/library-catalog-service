# Library Catalog Service

A JSON REST API backed by the existing Mongoose `Book` and `Genre` models.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`, set `MONGODB_URI` to your MongoDB connection string, and replace `JWT_SECRET` with a random value of at least 32 characters. `PORT` is optional and defaults to `3000`.
3. Start the API with `npm start` (or `npm run dev` for Node's watch mode).
4. Optionally load the sample catalog with `npm run seed`.

Routes are available at `/genres` and `/books`. The same routes are also mounted under `/api/v1` for clients using a versioned prefix. Authentication and profile endpoints are available under `/api/auth` and `/api/users` (also `/api/v1/auth` and `/api/v1/users`).

## Authentication and authorization

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a patron account |
| `POST` | `/api/auth/login` | Verify username/email and set the session cookie |
| `POST` | `/api/auth/logout` | Revoke the session and clear the cookie |
| `GET` | `/api/users/profile` | Return the authenticated caller's own profile |

Registration requires a username, email, and password of 8–128 characters. New accounts always receive the `patron` role; a client cannot set its own role. Passwords are stored in MongoDB only as salted scrypt hashes. The seed creates exactly one test librarian: username `librarian`, email `librarian@library.test`, password `LibraryAdmin123!`. Run `npm run seed` to create or refresh it. This known test credential is for local grading only and must be replaced before deployment.

`POST`, `PUT`, and `DELETE` book routes require a valid librarian session. Anonymous requests receive `401`; authenticated patrons receive `403`. The profile endpoint derives the identity from the verified session and ignores user IDs supplied by clients.

### Token Storage

The API keeps the signed session token in an `HttpOnly` cookie called `library_session`, rather than returning it in JSON or storing it in browser-accessible localStorage. This is a deliberate trade-off: `HttpOnly` makes it harder for injected JavaScript to steal a token during an XSS attack, whereas a localStorage token is directly readable by scripts. Cookies are attached automatically to requests, however, so they introduce a CSRF risk that a client holding a bearer token must handle differently. This API mitigates cross-site requests with `SameSite=Strict`, and adds `Secure` in production so the cookie is sent only over HTTPS. A same-site frontend is assumed; a cross-site frontend would need explicit origin validation, CSRF token protection, and credentialed CORS configuration.

The cookie lasts eight hours. In addition to expiring the cookie in the browser on logout, the server revokes its session ID immediately, so replaying a copied cookie after logout fails. Active sessions are held in process memory; therefore, a service restart invalidates all sessions, and a multi-instance deployment would need a shared session store. The API signs tokens with `JWT_SECRET`; production startup refuses to run without a unique secret of at least 32 characters.

## Genre endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/genres` | List genres |
| `GET` | `/genres/:id` | Get a genre (`404` if missing) |
| `POST` | `/genres` | Create a genre (`201`) |
| `PUT` | `/genres/:id` | Replace a genre (`200`, `404` if missing) |
| `DELETE` | `/genres/:id` | Delete a genre (`204`, `404` if missing, `409` if books still reference it) |

Create and update payloads require non-empty string fields:

```json
{
  "name": "Science Fiction",
  "slug": "science-fiction"
}
```

A genre cannot be deleted while one or more books reference it. Delete or reassign those books first; this protects referential integrity.

## Book endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| `GET` | `/books` | List, filter, search, and paginate books |
| `GET` | `/books/:id` | Get a book (`404` if missing) |
| `POST` | `/books` | Create a book (`201`) |
| `PUT` | `/books/:id` | Replace a book (`200`, `404` if missing) |
| `DELETE` | `/books/:id` | Delete a book (`204`, `404` if missing) |

Book creation, updates, and deletion require an authenticated librarian.

Book create and update payloads require all model fields:

```json
{
  "title": "Dune",
  "author": "Frank Herbert",
  "isbn": "9780441172719",
  "description": "A young heir becomes entangled in the politics and ecology of a desert planet.",
  "coverImage": "https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg",
  "totalCopies": 8,
  "availableCopies": 5,
  "genre": "<existing-genre-object-id>"
}
```

The genre must be an existing Genre ObjectId. Copy counts must be non-negative integers, and `availableCopies` cannot exceed `totalCopies`.

`GET /books` accepts the following optional query parameters:

| Parameter | Description | Default |
| --- | --- | --- |
| `genre` | Filter by a valid Genre ObjectId | — |
| `search` | Case-insensitive substring match against title or author | — |
| `page` | Positive, one-based page number | `1` |
| `limit` | Positive page size, at most `100` | `10` |

The filters are combinable and are applied before pagination:

```text
GET /books?genre=<genre-id>&search=dune&page=2&limit=5
```

List responses have a `data` array and pagination metadata:

```json
{
  "data": [],
  "pagination": {
    "page": 2,
    "limit": 5,
    "total": 7,
    "totalPages": 2
  }
}
```

## Errors

Errors are JSON and do not expose stack traces or raw Mongoose errors. Validation errors return `400` with a field-specific `errors` array, missing resources return `404`, and deleting a referenced genre returns `409`. Malformed JSON returns `400`.

## Postman

Import [`postman/library-catalog.postman_collection.json`](./postman/library-catalog.postman_collection.json). The collection has requests for every genre and book endpoint, a combined-filter request, and a saved `400` validation-error example. The default `baseUrl` is `http://localhost:3000`.

## Tests

Run the API tests with `npm test`.

## Existing data model and seed catalog

Book-specific values (`title`, `author`, `isbn`, `description`, `coverImage`, `totalCopies`, and `availableCopies`) are stored directly on `Book`. A book references a shared Genre by ObjectId. `Genre` keeps the required, unique `name` and lowercase `slug`. There are no embedded subdocuments.

The repeatable seed script replaces the existing `books` and `genres` data with four genres and sixteen sample books. It deletes books before genres, then inserts the replacement data and disconnects from MongoDB. Back up any data that must be retained before running `npm run seed`.

The sample data maintains unique ISBN values and genre ObjectId references; `availableCopies` does not exceed `totalCopies`.

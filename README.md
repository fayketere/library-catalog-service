# Library Catalog Service

A JSON REST API backed by the existing Mongoose `Book` and `Genre` models.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string. `PORT` is optional and defaults to `3000`.
3. Start the API with `npm start` (or `npm run dev` for Node's watch mode).
4. Optionally load the sample catalog with `npm run seed`.

Routes are available at `/genres` and `/books`. The same routes are also mounted under `/api/v1` for clients using a versioned prefix.

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

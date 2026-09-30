# Library Catalog Service

Mongoose models and a repeatable seed script for a small library catalog.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string.
3. Run `npm run seed` to replace the current `books` and `genres` data with the sample catalog.

The seed operation deletes existing book documents before genre documents, then creates four genres and sixteen books. Running it again produces the same catalog rather than appending duplicates. Keep a backup if the target collections contain data you need; seeding replaces it.

## Schema Design

| Model field | Storage | Reason |
| --- | --- | --- |
| `Book.title` | Direct scalar field on `Book` | The title belongs to this catalog entry and is commonly read with the book. |
| `Book.author` | Direct scalar field on `Book` | The displayed author belongs to the book entry and does not need an independently managed author document. |
| `Book.isbn` | Direct scalar field on `Book` | It identifies an edition and is required and unique so duplicate catalog entries for the same ISBN are rejected. |
| `Book.description` | Direct scalar field on `Book` | Description text is specific to this catalog entry and is read with its title and cover. |
| `Book.coverImage` | Direct scalar field on `Book` | The image URL is presentation data for this particular book entry. |
| `Book.totalCopies` | Direct scalar field on `Book` | This inventory count belongs to the book entry and is stored as a non-negative number. |
| `Book.availableCopies` | Direct scalar field on `Book` | Availability is queried with the book and must stay between zero and `totalCopies`. |
| `Book.genre` | ObjectId reference to `Genre` (`ref: 'Genre'`) | Genres are shared by many books; storing one reference avoids duplicating genre names and allows population of current genre details. |
| `Genre.name` | Direct scalar field on `Genre` | This is the user-facing label, kept once on the shared genre document; it is required and unique. |
| `Genre.slug` | Direct scalar field on `Genre` | A required, unique, lowercase identifier provides a stable URL- and query-friendly value separate from the display label. |

There are no embedded subdocuments in this schema. Book-specific values stay on `Book`; shared genre data is normalized into `Genre` and linked through the ObjectId reference.

## Seeding

The seed script connects using `MONGODB_URI`, clears existing books and genres, inserts four genres and sixteen books with ObjectId references, and disconnects from MongoDB. It is safe to rerun because it replaces the sample catalog instead of appending duplicates.

## Data Requirements

- 4 genres
- 16 books
- Unique ISBN values
- Genre references using ObjectId
- `availableCopies` never exceeds `totalCopies`

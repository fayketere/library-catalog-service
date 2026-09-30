require('dotenv').config();

const mongoose = require('mongoose');
const Book = require('./models/Book');
const Genre = require('./models/Genre');

const genreData = [
  { name: 'Fantasy', slug: 'fantasy' },
  { name: 'Science Fiction', slug: 'science-fiction' },
  { name: 'Mystery', slug: 'mystery' },
  { name: 'Historical Fiction', slug: 'historical-fiction' },
];

const bookData = [
  { title: 'The Name of the Wind', author: 'Patrick Rothfuss', isbn: '9780756404741', description: 'A gifted young man recounts his path toward becoming a legendary figure.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg', totalCopies: 5, availableCopies: 3, genre: 'fantasy' },
  { title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', isbn: '9780547773742', description: 'A young wizard learns the cost of power across an archipelago.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780547773742-L.jpg', totalCopies: 4, availableCopies: 2, genre: 'fantasy' },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', isbn: '9780547928227', description: 'A home-loving hobbit is swept into a quest to reclaim a lost treasure.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg', totalCopies: 6, availableCopies: 4, genre: 'fantasy' },
  { title: 'The Fifth Season', author: 'N. K. Jemisin', isbn: '9780316229296', description: 'In a world of catastrophic seasons, a woman searches for her missing daughter.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780316229296-L.jpg', totalCopies: 3, availableCopies: 1, genre: 'fantasy' },
  { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', description: 'A young heir becomes entangled in the politics and ecology of a desert planet.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780441172719-L.jpg', totalCopies: 8, availableCopies: 5, genre: 'science-fiction' },
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', isbn: '9780441478125', description: 'An envoy navigates diplomacy on a world whose people can change sex.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780441478125-L.jpg', totalCopies: 3, availableCopies: 3, genre: 'science-fiction' },
  { title: 'Kindred', author: 'Octavia E. Butler', isbn: '9780807083697', description: 'A modern Black woman is repeatedly transported to an antebellum plantation.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780807083697-L.jpg', totalCopies: 4, availableCopies: 2, genre: 'science-fiction' },
  { title: 'The Martian', author: 'Andy Weir', isbn: '9780553418026', description: 'An astronaut stranded on Mars uses science and ingenuity to survive.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg', totalCopies: 5, availableCopies: 0, genre: 'science-fiction' },
  { title: 'The Murder of Roger Ackroyd', author: 'Agatha Christie', isbn: '9780062073563', description: 'A village doctor helps Hercule Poirot investigate a celebrated murder.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780062073563-L.jpg', totalCopies: 4, availableCopies: 3, genre: 'mystery' },
  { title: 'The Big Sleep', author: 'Raymond Chandler', isbn: '9780394758282', description: 'Private detective Philip Marlowe takes on a case involving the Sternwood family.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780394758282-L.jpg', totalCopies: 3, availableCopies: 1, genre: 'mystery' },
  { title: 'The Thursday Murder Club', author: 'Richard Osman', isbn: '9781984880963', description: 'Four retirement-community residents turn their sleuthing hobby toward a real crime.', coverImage: 'https://covers.openlibrary.org/b/isbn/9781984880963-L.jpg', totalCopies: 7, availableCopies: 6, genre: 'mystery' },
  { title: 'In the Woods', author: 'Tana French', isbn: '9780670038602', description: 'A detective investigates a child’s murder in a town tied to his own past.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780670038602-L.jpg', totalCopies: 4, availableCopies: 2, genre: 'mystery' },
  { title: 'The Book Thief', author: 'Markus Zusak', isbn: '9780375842207', description: 'A girl finds refuge in books and friendship in wartime Germany.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg', totalCopies: 6, availableCopies: 4, genre: 'historical-fiction' },
  { title: 'Homegoing', author: 'Yaa Gyasi', isbn: '9781101971062', description: 'Two half-sisters’ family lines unfold across centuries and continents.', coverImage: 'https://covers.openlibrary.org/b/isbn/9781101971062-L.jpg', totalCopies: 4, availableCopies: 2, genre: 'historical-fiction' },
  { title: 'All the Light We Cannot See', author: 'Anthony Doerr', isbn: '9781501173219', description: 'A blind French girl and a German boy follow intersecting paths during World War II.', coverImage: 'https://covers.openlibrary.org/b/isbn/9781501173219-L.jpg', totalCopies: 5, availableCopies: 3, genre: 'historical-fiction' },
  { title: 'The Vanishing Half', author: 'Brit Bennett', isbn: '9780525536291', description: 'Twin sisters build separate lives whose histories remain intertwined.', coverImage: 'https://covers.openlibrary.org/b/isbn/9780525536291-L.jpg', totalCopies: 3, availableCopies: 2, genre: 'historical-fiction' },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in the environment or .env file');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Book.deleteMany({});
    await Genre.deleteMany({});

    const genres = await Genre.insertMany(genreData);
    const genreIds = Object.fromEntries(genres.map((genre) => [genre.slug, genre._id]));
    const books = bookData.map(({ genre, ...book }) => ({
      ...book,
      genre: genreIds[genre],
    }));

    await Book.insertMany(books);
    console.log(`Seeded ${genres.length} genres and ${books.length} books.`);
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});

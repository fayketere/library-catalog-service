const express = require('express');
const books = require('./routes/books');
const genres = require('./routes/genres');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Library Catalog API' });
});

app.use('/genres', genres);
app.use('/books', books);
app.use('/api/v1/genres', genres);
app.use('/api/v1/books', books);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

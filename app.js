require('dotenv').config();

const express = require('express');
const books = require('./routes/books');
const genres = require('./routes/genres');
const auth = require('./routes/auth');
const users = require('./routes/users');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.get('/', (_req, res) => {
  res.status(200).json({ message: 'Library Catalog API' });
});

app.use('/genres', genres);
app.use('/books', books);
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/v1/genres', genres);
app.use('/api/v1/books', books);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

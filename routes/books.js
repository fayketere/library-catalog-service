const express = require('express');
const Book = require('../models/Book');
const Genre = require('../models/Genre');
const {
  parseBookQuery,
  validateBookPayload,
  validatePayload,
} = require('../middleware/validate');

const router = express.Router();

router.get('/', async (req, res) => {
  const { genre, search, page, limit } = parseBookQuery(req.query);
  const filter = {};

  if (genre) {
    filter.genre = genre;
  }
  if (search) {
    const expression = new RegExp(escapeRegExp(search), 'i');
    filter.$or = [{ title: expression }, { author: expression }];
  }

  const [books, total] = await Promise.all([
    Book.find(filter)
      .populate('genre')
      .sort({ title: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Book.countDocuments(filter),
  ]);

  res.status(200).json({
    data: books,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

router.get('/:id', async (req, res) => {
  const book = await Book.findById(req.params.id).populate('genre');
  if (!book) {
    res.status(404).json({ message: 'Book not found' });
    return;
  }

  res.status(200).json(book);
});

router.post('/', validatePayload(validateBookPayload), async (req, res) => {
  if (!await Genre.exists({ _id: req.body.genre })) {
    res.status(400).json({
      message: 'Validation failed',
      errors: [{ field: 'genre', message: 'genre id does not exist' }],
    });
    return;
  }

  const book = await Book.create(req.body);
  res.status(201).json(book);
});

router.put('/:id', validatePayload(validateBookPayload), async (req, res) => {
  if (!await Genre.exists({ _id: req.body.genre })) {
    res.status(400).json({
      message: 'Validation failed',
      errors: [{ field: 'genre', message: 'genre id does not exist' }],
    });
    return;
  }

  const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!book) {
    res.status(404).json({ message: 'Book not found' });
    return;
  }

  res.status(200).json(book);
});

router.delete('/:id', async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) {
    res.status(404).json({ message: 'Book not found' });
    return;
  }

  res.status(204).end();
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;

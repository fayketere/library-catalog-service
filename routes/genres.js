const express = require('express');
const Book = require('../models/Book');
const Genre = require('../models/Genre');
const {
  validateGenrePayload,
  validatePayload,
} = require('../middleware/validate');

const router = express.Router();

router.get('/', async (_req, res) => {
  const genres = await Genre.find().sort({ name: 1 });
  res.status(200).json(genres);
});

router.get('/:id', async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  if (!genre) {
    res.status(404).json({ message: 'Genre not found' });
    return;
  }

  res.status(200).json(genre);
});

router.post('/', validatePayload(validateGenrePayload), async (req, res) => {
  const genre = await Genre.create(req.body);
  res.status(201).json(genre);
});

router.put('/:id', validatePayload(validateGenrePayload), async (req, res) => {
  const genre = await Genre.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!genre) {
    res.status(404).json({ message: 'Genre not found' });
    return;
  }

  res.status(200).json(genre);
});

router.delete('/:id', async (req, res) => {
  const genre = await Genre.findById(req.params.id);
  if (!genre) {
    res.status(404).json({ message: 'Genre not found' });
    return;
  }

  if (await Book.exists({ genre: genre._id })) {
    res.status(409).json({ message: 'Genre cannot be deleted while books reference it' });
    return;
  }

  await genre.deleteOne();
  res.status(204).end();
});

module.exports = router;

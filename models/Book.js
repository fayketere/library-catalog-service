const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  isbn: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  coverImage: {
    type: String,
    required: true,
  },
  totalCopies: {
    type: Number,
    required: true,
    min: 0,
  },
  availableCopies: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator(value) {
        return value <= this.totalCopies;
      },
      message: 'availableCopies cannot exceed totalCopies',
    },
  },
  genre: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre',
    required: true,
  },
});

module.exports = mongoose.model('Book', bookSchema);

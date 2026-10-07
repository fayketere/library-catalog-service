const mongoose = require('mongoose');

const BOOK_STRING_FIELDS = ['title', 'author', 'isbn', 'description', 'coverImage'];
const GENRE_FIELDS = ['name', 'slug'];

function createValidationError(errors) {
  const error = new Error('Validation failed');
  error.statusCode = 400;
  error.errors = errors;
  return error;
}

function validateStrings(payload, fields) {
  const errors = [];

  for (const field of fields) {
    if (typeof payload[field] !== 'string') {
      errors.push({
        field,
        message: payload[field] === undefined ? `${field} is required` : `${field} must be a string`,
      });
    } else if (!payload[field].trim()) {
      errors.push({ field, message: `${field} is required` });
    } else {
      payload[field] = payload[field].trim();
    }
  }

  return errors;
}

function validateGenrePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
  }

  const payload = { name: body.name, slug: body.slug };
  return { payload, errors: validateStrings(payload, GENRE_FIELDS) };
}

function validateBookPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: [{ field: 'body', message: 'Request body must be a JSON object' }] };
  }

  const payload = {
    title: body.title,
    author: body.author,
    isbn: body.isbn,
    description: body.description,
    coverImage: body.coverImage,
    totalCopies: body.totalCopies,
    availableCopies: body.availableCopies,
    genre: body.genre,
  };
  const errors = validateStrings(payload, BOOK_STRING_FIELDS);

  for (const field of ['totalCopies', 'availableCopies']) {
    const value = payload[field];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      errors.push({
        field,
        message: value === undefined
          ? `${field} is required`
          : `${field} must be a non-negative integer`,
      });
    }
  }

  if (typeof payload.genre !== 'string') {
    errors.push({
      field: 'genre',
      message: payload.genre === undefined ? 'genre is required' : 'genre must be a string',
    });
  } else if (!mongoose.isObjectIdOrHexString(payload.genre)) {
    errors.push({ field: 'genre', message: 'genre must be a valid genre id' });
  } else {
    payload.genre = payload.genre.trim();
  }

  if (
    Number.isInteger(payload.totalCopies)
    && Number.isInteger(payload.availableCopies)
    && payload.availableCopies > payload.totalCopies
  ) {
    errors.push({
      field: 'availableCopies',
      message: 'availableCopies cannot exceed totalCopies',
    });
  }

  return { payload, errors };
}

function validatePayload(validator) {
  return (req, _res, next) => {
    const { payload, errors } = validator(req.body);
    if (errors.length > 0) {
      next(createValidationError(errors));
      return;
    }

    req.body = payload;
    next();
  };
}

function parseBookQuery(query) {
  const errors = [];
  const page = parsePositiveInteger(query.page, 'page', 1, errors);
  const limit = parsePositiveInteger(query.limit, 'limit', 10, errors);
  let genre;
  let search;

  if (query.genre !== undefined) {
    if (typeof query.genre !== 'string' || !mongoose.isObjectIdOrHexString(query.genre)) {
      errors.push({ field: 'genre', message: 'genre must be a valid genre id' });
    } else {
      genre = query.genre;
    }
  }

  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      errors.push({ field: 'search', message: 'search must be a string' });
    } else {
      search = query.search.trim();
    }
  }

  if (errors.length > 0) {
    throw createValidationError(errors);
  }

  return { genre, search, page, limit };
}

function parsePositiveInteger(value, field, fallback, errors) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    errors.push({ field, message: `${field} must be a positive integer` });
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (field === 'limit' && parsed > 100)) {
    errors.push({
      field,
      message: field === 'limit'
        ? 'limit must be a positive integer no greater than 100'
        : 'page must be a positive integer',
    });
    return fallback;
  }

  return parsed;
}

module.exports = {
  createValidationError,
  parseBookQuery,
  validateBookPayload,
  validateGenrePayload,
  validatePayload,
};

function notFound(_req, res) {
  res.status(404).json({ message: 'Not found' });
}

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error && error.type === 'entity.parse.failed') {
    res.status(400).json({
      message: 'Invalid JSON request body',
      errors: [{ field: 'body', message: 'Request body must be valid JSON' }],
    });
    return;
  }

  if (error && error.type === 'entity.too.large') {
    res.status(413).json({
      message: 'Request body is too large',
      errors: [{ field: 'body', message: 'Request body exceeds the allowed size' }],
    });
    return;
  }

  if (error && error.statusCode === 400 && Array.isArray(error.errors)) {
    res.status(400).json({ message: 'Validation failed', errors: error.errors });
    return;
  }

  if (error && error.name === 'ValidationError' && error.errors) {
    const errors = Object.entries(error.errors).map(([field, fieldError]) => ({
      field,
      message: fieldError.kind === 'required'
        ? `${field} is required`
        : `${field} is invalid`,
    }));
    res.status(400).json({ message: 'Validation failed', errors });
    return;
  }

  if (error && error.name === 'CastError') {
    const field = error.path === '_id' ? 'id' : error.path || 'id';
    res.status(400).json({
      message: 'Validation failed',
      errors: [{ field, message: `${field} is invalid` }],
    });
    return;
  }

  if (error && error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'value';
    res.status(400).json({
      message: 'Validation failed',
      errors: [{ field, message: `${field} already exists` }],
    });
    return;
  }

  console.error('Unhandled request error:', error);
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = { errorHandler, notFound };

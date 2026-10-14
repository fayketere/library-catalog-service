const express = require('express');
const User = require('../models/User');
const {
  clearSessionCookie,
  createToken,
  readCookie,
  revokeToken,
  setSessionCookie,
} = require('../middleware/auth');
const { createValidationError } = require('../middleware/validate');

const router = express.Router();

function validateRegistration(req, _res, next) {
  const { username, email, password } = req.body || {};
  const errors = [];
  if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 50) {
    errors.push({ field: 'username', message: 'username must be between 3 and 50 characters' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push({ field: 'email', message: 'email must be a valid email address' });
  }
  if (typeof username === 'string' && username.trim().toLowerCase() === 'librarian') {
    errors.push({ field: 'username', message: 'username is reserved' });
  }
  if (typeof email === 'string' && email.trim().toLowerCase() === 'librarian@library.test') {
    errors.push({ field: 'email', message: 'email is reserved' });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    errors.push({ field: 'password', message: 'password must be between 8 and 128 characters' });
  }
  if (errors.length) {
    next(createValidationError(errors));
    return;
  }
  req.body = { username: username.trim(), email: email.trim().toLowerCase(), password };
  next();
}

function validateLogin(req, _res, next) {
  const { email, username, identifier, password } = req.body || {};
  const loginIdentifier = identifier ?? email ?? username;
  const errors = [];
  if (typeof loginIdentifier !== 'string' || !loginIdentifier.trim()) {
    errors.push({ field: 'email', message: 'email, username, or identifier is required' });
  }
  if (typeof password !== 'string' || !password || password.length > 128) {
    errors.push({ field: 'password', message: 'password is required' });
  }
  if (errors.length) {
    next(createValidationError(errors));
    return;
  }
  req.loginIdentifier = loginIdentifier.trim().toLowerCase();
  next();
}

function publicUser(user) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const user = await User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      role: 'patron',
    });
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error && error.code === 11000) {
      res.status(409).json({ message: 'Username or email is already registered' });
      return;
    }
    next(error);
  }
});

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const user = await User.findOne({
      $or: [{ email: req.loginIdentifier }, { username: req.loginIdentifier }],
    }).select('+password');
    if (!user || !await user.comparePassword(req.body.password)) {
      res.status(401).json({ message: 'Invalid username/email or password' });
      return;
    }

    const token = createToken(user._id.toString());
    res.setHeader('Set-Cookie', setSessionCookie(token));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  revokeToken(readCookie(req.headers.cookie));
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.status(204).end();
});

module.exports = router;

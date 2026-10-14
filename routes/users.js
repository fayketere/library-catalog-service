const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json(req.user);
});

module.exports = router;

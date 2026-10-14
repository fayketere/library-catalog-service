require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in the environment or .env file');
  }
  if (process.env.NODE_ENV === 'production'
    && (!process.env.JWT_SECRET
      || process.env.JWT_SECRET.length < 32
      || process.env.JWT_SECRET === 'development-only-secret-change-before-production'
      || process.env.JWT_SECRET === 'replace-with-a-random-secret-of-at-least-32-characters')) {
    throw new Error('JWT_SECRET must be a unique value of at least 32 characters in production');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const port = Number(process.env.PORT) || 3000;
  return app.listen(port, () => {
    console.log(`Library Catalog API listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start Library Catalog API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = startServer;

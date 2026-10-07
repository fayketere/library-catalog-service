require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app');

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set in the environment or .env file');
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

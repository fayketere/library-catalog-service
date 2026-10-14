const { promisify } = require('node:util');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const mongoose = require('mongoose');

const scryptAsync = promisify(scrypt);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['patron', 'librarian'],
    default: 'patron',
  },
}, {
  toJSON: {
    transform(_document, result) {
      delete result.password;
      delete result.__v;
      return result;
    },
  },
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(this.password, salt, 64);
  this.password = `${salt}$${hash.toString('hex')}`;
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  const [salt, storedHash] = this.password.split('$');
  if (!salt || !storedHash) {
    return false;
  }

  const candidateHash = await scryptAsync(candidate, salt, 64);
  const expectedHash = Buffer.from(storedHash, 'hex');
  return candidateHash.length === expectedHash.length
    && timingSafeEqual(candidateHash, expectedHash);
};

module.exports = mongoose.model('User', userSchema);

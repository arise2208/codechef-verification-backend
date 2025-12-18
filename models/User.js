const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  codechefUsername: {
    type: String,
    default: null
  },
  verificationHex: {
    type: String,
    default: null
  },
  submissionId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'],
    default: 'NONE'
  },
  password: {
    type: String,
    default: null
  },
  passwordSet: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpiry: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
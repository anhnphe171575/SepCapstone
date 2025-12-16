const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Connect to MongoDB using the MONGODB_URI from environment variables.
 * Ensures a single connection and provides useful logs on success/failure.
 */
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not defined in environment variables');
    throw new Error('Missing MONGODB_URI');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(mongoUri, {
      // keep defaults simple; mongoose v8 uses modern driver settings
    });
    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    console.error('Connection error:', error);
    throw error;
  }
}

module.exports = { mongoose, connectDB };
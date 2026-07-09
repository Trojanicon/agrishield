const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/agrishield';
  try {
    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB at ${uri}`);
  } catch (err) {
    console.error('[DB] Connection error:', err.message);
    console.error('[DB] Tip: run `mongod` locally or set MONGO_URI to an Atlas connection string.');
    process.exit(1);
  }
}

module.exports = connectDB;

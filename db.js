// db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'cst3144';

let client;
let db;

/**
 * Initialise a single MongoDB client and cache the db handle.
 * Call this once on server start.
 */
async function initMongo() {
  if (db) return db;
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing – set it in your .env or Render env vars.');
  }

  client = new MongoClient(MONGODB_URI, {
    // Reasonable timeouts so your app doesn't hang forever
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 30000,
  });

  await client.connect();
  db = client.db(DB_NAME);
  return db;
}

/**
 * Get the cached db handle after initMongo() has run.
 */
function getDb() {
  if (!db) {
    throw new Error('MongoDB not initialised. Call initMongo() first.');
  }
  return db;
}

/**
 * Close the underlying client (useful for tests/scripts).
 */
async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  initMongo,
  getDb,
  closeMongo,
};

const { MongoClient, ServerApiVersion } = require('mongodb');

let client;
let cachedDb;

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'cst3144';

async function initMongo() {
  if (!uri) throw new Error('MONGODB_URI env var missing');

  if (cachedDb) return cachedDb;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    retryWrites: true,
  });

  try {
    console.log('[mongo] connecting…');
    await client.connect();
    console.log('[mongo] connected, pinging…');
    await client.db(dbName).command({ ping: 1 });
    console.log('[mongo] ping ok');
    cachedDb = client.db(dbName);
    return cachedDb;
  } catch (err) {
    console.error('[mongo] connect failed:', err?.message || err);
    if (err?.reason) console.error('[mongo] reason:', err.reason);
    throw err;
  }
}

async function getDb() {
  return cachedDb || initMongo();
}

async function closeMongo() {
  try {
    if (client) await client.close();
  } catch (_) {}
  client = undefined;
  cachedDb = undefined;
}

module.exports = { initMongo, getDb, closeMongo };

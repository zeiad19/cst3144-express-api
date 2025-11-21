require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('DB_NAME:', process.env.DB_NAME);
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function testConnection() {
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    console.log("✅ MongoDB connection successful!");
    await client.close();
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}

testConnection();
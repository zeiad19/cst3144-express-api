// seedMongo.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'cst3144';

  if (!uri) {
    console.error('❌ MONGODB_URI is missing in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    retryWrites: true,
  });

  try {
    console.log('⏳ Connecting to Atlas…');
    await client.connect();
    const db = client.db(dbName);

    // Ensure unique id for lessons
    await db.collection('lessons').createIndex({ id: 1 }, { unique: true });

    const count = await db.collection('lessons').countDocuments();
    if (count === 0) {
      const filePath = path.join(__dirname, 'seed', 'lessons.json');
      const raw = fs.readFileSync(filePath, 'utf8');
      const lessons = JSON.parse(raw);

      if (!Array.isArray(lessons) || lessons.length === 0) {
        throw new Error(`lessons.json is empty or not an array: ${filePath}`);
      }

      const result = await db.collection('lessons').insertMany(lessons, { ordered: false });
      console.log(`✅ Seeded ${result.insertedCount} lessons`);
    } else {
      console.log(`ℹ️ Lessons already present (${count}), skipping seeding`);
    }
  } catch (err) {
    console.error('❌ Seed error:', err?.message || err);
  } finally {
    await client.close();
    console.log('🔌 Closed Mongo connection');
  }
})();

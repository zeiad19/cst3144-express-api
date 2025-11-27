// seedMongo.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

(async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'cst3144';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection('lessons').createIndex({ id: 1 }, { unique: true });
    const file = path.join(__dirname, 'seed', 'lessons.json'); // <- use your existing file
    const lessons = JSON.parse(fs.readFileSync(file, 'utf8'));
    const count = await db.collection('lessons').countDocuments();
    if (count === 0) {
      const r = await db.collection('lessons').insertMany(lessons);
      console.log(`Seeded ${r.insertedCount} lessons`);
    } else {
      console.log(`Lessons already present (${count})`);
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  } finally {
    await client.close();
  }
})();

// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const { initMongo, getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------ Middleware ------------ */

app.use(cors());
app.use(express.json());

// simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`
    );
  });
  next();
});

/* ------------ Routes ------------ */

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = getDb();
    await db.command({ ping: 1 });

    res.json({
      ok: true,
      db: process.env.DB_NAME || 'cst3144',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('/health error:', err);
    res.status(500).json({
      ok: false,
      error: err.message || 'Health check failed',
    });
  }
});

// GET /lessons
app.get('/lessons', async (req, res) => {
  try {
    const db = getDb();
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error('GET /lessons error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /search?query=...
// search in topic, location, and optionally by numeric price/space
app.get('/search', async (req, res) => {
  try {
    const db = getDb();
    const raw = (req.query.query || '').trim();

    if (!raw) {
      const all = await db.collection('lessons').find({}).toArray();
      return res.json(all);
    }

    const regex = new RegExp(raw, 'i');
    const maybeNumber = Number(raw);
    const numFilter =
      !Number.isNaN(maybeNumber)
        ? [{ price: maybeNumber }, { space: maybeNumber }]
        : [];

    const filter = {
      $or: [
        { topic: regex },
        { location: regex },
        ...numFilter
      ]
    };

    const results = await db.collection('lessons').find(filter).toArray();
    res.json(results);
  } catch (err) {
    console.error('GET /search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /orders
// body: { name, phone, items: [{ id, qty }] }
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, items } = req.body || {};

    if (!name || !phone || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid order payload. Expect { name, phone, items:[{id, qty}] }',
      });
    }

    const order = {
      name,
      phone,
      items,
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    const result = await db.collection('orders').insertOne(order);

    res.status(201).json({ ok: true, orderId: result.insertedId });
  } catch (err) {
    console.error('POST /orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------ PUT /lessons/:id ------------ */
/*
  PUT /lessons/Some-Id
  body: { space: 4 }   // or topic/location/price
*/
app.put('/lessons/:id', async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const body = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'Missing "id" parameter in URL' });
    }

    if ('id' in body) {
      delete body.id;
    }

    if (typeof body.spaces === 'number' && typeof body.space !== 'number') {
      body.space = body.spaces;
      delete body.spaces;
    }

    const allowed = ['topic', 'location', 'price', 'space'];
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) {
        return res.status(400).json({ error: `Field "${key}" not allowed` });
      }
    }

    if ('price' in body && typeof body.price !== 'number') {
      return res.status(400).json({ error: 'price must be a number' });
    }
    if ('space' in body && typeof body.space !== 'number') {
      return res.status(400).json({ error: 'space must be a number' });
    }

    const filter = { id: id };

    const result = await db.collection('lessons').findOneAndUpdate(
      filter,
      { $set: body },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Lesson not found', tried: id });
    }

    res.json({ ok: true, lesson: result.value });
  } catch (err) {
    console.error('PUT /lessons/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------ Static images (optional) ------------ */

app.get('/images/:file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'images', req.params.file);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.sendFile(filePath);
  });
});

// Root route helper
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    routes: [
      'GET /health',
      'GET /lessons',
      'GET /search?query=',
      'POST /orders',
      'PUT /lessons/:id',
      'GET /images/:file',
    ],
  });
});

/* ------------ 404 & Error handlers ------------ */

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------ Start server ------------ */

(async () => {
  try {
    await initMongo();
    console.log('✅ MongoDB initialised');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB failed to initialise:', err.message || err);
    app.listen(PORT, () => {
      console.log(`🚀 Server running (degraded) on http://localhost:${PORT}`);
      console.log('   /health will report the Mongo error until it’s fixed.');
    });
  }
})();

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
app.use(express.json());
app.use(cors());

// Tiny request logger
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

// Health check: confirms server is up and Mongo can be reached
app.get('/health', async (req, res) => {
  try {
    const db = getDb();           // throws if not init'd
    await db.command({ ping: 1 }); // verifies connectivity
    res.json({
      ok: true,
      db: process.env.DB_NAME || 'cst3144',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || 'Health check failed',
    });
  }
});

// GET /lessons -> list all lessons
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

// POST /orders -> save a new order
// Expected body: { name, phone, items: [{ id, qty }], total? }
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

// PUT /lessons/:id -> update allowed fields on a lesson (e.g., space/spaces, price, topic, location)
app.put('/lessons/:id', async (req, res) => {
  try {
    const idParam = String(req.params.id).trim();
    const body = { ...req.body };

    // Accept "spaces" or "space" – normalise to "space"
    if (typeof body.spaces === 'number' && typeof body.space !== 'number') {
      body.space = body.spaces;
      delete body.spaces;
    }

    // Only allow these fields to be updated
    const allowed = ['topic', 'location', 'price', 'space'];
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) {
        return res.status(400).json({ error: `Field "${key}" not allowed` });
      }
    }

    // Type checks for numeric fields
    if ('price' in body && typeof body.price !== 'number') {
      return res.status(400).json({ error: 'price must be a number' });
    }
    if ('space' in body && typeof body.space !== 'number') {
      return res.status(400).json({ error: 'space must be a number' });
    }

    const db = await getDb();
    const result = await db.collection('lessons').findOneAndUpdate(
      { id: idParam },            // lessons in seed use "id" as a string like "Art-Hen-70"
      { $set: body },
      { returnDocument: 'after' } // return updated doc
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Lesson not found', tried: idParam });
    }

    res.json({ ok: true, lesson: result.value });
  } catch (err) {
    console.error('PUT /lessons/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple image file middleware (optional)
// Serves files from /public/images/:file if present
app.get('/images/:file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'images', req.params.file);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.sendFile(filePath);
  });
});

// Root route help
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    routes: [
      'GET /health',
      'GET /lessons',
      'POST /orders',
      'PUT /lessons/:id',
      'GET /images/:file',
    ],
  });
});

/* ------------ 404 & Error handlers ------------ */

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Central error handler
// (Note: keep the 4 args signature)
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
    // Start the HTTP server anyway so /health can report the problem
    app.listen(PORT, () => {
      console.log(`🚀 Server running (degraded) on http://localhost:${PORT}`);
      console.log('   Health will report the Mongo error until fixed.');
    });
  }
})();

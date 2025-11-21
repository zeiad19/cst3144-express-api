const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { getDb, initMongo } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON + CORS
app.use(express.json());
app.use(cors());

// logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// ---------- API ----------

// GET /lessons (list)
app.get('/lessons', async (req, res) => {
  try {
    const db = await getDb();
    const lessons = await db.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) {
    console.error('GET /lessons:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /orders  { name, phone, items:[{id, qty}] }
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, items } = req.body || {};
    if (!name || !/^[a-zA-Z\s]+$/.test(name)) return res.status(400).json({ error: 'Invalid name' });
    if (!phone || !/^\d+$/.test(phone)) return res.status(400).json({ error: 'Invalid phone' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Invalid items' });

    const db = await getDb();
    const order = {
      name, phone, items,
      createdAt: new Date().toISOString()
    };
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ ok: true, orderId: String(result.insertedId) });
  } catch (err) {
    console.error('POST /orders:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lessons/:id  (update price/space)
app.put('/lessons/:id', async (req, res) => {
  try {
    const idParam = String(req.params.id).trim();
    const $set = {};
    if (typeof req.body.space === 'number') $set.space = req.body.space;
    if (typeof req.body.spaces === 'number') $set.space = req.body.spaces;
    if (typeof req.body.price === 'number') $set.price = req.body.price;

    if (!Object.keys($set).length) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const db = await getDb();
    const result = await db.collection('lessons').findOneAndUpdate(
      { id: idParam },
      { $set },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({ error: 'Lesson not found', tried: idParam });
    }
    res.json({ ok: true, lesson: result.value });
  } catch (err) {
    console.error('PUT /lessons/:id:', err?.message || err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// static images (optional)
app.get('/images/:file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'images', req.params.file);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return res.status(404).json({ error: 'Image not found' });
    res.sendFile(filePath);
  });
});

// root
app.get('/', (_, res) => {
  res.json({
    status: 'OK',
    routes: ['GET /lessons', 'POST /orders', 'PUT /lessons/:id', 'GET /images/:file', 'GET /health']
  });
});

// health (pings DB)
app.get('/health', async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ ok: true, env: process.env.NODE_ENV || 'dev', ts: new Date().toISOString() });
  } catch (err) {
    res.json({ ok: false, error: err?.message || String(err) });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// initialize DB once
initMongo().catch(() => {});

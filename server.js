const express = require('express');
const cors = require('cors'); // ✅ use cors package
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // ✅ enable CORS for all routes

// logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// (removed manual CORS block — cors() handles OPTIONS + headers)

const lessons = require('./seed/lessons.json');
const orders = [];

// GET /lessons
app.get('/lessons', (req, res) => res.json(lessons));

// POST /orders
app.post('/orders', (req, res) => {
  const { name, phone, items } = req.body || {};
  if (!name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order payload. Expect { name, phone, items:[{id, qty}] }' });
  }
  const order = { id: `o_${Date.now()}`, name, phone, items, createdAt: new Date().toISOString() };
  orders.push(order);
  res.status(201).json({ ok: true, orderId: order.id });
});

// PUT /lessons/:id
app.put('/lessons/:id', (req, res) => {
  const id = req.params.id;
  const idx = lessons.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

  const allowed = ['topic', 'location', 'price', 'space'];
  for (const k of Object.keys(req.body || {})) {
    if (!allowed.includes(k)) return res.status(400).json({ error: `Attribute "${k}" not allowed` });
  }
  if ('price' in req.body && typeof req.body.price !== 'number') return res.status(400).json({ error: 'price must be a number' });
  if ('space' in req.body && typeof req.body.space !== 'number') return res.status(400).json({ error: 'space must be a number' });

  lessons[idx] = { ...lessons[idx], ...req.body };
  res.json({ ok: true, lesson: lessons[idx] });
});

// static image middleware
app.get('/images/:file', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'images', req.params.file);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) return res.status(404).json({ error: 'Image not found' });
    res.sendFile(filePath);
  });
});

app.get('/', (_, res) => res.json({ status: 'OK', routes: ['GET /lessons', 'POST /orders', 'PUT /lessons/:id', 'GET /images/:file'] }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

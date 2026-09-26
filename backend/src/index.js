require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '50kb' }));

// Rate limit only refund submissions (POST), not reads.
// GET routes (dashboard, stats, request detail, audit trail) must never be rate-limited
// or normal navigation and page refreshes will trigger false 429 errors.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many submissions. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ── Initialize DB ─────────────────────────────────────────────────────────────
getDb();

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/refund-requests', require('./routes/refundRequests')(submitLimiter));
app.use('/api/customers', require('./routes/customers'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai_configured: !!process.env.ANTHROPIC_API_KEY
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RefundIQ API running on port ${PORT}`);
  console.log(`AI: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured - AI features disabled'}`);
});

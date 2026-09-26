const express = require('express');
const { validateRefundRequest, validateAgentUpdate } = require('../middleware/validate');
const {
  processRefundRequest,
  getAllRefundRequests,
  getRefundRequest,
  updateRefundRequest,
  getDashboardStats
} = require('../services/refundService');
const { getAuditTrail } = require('../services/auditService');

// Router is exported as a factory so the POST-only rate limiter
// can be injected from index.js without touching GET routes.
module.exports = function(submitLimiter) {
  const router = express.Router();

// GET /api/refund-requests - dashboard list
router.get('/', (req, res) => {
  try {
    const { status, search, limit, offset } = req.query;
    const result = getAllRefundRequests({
      status,
      search,
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0
    });
    res.json(result);
  } catch (err) {
    console.error('[GET /refund-requests]', err);
    res.status(500).json({ error: 'Failed to fetch refund requests.' });
  }
});

// GET /api/refund-requests/stats - dashboard summary
router.get('/stats', (req, res) => {
  try {
    res.json(getDashboardStats());
  } catch (err) {
    console.error('[GET /refund-requests/stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/refund-requests/:id - single request detail
router.get('/:id', (req, res) => {
  try {
    const record = getRefundRequest(req.params.id);
    if (!record) return res.status(404).json({ error: 'Refund request not found.' });
    res.json(record);
  } catch (err) {
    console.error('[GET /refund-requests/:id]', err);
    res.status(500).json({ error: 'Failed to fetch refund request.' });
  }
});

// GET /api/refund-requests/:id/audit - audit trail
router.get('/:id/audit', (req, res) => {
  try {
    const trail = getAuditTrail(req.params.id);
    res.json(trail);
  } catch (err) {
    console.error('[GET /refund-requests/:id/audit]', err);
    res.status(500).json({ error: 'Failed to fetch audit trail.' });
  }
});

// POST /api/refund-requests - submit a new refund request (rate limited)
router.post('/', submitLimiter, validateRefundRequest, async (req, res) => {
  try {
    const { customerId, orderId, customerMessage } = req.body;
    const result = await processRefundRequest({ customerId, orderId, customerMessage });
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = status < 500 ? err.message : 'Request processing failed.';
    if (status >= 500) console.error('[POST /refund-requests]', err);
    res.status(status).json({ error: message });
  }
});

// PATCH /api/refund-requests/:id - agent update (notes, manual resolution)
router.patch('/:id', validateAgentUpdate, (req, res) => {
  try {
    const { decision, agentNotes } = req.body;
    const updated = updateRefundRequest(req.params.id, { decision, agentNotes });
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[PATCH /refund-requests/:id]', err);
    res.status(status).json({ error: err.message });
  }
});

  return router;
};

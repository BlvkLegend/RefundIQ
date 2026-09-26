/**
 * Simple validation middleware.
 * Returns 400 with a structured error if required fields are missing or invalid.
 */

function validateRefundRequest(req, res, next) {
  const { customerId, orderId, customerMessage } = req.body;
  const errors = [];

  if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
    errors.push({ field: 'customerId', message: 'Customer ID is required.' });
  }
  if (!orderId || typeof orderId !== 'string' || !orderId.trim()) {
    errors.push({ field: 'orderId', message: 'Order ID is required.' });
  }
  if (!customerMessage || typeof customerMessage !== 'string' || customerMessage.trim().length < 10) {
    errors.push({ field: 'customerMessage', message: 'A message of at least 10 characters is required.' });
  }
  if (customerMessage && customerMessage.length > 3000) {
    errors.push({ field: 'customerMessage', message: 'Message must be under 3000 characters.' });
  }

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', fields: errors });
  }
  next();
}

function validateAgentUpdate(req, res, next) {
  const { decision, agentNotes } = req.body;

  if (decision && !['approved', 'denied'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "denied".' });
  }
  if (agentNotes !== undefined && typeof agentNotes !== 'string') {
    return res.status(400).json({ error: 'agentNotes must be a string.' });
  }
  if (!decision && agentNotes === undefined) {
    return res.status(400).json({ error: 'Provide at least one of: decision, agentNotes.' });
  }
  next();
}

module.exports = { validateRefundRequest, validateAgentUpdate };

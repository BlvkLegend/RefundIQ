const { getDb } = require('../db/schema');
const { v4: uuidv4 } = require('uuid');

/**
 * Append an event to the audit log for a refund request.
 */
function logEvent(refundRequestId, event, detail, actor = 'system') {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_log (id, refund_request_id, event, detail, actor, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(uuidv4(), refundRequestId, event, detail || null, actor);
  } catch (err) {
    // Audit log failures should not crash the main request flow
    console.error('[audit] Failed to log event:', err.message);
  }
}

/**
 * Retrieve audit trail for a refund request.
 */
function getAuditTrail(refundRequestId) {
  const db = getDb();
  return db.prepare(`
    SELECT id, event, detail, actor, created_at
    FROM audit_log
    WHERE refund_request_id = ?
    ORDER BY created_at ASC
  `).all(refundRequestId);
}

module.exports = { logEvent, getAuditTrail };

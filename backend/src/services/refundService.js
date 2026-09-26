const { getDb } = require('../db/schema');
const { evaluatePolicy, resolveDecision } = require('./refundPolicy');
const { analyzeRefundRequest } = require('./aiService');
const { logEvent } = require('./auditService');
const { v4: uuidv4 } = require('uuid');

/**
 * Look up a customer by ID or email.
 */
function getCustomer(identifier) {
  const db = getDb();
  const byId = db.prepare('SELECT * FROM customers WHERE id = ?').get(identifier);
  if (byId) return byId;
  return db.prepare('SELECT * FROM customers WHERE email = ?').get(identifier);
}

/**
 * Get all orders for a customer.
 */
function getCustomerOrders(customerId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM orders WHERE customer_id = ? ORDER BY ordered_at DESC'
  ).all(customerId);
}

/**
 * Get a specific order.
 */
function getOrder(orderId) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
}

/**
 * Get existing refund requests for an order.
 */
function getOrderRefundRequests(orderId) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM refund_requests WHERE order_id = ? ORDER BY created_at ASC'
  ).all(orderId);
}

/**
 * Get all refund requests (for dashboard), with customer and order context joined.
 */
function getAllRefundRequests({ status, search, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  let where = '';
  const params = [];

  const conditions = [];
  if (status && status !== 'all') {
    conditions.push('rr.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(c.name LIKE ? OR c.email LIKE ? OR o.product_name LIKE ? OR rr.id LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (conditions.length) where = 'WHERE ' + conditions.join(' AND ');

  const rows = db.prepare(`
    SELECT
      rr.id, rr.status, rr.decision, rr.request_type, rr.refund_amount,
      rr.policy_ai_conflict, rr.escalation_reason, rr.created_at, rr.resolved_at,
      rr.processing_state, rr.ai_classification, rr.customer_message,
      c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
      c.location AS customer_location, c.country AS customer_country,
      o.id AS order_id, o.product_name, o.amount AS order_amount,
      o.currency, o.is_final_sale, o.ordered_at, o.delivered_at
    FROM refund_requests rr
    JOIN customers c ON rr.customer_id = c.id
    JOIN orders o ON rr.order_id = o.id
    ${where}
    ORDER BY rr.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM refund_requests rr
    JOIN customers c ON rr.customer_id = c.id
    JOIN orders o ON rr.order_id = o.id
    ${where}
  `).get(...params).count;

  return { requests: rows, total };
}

/**
 * Get a single refund request with full detail.
 */
function getRefundRequest(requestId) {
  const db = getDb();
  return db.prepare(`
    SELECT
      rr.*,
      c.name AS customer_name, c.email AS customer_email,
      c.phone AS customer_phone, c.location AS customer_location,
      c.country AS customer_country,
      o.product_name, o.product_category, o.amount AS order_amount,
      o.currency, o.is_final_sale, o.ordered_at, o.delivered_at, o.status AS order_status
    FROM refund_requests rr
    JOIN customers c ON rr.customer_id = c.id
    JOIN orders o ON rr.order_id = o.id
    WHERE rr.id = ?
  `).get(requestId);
}

/**
 * Dashboard summary stats.
 */
function getDashboardStats() {
  const db = getDb();
  const statuses = db.prepare(`
    SELECT status, COUNT(*) AS count FROM refund_requests GROUP BY status
  `).all();

  const stats = { pending: 0, approved: 0, denied: 0, escalated: 0, processing: 0, total: 0 };
  for (const row of statuses) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }

  const conflicts = db.prepare(
    'SELECT COUNT(*) AS count FROM refund_requests WHERE policy_ai_conflict = 1'
  ).get().count;

  const totalRefunded = db.prepare(`SELECT COALESCE(SUM(refund_amount), 0) AS total FROM refund_requests WHERE decision = 'approved'`).get().total;

  return { ...stats, conflicts, totalRefunded };
}

/**
 * Main request processing pipeline.
 * Returns the created/updated refund request record.
 */
async function processRefundRequest({ customerId, orderId, customerMessage }) {
  const db = getDb();
  const requestId = uuidv4();

  // ── 1. Validate inputs ──────────────────────────────────────────────────────
  if (!customerId || !orderId || !customerMessage?.trim()) {
    throw Object.assign(new Error('customerId, orderId, and customerMessage are required.'), { status: 400 });
  }
  if (customerMessage.trim().length < 10) {
    throw Object.assign(new Error('Message is too short to process.'), { status: 400 });
  }

  // ── 2. Look up customer and order ───────────────────────────────────────────
  const customer = getCustomer(customerId);
  if (!customer) {
    throw Object.assign(new Error('Customer not found.'), { status: 404 });
  }

  const order = getOrder(orderId);
  if (!order) {
    throw Object.assign(new Error('Order not found.'), { status: 404 });
  }

  if (order.customer_id !== customer.id) {
    throw Object.assign(new Error('Order does not belong to this customer.'), { status: 403 });
  }

  // ── 3. Create initial request record ────────────────────────────────────────
  db.prepare(`
    INSERT INTO refund_requests (id, customer_id, order_id, customer_message, status, processing_state, created_at)
    VALUES (?, ?, ?, ?, 'processing', 'policy_check', datetime('now'))
  `).run(requestId, customer.id, orderId, customerMessage.trim());

  logEvent(requestId, 'request_received', `Customer submitted refund request for order ${orderId}`, 'customer');

  try {
    // ── 4. Initial policy check (without AI flags yet) ──────────────────────
    const existingRequests = getOrderRefundRequests(orderId);
    const initialPolicy = evaluatePolicy(order, customer, existingRequests, { currentRequestId: requestId });

    logEvent(requestId, 'policy_checked', `Checks: ${initialPolicy.checks.join(' | ')}`, 'system');

    // Hard policy denial - no need to call AI
    if (initialPolicy.hardDecision === 'deny') {
      const result = resolveDecision(initialPolicy, null);
      db.prepare(`
        UPDATE refund_requests SET
          status = 'denied', decision = 'denied',
          decision_reason = ?, refund_amount = 0,
          policy_result = ?, ai_classification = NULL,
          ai_reasoning = NULL, ai_suggested_decision = NULL,
          ai_customer_response = ?, ai_flags = '[]',
          policy_ai_conflict = 0, processing_state = 'complete',
          resolved_at = datetime('now')
        WHERE id = ?
      `).run(
        result.finalReason,
        JSON.stringify(initialPolicy),
        buildDenialResponse(order, initialPolicy.reason),
        requestId
      );

      logEvent(requestId, 'decision_made', `Denied by policy: ${initialPolicy.reason}`, 'system');
      return getRefundRequest(requestId);
    }

    // ── 5. Call AI for interpretation ────────────────────────────────────────
    db.prepare(`UPDATE refund_requests SET processing_state = 'ai_analysis' WHERE id = ?`).run(requestId);

    const aiResult = await analyzeRefundRequest({
      customerMessage: customerMessage.trim(),
      productName: order.product_name,
      productCategory: order.product_category,
      orderAmount: order.amount,
      orderedAt: order.ordered_at,
      customerName: customer.name
    });

    // ── 6. Handle AI failure ─────────────────────────────────────────────────
    if (aiResult.error) {
      logEvent(requestId, 'ai_error', `AI failed: ${aiResult.errorType} - ${aiResult.message}`, 'ai');

      // Safe fallback: escalate if AI is unavailable
      db.prepare(`
        UPDATE refund_requests SET
          status = 'escalated', decision = 'escalated',
          decision_reason = ?,
          policy_result = ?,
          ai_classification = 'unavailable',
          ai_reasoning = ?,
          ai_suggested_decision = NULL,
          ai_customer_response = ?,
          ai_flags = '["ai_unavailable"]',
          policy_ai_conflict = 1,
          escalation_reason = 'AI service unavailable - escalated for human review',
          processing_state = 'complete',
          resolved_at = datetime('now')
        WHERE id = ?
      `).run(
        `AI service unavailable (${aiResult.errorType}). Request escalated for manual review.`,
        JSON.stringify(initialPolicy),
        aiResult.message,
        'Your refund request has been received and forwarded to our support team for review. We will get back to you within 24-48 hours.',
        requestId
      );

      logEvent(requestId, 'decision_made', 'Escalated: AI unavailable, safety fallback', 'system');
      return getRefundRequest(requestId);
    }

    logEvent(
      requestId,
      'ai_processed',
      `AI classified as "${aiResult.classification}" (${aiResult.confidence} confidence), suggested: ${aiResult.suggested_decision}. Flags: ${aiResult.flags.join(', ') || 'none'}`,
      'ai'
    );

    // ── 7. Re-run policy with AI flags (suspicion check) ────────────────────
    const finalPolicy = evaluatePolicy(order, customer, existingRequests, {
      currentRequestId: requestId,
      aiFlags: aiResult.flags
    });

    // ── 8. Resolve final decision ────────────────────────────────────────────
    const resolution = resolveDecision(finalPolicy, aiResult.suggested_decision);
    const finalStatus = resolution.decision === 'approve' ? 'approved'
      : resolution.decision === 'deny' ? 'denied'
      : 'escalated';

    const refundAmount = finalStatus === 'approved' ? order.amount : 0;

    db.prepare(`
      UPDATE refund_requests SET
        status = ?,
        decision = ?,
        decision_reason = ?,
        refund_amount = ?,
        policy_result = ?,
        ai_classification = ?,
        ai_reasoning = ?,
        ai_suggested_decision = ?,
        ai_customer_response = ?,
        ai_flags = ?,
        policy_ai_conflict = ?,
        escalation_reason = ?,
        request_type = ?,
        processing_state = 'complete',
        resolved_at = datetime('now')
      WHERE id = ?
    `).run(
      finalStatus,
      resolution.decision,
      resolution.finalReason,
      refundAmount,
      JSON.stringify(finalPolicy),
      aiResult.classification,
      aiResult.reasoning,
      aiResult.suggested_decision,
      aiResult.customer_response,
      JSON.stringify(aiResult.flags),
      resolution.conflict ? 1 : 0,
      finalPolicy.escalationReason || null,
      aiResult.classification,
      requestId
    );

    if (resolution.conflict) {
      logEvent(requestId, 'policy_ai_conflict', `Policy decided "${resolution.decision}" but AI suggested "${aiResult.suggested_decision}"`, 'system');
    }

    logEvent(
      requestId,
      'decision_made',
      `Decision: ${finalStatus}. Refund: $${refundAmount.toFixed(2)}. ${resolution.finalReason}`,
      'system'
    );

    return getRefundRequest(requestId);

  } catch (err) {
    // Unexpected error - mark as failed/escalated
    try {
      db.prepare(`
        UPDATE refund_requests SET
          status = 'escalated', decision = 'escalated',
          decision_reason = 'Processing error - escalated for manual review.',
          processing_state = 'error',
          escalation_reason = ?
        WHERE id = ?
      `).run(err.message?.slice(0, 500), requestId);
      logEvent(requestId, 'processing_error', err.message?.slice(0, 500), 'system');
    } catch (_) {}
    throw err;
  }
}

/**
 * Update agent notes or resolve an escalated request manually.
 */
function updateRefundRequest(requestId, { agentNotes, decision }) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(requestId);
  if (!existing) {
    throw Object.assign(new Error('Request not found.'), { status: 404 });
  }

  const updates = [];
  const params = [];

  if (agentNotes !== undefined) {
    updates.push('agent_notes = ?');
    params.push(agentNotes);
  }

  if (decision && ['approved', 'denied'].includes(decision)) {
    if (existing.status !== 'escalated') {
      throw Object.assign(new Error('Only escalated requests can be manually resolved.'), { status: 400 });
    }
    updates.push('status = ?', 'decision = ?', 'resolved_at = datetime(\'now\')');
    params.push(decision, decision);

    if (decision === 'approved') {
      const order = getOrder(existing.order_id);
      updates.push('refund_amount = ?');
      params.push(order?.amount || 0);
    }
  }

  if (!updates.length) return existing;

  params.push(requestId);
  db.prepare(`UPDATE refund_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  if (decision) {
    logEvent(requestId, 'manual_resolution', `Agent resolved as: ${decision}`, 'agent');
  }
  if (agentNotes) {
    logEvent(requestId, 'agent_note', 'Agent added notes', 'agent');
  }

  return getRefundRequest(requestId);
}

function buildDenialResponse(order, reason) {
  return `Thank you for reaching out about your order. Unfortunately, we are unable to process a refund for ${order.product_name} at this time. ${reason} If you believe this is an error or have additional information, please contact our support team directly.`;
}

module.exports = {
  processRefundRequest,
  getAllRefundRequests,
  getRefundRequest,
  getCustomer,
  getCustomerOrders,
  getOrder,
  getDashboardStats,
  updateRefundRequest
};

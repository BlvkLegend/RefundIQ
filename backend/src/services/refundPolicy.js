/**
 * Refund Policy Engine
 *
 * This module contains deterministic business rules.
 * The AI layer assists with interpretation and communication but CANNOT override these rules.
 * All policy checks are synchronous and do not depend on LLM output.
 *
 * Policy:
 *  1. Final-sale orders are never eligible for refunds.
 *  2. Orders older than 90 days are not eligible.
 *  3. Orders with refund amount > $500 require human review (escalate).
 *  4. Duplicate requests (same order already has approved/pending refund) are denied.
 *  5. Suspicious or contradictory requests must be escalated.
 *  6. Damaged or incorrect items may qualify for approval.
 */

const RETURN_WINDOW_DAYS = 90;
const HIGH_VALUE_THRESHOLD = 500;

/**
 * @typedef {Object} PolicyResult
 * @property {boolean} eligible - Whether the request can potentially be approved
 * @property {string} hardDecision - 'deny' | 'escalate' | null - if set, this overrides AI
 * @property {string[]} checks - Which checks were evaluated
 * @property {string} reason - Human-readable summary
 * @property {string[]} flags - Named flags for the audit trail
 */

/**
 * Run all deterministic policy checks.
 * Returns a PolicyResult. If hardDecision is set, the backend uses it regardless of AI output.
 *
 * @param {Object} order - Order row from database
 * @param {Object} customer - Customer row from database
 * @param {Object} existingRequests - Prior refund requests for this order
 * @param {Object} options - Extra context { suspicious, aiFlags }
 * @returns {PolicyResult}
 */
function evaluatePolicy(order, customer, existingRequests = [], options = {}) {
  const checks = [];
  const flags = [];
  let hardDecision = null;
  let reason = '';

  // ── Check 1: Final sale ─────────────────────────────────────────────────────
  if (order.is_final_sale) {
    checks.push('final_sale_check:FAIL');
    flags.push('final_sale');
    hardDecision = 'deny';
    reason = 'Item is marked as final sale. Final sale items are not eligible for refunds.';
    return { eligible: false, hardDecision, checks, reason, flags };
  }
  checks.push('final_sale_check:PASS');

  // ── Check 2: Return window ──────────────────────────────────────────────────
  const orderedAt = new Date(order.ordered_at);
  const now = new Date();
  const daysSinceOrder = Math.floor((now - orderedAt) / (1000 * 60 * 60 * 24));

  if (daysSinceOrder > RETURN_WINDOW_DAYS) {
    checks.push(`return_window_check:FAIL (${daysSinceOrder} days, limit ${RETURN_WINDOW_DAYS})`);
    flags.push('outside_return_window');
    hardDecision = 'deny';
    reason = `Order is ${daysSinceOrder} days old. Our return window is ${RETURN_WINDOW_DAYS} days.`;
    return { eligible: false, hardDecision, checks, reason, flags };
  }
  checks.push(`return_window_check:PASS (${daysSinceOrder} days)`);

  // ── Check 3: Duplicate request ─────────────────────────────────────────────
  const priorApproved = existingRequests.filter(
    r => ['approved', 'pending', 'processing'].includes(r.status) && r.id !== options.currentRequestId
  );
  if (priorApproved.length > 0) {
    checks.push('duplicate_check:FAIL');
    flags.push('duplicate_request');
    hardDecision = 'deny';
    reason = `A refund for this order is already ${priorApproved[0].status} (${priorApproved[0].id}).`;
    return { eligible: false, hardDecision, checks, reason, flags };
  }
  checks.push('duplicate_check:PASS');

  // ── Check 4: High value threshold ──────────────────────────────────────────
  if (order.amount > HIGH_VALUE_THRESHOLD) {
    checks.push(`high_value_check:ESCALATE (amount $${order.amount})`);
    flags.push('high_value');
    hardDecision = 'escalate';
    reason = `Refund amount $${order.amount.toFixed(2)} exceeds the $${HIGH_VALUE_THRESHOLD} automatic approval threshold. Requires human review.`;
    return {
      eligible: true,
      hardDecision,
      checks,
      reason,
      flags,
      escalationReason: reason
    };
  }
  checks.push(`high_value_check:PASS (amount $${order.amount})`);

  // ── Check 5: AI-flagged suspicious (if flags passed in) ────────────────────
  // This is evaluated here so the backend can force escalation even if AI tries to approve
  const aiFlags = options.aiFlags || [];
  const suspiciousFlags = aiFlags.filter(f =>
    ['suspicious', 'contradictory', 'prompt_injection_attempt', 'high_risk'].includes(f)
  );
  if (suspiciousFlags.length > 0) {
    checks.push(`suspicion_check:ESCALATE (flags: ${suspiciousFlags.join(', ')})`);
    flags.push(...suspiciousFlags);
    hardDecision = 'escalate';
    reason = `Request flagged for human review: ${suspiciousFlags.join(', ')}.`;
    return {
      eligible: true,
      hardDecision,
      checks,
      reason,
      flags,
      escalationReason: reason
    };
  }
  checks.push('suspicion_check:PASS');

  // ── All checks passed - eligible for AI-assisted decision ──────────────────
  return {
    eligible: true,
    hardDecision: null,
    checks,
    reason: 'All policy checks passed. Eligible for AI-assisted determination.',
    flags
  };
}

/**
 * Merge the policy result and AI suggestion into a final decision.
 * Policy hard decisions cannot be overridden by AI.
 *
 * @param {PolicyResult} policyResult
 * @param {string|null} aiDecision - AI's suggested decision
 * @returns {{ decision: string, conflict: boolean, finalReason: string }}
 */
function resolveDecision(policyResult, aiDecision) {
  if (policyResult.hardDecision) {
    const conflict = aiDecision && aiDecision !== policyResult.hardDecision;
    return {
      decision: policyResult.hardDecision,
      conflict: !!conflict,
      finalReason: policyResult.reason + (conflict ? ` (Note: AI suggested "${aiDecision}" but policy overrides this.)` : '')
    };
  }

  // No hard policy override - use AI suggestion if valid
  const validDecisions = ['approve', 'deny', 'escalate'];
  if (aiDecision && validDecisions.includes(aiDecision)) {
    return {
      decision: aiDecision,
      conflict: false,
      finalReason: policyResult.reason
    };
  }

  // AI returned invalid/no decision - safe fallback
  return {
    decision: 'escalate',
    conflict: true,
    finalReason: 'AI returned an unusable response. Escalated for human review as a safety fallback.'
  };
}

module.exports = { evaluatePolicy, resolveDecision, RETURN_WINDOW_DAYS, HIGH_VALUE_THRESHOLD };

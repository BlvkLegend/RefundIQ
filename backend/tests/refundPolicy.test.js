const { evaluatePolicy, resolveDecision, RETURN_WINDOW_DAYS, HIGH_VALUE_THRESHOLD } = require('../src/services/refundPolicy');

// Helper — build a base order that passes all checks
function makeOrder(overrides = {}) {
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 5); // 5 days ago
  return {
    id: 'ord-test',
    customer_id: 'cust-test',
    product_name: 'Test Product',
    amount: 199.99,
    is_final_sale: 0,
    ordered_at: recentDate.toISOString(),
    delivered_at: new Date().toISOString(),
    ...overrides
  };
}

function makeCustomer(overrides = {}) {
  return { id: 'cust-test', name: 'Test Customer', ...overrides };
}

describe('Refund Policy — evaluatePolicy()', () => {

  test('eligible: recent order, not final sale, under $500', () => {
    const result = evaluatePolicy(makeOrder(), makeCustomer(), []);
    expect(result.eligible).toBe(true);
    expect(result.hardDecision).toBeNull();
    expect(result.flags).toHaveLength(0);
  });

  test('final sale: always denied regardless of other factors', () => {
    const result = evaluatePolicy(makeOrder({ is_final_sale: 1 }), makeCustomer(), []);
    expect(result.eligible).toBe(false);
    expect(result.hardDecision).toBe('deny');
    expect(result.flags).toContain('final_sale');
  });

  test('expired return window: denied when order is over 90 days old', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (RETURN_WINDOW_DAYS + 10));
    const result = evaluatePolicy(makeOrder({ ordered_at: oldDate.toISOString() }), makeCustomer(), []);
    expect(result.eligible).toBe(false);
    expect(result.hardDecision).toBe('deny');
    expect(result.flags).toContain('outside_return_window');
  });

  test('within return window: allowed when exactly at limit', () => {
    const borderDate = new Date();
    borderDate.setDate(borderDate.getDate() - RETURN_WINDOW_DAYS);
    const result = evaluatePolicy(makeOrder({ ordered_at: borderDate.toISOString() }), makeCustomer(), []);
    expect(result.eligible).toBe(true);
  });

  test('high value: escalated when amount exceeds $500', () => {
    const result = evaluatePolicy(makeOrder({ amount: HIGH_VALUE_THRESHOLD + 1 }), makeCustomer(), []);
    expect(result.hardDecision).toBe('escalate');
    expect(result.flags).toContain('high_value');
    expect(result.eligible).toBe(true);
  });

  test('high value: exactly $500 passes without escalation', () => {
    const result = evaluatePolicy(makeOrder({ amount: HIGH_VALUE_THRESHOLD }), makeCustomer(), []);
    expect(result.hardDecision).toBeNull();
  });

  test('duplicate: denied when prior approved request exists for same order', () => {
    const existing = [{ id: 'req-prior', status: 'approved' }];
    const result = evaluatePolicy(makeOrder(), makeCustomer(), existing);
    expect(result.eligible).toBe(false);
    expect(result.hardDecision).toBe('deny');
    expect(result.flags).toContain('duplicate_request');
  });

  test('duplicate: pending request also blocks new request', () => {
    const existing = [{ id: 'req-prior', status: 'pending' }];
    const result = evaluatePolicy(makeOrder(), makeCustomer(), existing);
    expect(result.hardDecision).toBe('deny');
  });

  test('duplicate: denied request does not block new request', () => {
    const existing = [{ id: 'req-prior', status: 'denied' }];
    const result = evaluatePolicy(makeOrder(), makeCustomer(), existing);
    expect(result.hardDecision).toBeNull();
  });

  test('suspicious: escalated when AI flags suspicious', () => {
    const result = evaluatePolicy(makeOrder(), makeCustomer(), [], { aiFlags: ['suspicious'] });
    expect(result.hardDecision).toBe('escalate');
    expect(result.flags).toContain('suspicious');
  });

  test('prompt injection: escalated when AI detects injection attempt', () => {
    const result = evaluatePolicy(makeOrder(), makeCustomer(), [], { aiFlags: ['prompt_injection_attempt'] });
    expect(result.hardDecision).toBe('escalate');
  });

  test('final sale check fires before return window check', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 200);
    // Both final sale AND old — should fail on final sale first
    const result = evaluatePolicy(makeOrder({ is_final_sale: 1, ordered_at: oldDate.toISOString() }), makeCustomer(), []);
    expect(result.flags).toContain('final_sale');
    expect(result.flags).not.toContain('outside_return_window');
  });
});

describe('Refund Policy — resolveDecision()', () => {

  test('hard denial overrides AI approval', () => {
    const policy = { hardDecision: 'deny', reason: 'Final sale', flags: ['final_sale'] };
    const result = resolveDecision(policy, 'approve');
    expect(result.decision).toBe('deny');
    expect(result.conflict).toBe(true);
  });

  test('hard escalation overrides AI approval', () => {
    const policy = { hardDecision: 'escalate', reason: 'High value', flags: ['high_value'] };
    const result = resolveDecision(policy, 'approve');
    expect(result.decision).toBe('escalate');
    expect(result.conflict).toBe(true);
  });

  test('no conflict when AI and policy agree', () => {
    const policy = { hardDecision: 'deny', reason: 'Old order', flags: [] };
    const result = resolveDecision(policy, 'deny');
    expect(result.conflict).toBe(false);
  });

  test('AI approve decision used when no hard policy override', () => {
    const policy = { hardDecision: null, reason: 'All checks passed', flags: [] };
    const result = resolveDecision(policy, 'approve');
    expect(result.decision).toBe('approve');
    expect(result.conflict).toBe(false);
  });

  test('invalid AI decision falls back to escalate', () => {
    const policy = { hardDecision: null, reason: 'All checks passed', flags: [] };
    const result = resolveDecision(policy, 'grant_admin_access');
    expect(result.decision).toBe('escalate');
    expect(result.conflict).toBe(true);
  });

  test('null AI decision falls back to escalate', () => {
    const policy = { hardDecision: null, reason: 'All checks passed', flags: [] };
    const result = resolveDecision(policy, null);
    expect(result.decision).toBe('escalate');
  });
});

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { getDb } = require('./schema');
const { v4: uuidv4 } = require('uuid');

// These are fictional demo identities using recognizable public figure names.
// All orders, emails, locations, and transactions are completely fabricated.
// This data does not represent real purchases or real claims about these individuals.

const customers = [
  // Nigerian past leaders
  {
    id: 'cust-001',
    name: 'Olusegun Obasanjo',
    email: 'obasanjo.demo@refundiq-demo.test',
    phone: '+234-801-000-0001',
    location: 'Abeokuta, Ogun State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - former Nigerian president and military leader'
  },
  {
    id: 'cust-002',
    name: 'Goodluck Jonathan',
    email: 'jonathan.demo@refundiq-demo.test',
    phone: '+234-801-000-0002',
    location: 'Otuoke, Bayelsa State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - former Nigerian president'
  },
  // Nigerian footballers
  {
    id: 'cust-003',
    name: 'Jay-Jay Okocha',
    email: 'okocha.demo@refundiq-demo.test',
    phone: '+234-801-000-0003',
    location: 'Enugu, Enugu State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - legendary Nigerian footballer'
  },
  {
    id: 'cust-004',
    name: 'Victor Osimhen',
    email: 'osimhen.demo@refundiq-demo.test',
    phone: '+234-801-000-0004',
    location: 'Abuja, FCT',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian professional footballer'
  },
  {
    id: 'cust-005',
    name: 'Nwankwo Kanu',
    email: 'kanu.demo@refundiq-demo.test',
    phone: '+234-801-000-0005',
    location: 'Owerri, Imo State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian Olympic gold medallist and Arsenal legend'
  },
  // Nigerian actors
  {
    id: 'cust-006',
    name: 'Genevieve Nnaji',
    email: 'genevieve.demo@refundiq-demo.test',
    phone: '+234-801-000-0006',
    location: 'Surulere, Lagos',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian actress and filmmaker'
  },
  {
    id: 'cust-007',
    name: 'Funke Akindele',
    email: 'funke.demo@refundiq-demo.test',
    phone: '+234-801-000-0007',
    location: 'Ogba, Lagos',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian actress and director'
  },
  {
    id: 'cust-008',
    name: 'Richard Mofe-Damijo',
    email: 'rmd.demo@refundiq-demo.test',
    phone: '+234-801-000-0008',
    location: 'Warri, Delta State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian actor and former commissioner'
  },
  // Nigerian music
  {
    id: 'cust-009',
    name: 'Femi Kuti',
    email: 'femi.demo@refundiq-demo.test',
    phone: '+234-801-000-0009',
    location: 'Ikeja, Lagos',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nigerian Afrobeat musician and activist'
  },
  // Nigerian public intellectual
  {
    id: 'cust-010',
    name: 'Wole Soyinka',
    email: 'soyinka.demo@refundiq-demo.test',
    phone: '+234-801-000-0010',
    location: 'Abeokuta, Ogun State',
    country: 'Nigeria',
    currency: 'USD',
    notes: 'Demo account - Nobel laureate and Nigerian playwright'
  },
  // International figures
  {
    id: 'cust-011',
    name: 'Ronaldinho',
    email: 'ronaldinho.demo@refundiq-demo.test',
    phone: '+55-011-000-0011',
    location: 'Sao Paulo, Brazil',
    country: 'Brazil',
    currency: 'USD',
    notes: 'Demo account - Brazilian football legend'
  },
  {
    id: 'cust-012',
    name: 'Didier Drogba',
    email: 'drogba.demo@refundiq-demo.test',
    phone: '+225-000-000-012',
    location: 'Abidjan, Ivory Coast',
    country: 'Ivory Coast',
    currency: 'USD',
    notes: 'Demo account - Ivorian football legend'
  },
  {
    id: 'cust-013',
    name: 'Serena Williams',
    email: 'serena.demo@refundiq-demo.test',
    phone: '+1-310-000-0013',
    location: 'Los Angeles, CA',
    country: 'USA',
    currency: 'USD',
    notes: 'Demo account - tennis champion and entrepreneur'
  },
  {
    id: 'cust-014',
    name: 'Nelson Mandela Jr.',
    email: 'mandelajr.demo@refundiq-demo.test',
    phone: '+27-011-000-014',
    location: 'Johannesburg, South Africa',
    country: 'South Africa',
    currency: 'USD',
    notes: 'Demo account - South African public figure'
  },
  {
    id: 'cust-015',
    name: 'Lupita Nyongo',
    email: 'lupita.demo@refundiq-demo.test',
    phone: '+254-020-000-015',
    location: 'Nairobi, Kenya',
    country: 'Kenya',
    currency: 'USD',
    notes: 'Demo account - Academy Award-winning actress'
  }
];

const orders = [
  // cust-001: Obasanjo - clearly eligible (damaged item, recent, under $500)
  {
    id: 'ord-001',
    customer_id: 'cust-001',
    product_name: 'Sony WH-1000XM6 Wireless Headphones',
    product_category: 'Electronics',
    amount: 349.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-01T10:30:00Z',
    delivered_at: '2026-09-05T14:00:00Z'
  },
  // cust-002: Jonathan - final sale item, ineligible
  {
    id: 'ord-002',
    customer_id: 'cust-002',
    product_name: 'Limited Edition Festival Speaker (Final Sale)',
    product_category: 'Electronics',
    amount: 199.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 1,
    ordered_at: '2026-08-15T09:00:00Z',
    delivered_at: '2026-08-20T11:30:00Z',
    notes: 'Final sale - clearance item, no returns accepted'
  },
  // cust-003: Okocha - old order, expired window
  {
    id: 'ord-003',
    customer_id: 'cust-003',
    product_name: 'Apple iPad Pro 13-inch (M4)',
    product_category: 'Electronics',
    amount: 1099.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2025-12-10T08:00:00Z',
    delivered_at: '2025-12-15T16:00:00Z'
  },
  // cust-004: Osimhen - high-value order, requires human review
  {
    id: 'ord-004',
    customer_id: 'cust-004',
    product_name: 'Samsung 85-inch Neo QLED 8K TV',
    product_category: 'Electronics',
    amount: 2499.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-10T13:00:00Z',
    delivered_at: '2026-09-14T10:00:00Z'
  },
  // cust-005: Kanu - incorrect item received
  {
    id: 'ord-005',
    customer_id: 'cust-005',
    product_name: 'MacBook Pro 14-inch M4 Pro (Space Black)',
    product_category: 'Computers',
    amount: 1999.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-05T11:00:00Z',
    delivered_at: '2026-09-09T15:30:00Z'
  },
  // cust-006: Genevieve - suspicious/contradictory request
  {
    id: 'ord-006',
    customer_id: 'cust-006',
    product_name: 'DJI Osmo Pocket 3 Camera',
    product_category: 'Photography',
    amount: 519.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-08T08:00:00Z',
    delivered_at: '2026-09-12T12:00:00Z'
  },
  // cust-007: Funke - ambiguous request
  {
    id: 'ord-007',
    customer_id: 'cust-007',
    product_name: 'Dyson V15 Detect Cordless Vacuum',
    product_category: 'Home Appliances',
    amount: 749.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-06T14:00:00Z',
    delivered_at: '2026-09-11T09:00:00Z'
  },
  // cust-008: RMD - duplicate request (two refund requests seeded)
  {
    id: 'ord-008',
    customer_id: 'cust-008',
    product_name: 'Bose QuietComfort Ultra Headphones',
    product_category: 'Electronics',
    amount: 429.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-03T10:00:00Z',
    delivered_at: '2026-09-07T13:00:00Z'
  },
  // cust-009: Femi Kuti - prompt injection attempt
  {
    id: 'ord-009',
    customer_id: 'cust-009',
    product_name: 'Yamaha P-145 Digital Piano',
    product_category: 'Musical Instruments',
    amount: 389.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-12T16:00:00Z',
    delivered_at: '2026-09-17T11:00:00Z'
  },
  // cust-010: Soyinka - eligible refund (wrong item sent)
  {
    id: 'ord-010',
    customer_id: 'cust-010',
    product_name: 'Kindle Scribe E-Reader with Premium Pen',
    product_category: 'Electronics',
    amount: 369.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-09T09:00:00Z',
    delivered_at: '2026-09-14T14:00:00Z'
  },
  // cust-011: Ronaldinho - high value + suspicious, escalation
  {
    id: 'ord-011',
    customer_id: 'cust-011',
    product_name: 'Garmin Fenix 8 Sapphire GPS Watch',
    product_category: 'Sports',
    amount: 899.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-01T07:00:00Z',
    delivered_at: '2026-09-06T16:00:00Z'
  },
  // cust-012: Drogba - change of mind request
  {
    id: 'ord-012',
    customer_id: 'cust-012',
    product_name: 'Theragun Pro Plus Massage Device',
    product_category: 'Sports Recovery',
    amount: 279.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-07T11:00:00Z',
    delivered_at: '2026-09-11T15:00:00Z'
  },
  // cust-013: Serena - AI/policy disagreement (AI says approve, policy escalates due to amount)
  {
    id: 'ord-013',
    customer_id: 'cust-013',
    product_name: 'Wilson Blade 98 v9 Tennis Racket Bundle',
    product_category: 'Sports',
    amount: 548.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-10T15:00:00Z',
    delivered_at: '2026-09-15T10:00:00Z'
  },
  // cust-014: Mandela Jr - legitimate high value escalation
  {
    id: 'ord-014',
    customer_id: 'cust-014',
    product_name: 'Dell XPS 15 Laptop (32GB RAM, 1TB SSD)',
    product_category: 'Computers',
    amount: 1299.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-08T12:00:00Z',
    delivered_at: '2026-09-13T09:00:00Z'
  },
  // cust-015: Lupita - small eligible refund
  {
    id: 'ord-015',
    customer_id: 'cust-015',
    product_name: 'Anker 737 Power Bank (24000mAh)',
    product_category: 'Electronics',
    amount: 89.99,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-09-15T09:00:00Z',
    delivered_at: '2026-09-19T14:00:00Z'
  },
  // Second order for cust-001 (Obasanjo) to show order history
  {
    id: 'ord-016',
    customer_id: 'cust-001',
    product_name: 'Apple AirPods Pro 2nd Gen',
    product_category: 'Electronics',
    amount: 249.00,
    currency: 'USD',
    status: 'delivered',
    is_final_sale: 0,
    ordered_at: '2026-07-20T10:00:00Z',
    delivered_at: '2026-07-24T12:00:00Z'
  }
];

const refundRequests = [
  // Scenario: duplicate - RMD (two requests, same order)
  {
    id: 'req-001',
    customer_id: 'cust-008',
    order_id: 'ord-008',
    customer_message: 'My Bose headphones arrived and the noise cancellation is not working at all. I tested it several times and the sound quality is terrible. I would like a refund.',
    request_type: 'damaged_product',
    status: 'approved',
    decision: 'approved',
    decision_reason: 'Damaged product claim within the return window. Refund approved.',
    refund_amount: 429.00,
    policy_result: JSON.stringify({ eligible: true, checks: ['final_sale_check:PASS', 'return_window_check:PASS (18 days)', 'duplicate_check:PASS', 'high_value_check:PASS (amount $429)', 'suspicion_check:PASS'], reason: 'All policy checks passed. Eligible for AI-assisted determination.' }),
    ai_classification: 'damaged_product',
    ai_reasoning: 'Customer describes a specific audio malfunction. Noise cancellation failure is a known defect in some units. The claim is consistent with no contradictions. Confidence: high.',
    ai_suggested_decision: 'approve',
    ai_customer_response: 'We have processed your refund of $429.00 for the Bose QuietComfort Ultra Headphones. The amount will be returned to your original payment method within 5 to 7 business days.',
    ai_flags: '[]',
    policy_ai_conflict: 0,
    created_at: '2026-09-08T10:00:00Z',
    resolved_at: '2026-09-08T10:00:03Z',
    processing_state: 'complete'
  },
  {
    id: 'req-002',
    customer_id: 'cust-008',
    order_id: 'ord-008',
    customer_message: 'I already submitted a refund request but I have not heard back. The headphones are still broken.',
    request_type: 'duplicate',
    status: 'denied',
    decision: 'denied',
    decision_reason: 'Duplicate request. A refund for this order has already been approved (req-001).',
    refund_amount: 0,
    policy_result: JSON.stringify({ eligible: false, checks: ['final_sale_check:PASS', 'return_window_check:PASS (19 days)', 'duplicate_check:FAIL'], reason: 'Duplicate refund request for order ord-008' }),
    ai_classification: 'duplicate_request',
    ai_reasoning: 'Customer acknowledges submitting a previous request. Order already has an approved refund on record.',
    ai_suggested_decision: 'deny',
    ai_customer_response: 'A refund for this order has already been approved and is being processed. If you have not received the funds yet, please allow up to 7 business days or contact your bank directly.',
    ai_flags: '["duplicate"]',
    policy_ai_conflict: 0,
    created_at: '2026-09-09T14:00:00Z',
    resolved_at: '2026-09-09T14:00:01Z',
    processing_state: 'complete'
  },
  // Scenario: old/expired order - Okocha
  {
    id: 'req-003',
    customer_id: 'cust-003',
    order_id: 'ord-003',
    customer_message: 'My iPad Pro screen has cracked on its own without any physical damage on my side. I want a full refund.',
    request_type: 'damaged_product',
    status: 'denied',
    decision: 'denied',
    decision_reason: 'Order placed on 10 Dec 2025 is outside the 90-day return window. Return window has expired.',
    refund_amount: 0,
    policy_result: JSON.stringify({ eligible: false, checks: ['final_sale_check:PASS', 'return_window_check:FAIL (289 days, limit 90)'], reason: 'Order is 289 days old. Policy allows 90 days maximum.' }),
    ai_classification: 'damaged_product',
    ai_reasoning: 'Screen cracking without physical damage is plausible as a manufacturing defect. However, the return window has expired and policy cannot approve.',
    ai_suggested_decision: 'deny',
    ai_customer_response: 'Unfortunately, your order from December 2025 is outside our 90-day return window and is no longer eligible for a refund. We recommend contacting Apple Support directly for warranty assistance on this issue.',
    ai_flags: '[]',
    policy_ai_conflict: 0,
    created_at: '2026-09-05T11:00:00Z',
    resolved_at: '2026-09-05T11:00:02Z',
    processing_state: 'complete'
  },
  // Scenario: final sale - Jonathan
  {
    id: 'req-004',
    customer_id: 'cust-002',
    order_id: 'ord-002',
    customer_message: 'The speaker I bought does not charge properly. It shuts down after 30 minutes. I need a refund.',
    request_type: 'damaged_product',
    status: 'denied',
    decision: 'denied',
    decision_reason: 'Item is marked as final sale. Final sale items are not eligible for refunds regardless of condition.',
    refund_amount: 0,
    policy_result: JSON.stringify({ eligible: false, checks: ['final_sale_check:FAIL'], reason: 'Final sale item. No refunds accepted per policy.' }),
    ai_classification: 'damaged_product',
    ai_reasoning: 'Customer describes a specific technical defect. The claim is credible. However, the item is a final sale clearance product.',
    ai_suggested_decision: 'deny',
    ai_customer_response: 'We are sorry to hear about the issue with your speaker. Unfortunately, this item was purchased as a final sale clearance product and is not eligible for returns or refunds. We recommend contacting the manufacturer directly for warranty support.',
    ai_flags: '[]',
    policy_ai_conflict: 0,
    created_at: '2026-09-03T14:00:00Z',
    resolved_at: '2026-09-03T14:00:01Z',
    processing_state: 'complete'
  },
  // Scenario: high value escalation - Osimhen
  {
    id: 'req-005',
    customer_id: 'cust-004',
    order_id: 'ord-004',
    customer_message: 'The TV was delivered but the panel has dead pixels across the left quarter of the screen. This is a manufacturing defect. I want a full refund.',
    request_type: 'damaged_product',
    status: 'escalated',
    decision: 'escalated',
    decision_reason: 'Refund amount of $2,499.99 exceeds the $500 automatic approval threshold. Requires human review.',
    refund_amount: 2499.99,
    policy_result: JSON.stringify({ eligible: true, checks: ['final_sale_check:PASS', 'return_window_check:PASS (11 days)', 'duplicate_check:PASS', 'high_value_check:ESCALATE (amount $2499.99)'], reason: 'Order is eligible but amount exceeds $500. Escalated for human review.' }),
    ai_classification: 'damaged_product',
    ai_reasoning: 'Dead pixel clusters are a known Samsung panel defect. The claim is specific and credible. Amount requires human authorization before approving.',
    ai_suggested_decision: 'escalate',
    ai_customer_response: 'Your refund request for the Samsung 85-inch TV has been escalated to our senior support team for review. A team member will contact you within 24 to 48 hours to resolve this.',
    ai_flags: '[]',
    policy_ai_conflict: 0,
    escalation_reason: 'Refund amount $2,499.99 exceeds $500 threshold',
    created_at: '2026-09-15T09:00:00Z',
    processing_state: 'complete'
  }
];

const auditEvents = [
  { id: uuidv4(), refund_request_id: 'req-001', event: 'request_received', detail: 'Refund request submitted by customer', actor: 'customer', created_at: '2026-09-08T10:00:00Z' },
  { id: uuidv4(), refund_request_id: 'req-001', event: 'policy_checked', detail: 'Policy check passed: within window, not final sale, under $500', actor: 'system', created_at: '2026-09-08T10:00:01Z' },
  { id: uuidv4(), refund_request_id: 'req-001', event: 'ai_processed', detail: 'AI classified as damaged_product, suggested approve', actor: 'ai', created_at: '2026-09-08T10:00:02Z' },
  { id: uuidv4(), refund_request_id: 'req-001', event: 'decision_made', detail: 'Decision: approved. Full refund $429.00 authorized.', actor: 'system', created_at: '2026-09-08T10:00:03Z' },

  { id: uuidv4(), refund_request_id: 'req-002', event: 'request_received', detail: 'Second refund request submitted for same order', actor: 'customer', created_at: '2026-09-09T14:00:00Z' },
  { id: uuidv4(), refund_request_id: 'req-002', event: 'policy_checked', detail: 'Duplicate detected: order ord-008 already has an approved refund (req-001)', actor: 'system', created_at: '2026-09-09T14:00:01Z' },
  { id: uuidv4(), refund_request_id: 'req-002', event: 'decision_made', detail: 'Denied: duplicate request', actor: 'system', created_at: '2026-09-09T14:00:01Z' },

  { id: uuidv4(), refund_request_id: 'req-003', event: 'request_received', detail: 'Refund request submitted', actor: 'customer', created_at: '2026-09-05T11:00:00Z' },
  { id: uuidv4(), refund_request_id: 'req-003', event: 'policy_checked', detail: 'Order too old: 289 days. Limit is 90 days.', actor: 'system', created_at: '2026-09-05T11:00:01Z' },
  { id: uuidv4(), refund_request_id: 'req-003', event: 'decision_made', detail: 'Denied: outside return window', actor: 'system', created_at: '2026-09-05T11:00:01Z' },

  { id: uuidv4(), refund_request_id: 'req-004', event: 'request_received', detail: 'Refund request submitted', actor: 'customer', created_at: '2026-09-03T14:00:00Z' },
  { id: uuidv4(), refund_request_id: 'req-004', event: 'policy_checked', detail: 'Final sale item. Ineligible for refund.', actor: 'system', created_at: '2026-09-03T14:00:01Z' },
  { id: uuidv4(), refund_request_id: 'req-004', event: 'decision_made', detail: 'Denied: final sale item', actor: 'system', created_at: '2026-09-03T14:00:01Z' },

  { id: uuidv4(), refund_request_id: 'req-005', event: 'request_received', detail: 'Refund request submitted', actor: 'customer', created_at: '2026-09-15T09:00:00Z' },
  { id: uuidv4(), refund_request_id: 'req-005', event: 'policy_checked', detail: 'Eligible but amount $2499.99 exceeds $500 threshold', actor: 'system', created_at: '2026-09-15T09:00:01Z' },
  { id: uuidv4(), refund_request_id: 'req-005', event: 'ai_processed', detail: 'AI: credible damaged product claim, suggests escalate', actor: 'ai', created_at: '2026-09-15T09:00:02Z' },
  { id: uuidv4(), refund_request_id: 'req-005', event: 'decision_made', detail: 'Escalated to human review: high-value refund', actor: 'system', created_at: '2026-09-15T09:00:03Z' }
];

function seed() {
  const db = getDb();

  const clearTables = db.transaction(() => {
    db.prepare('DELETE FROM audit_log').run();
    db.prepare('DELETE FROM refund_requests').run();
    db.prepare('DELETE FROM orders').run();
    db.prepare('DELETE FROM customers').run();
  });

  clearTables();

  const insertCustomer = db.prepare(`
    INSERT INTO customers (id, name, email, phone, location, country, currency, notes)
    VALUES (@id, @name, @email, @phone, @location, @country, @currency, @notes)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_id, product_name, product_category, amount, currency, status, is_final_sale, ordered_at, delivered_at, notes)
    VALUES (@id, @customer_id, @product_name, @product_category, @amount, @currency, @status, @is_final_sale, @ordered_at, @delivered_at, @notes)
  `);

  const insertRequest = db.prepare(`
    INSERT INTO refund_requests (
      id, customer_id, order_id, customer_message, request_type, status, decision,
      decision_reason, refund_amount, policy_result, ai_classification, ai_reasoning,
      ai_suggested_decision, ai_customer_response, ai_flags, policy_ai_conflict,
      escalation_reason, created_at, resolved_at, processing_state
    ) VALUES (
      @id, @customer_id, @order_id, @customer_message, @request_type, @status, @decision,
      @decision_reason, @refund_amount, @policy_result, @ai_classification, @ai_reasoning,
      @ai_suggested_decision, @ai_customer_response, @ai_flags, @policy_ai_conflict,
      @escalation_reason, @created_at, @resolved_at, @processing_state
    )
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (id, refund_request_id, event, detail, actor, created_at)
    VALUES (@id, @refund_request_id, @event, @detail, @actor, @created_at)
  `);

  const seedAll = db.transaction(() => {
    for (const c of customers) {
      insertCustomer.run({ notes: null, ...c });
    }
    for (const o of orders) {
      insertOrder.run({ notes: null, ...o });
    }
    for (const r of refundRequests) {
      insertRequest.run({
        escalation_reason: null,
        resolved_at: null,
        agent_notes: null,
        ...r
      });
    }
    for (const a of auditEvents) {
      insertAudit.run(a);
    }

    db.prepare(`
      UPDATE customers SET total_orders = (
        SELECT COUNT(*) FROM orders WHERE orders.customer_id = customers.id
      )
    `).run();
  });

  seedAll();

  console.log(`Seeded: ${customers.length} customers, ${orders.length} orders, ${refundRequests.length} refund requests, ${auditEvents.length} audit events`);
  process.exit(0);
}

seed();

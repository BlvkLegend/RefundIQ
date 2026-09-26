const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/refundiq.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      location TEXT,
      country TEXT DEFAULT 'Nigeria',
      currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now')),
      total_orders INTEGER DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      product_name TEXT NOT NULL,
      product_category TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'delivered',
      is_final_sale INTEGER DEFAULT 0,
      ordered_at TEXT NOT NULL,
      delivered_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS refund_requests (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id),
      order_id TEXT NOT NULL REFERENCES orders(id),
      customer_message TEXT NOT NULL,
      request_type TEXT,
      status TEXT DEFAULT 'pending',
      decision TEXT,
      decision_reason TEXT,
      refund_amount REAL,
      policy_result TEXT,
      ai_classification TEXT,
      ai_reasoning TEXT,
      ai_suggested_decision TEXT,
      ai_customer_response TEXT,
      ai_flags TEXT,
      policy_ai_conflict INTEGER DEFAULT 0,
      escalation_reason TEXT,
      agent_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      processing_state TEXT DEFAULT 'idle'
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      refund_request_id TEXT NOT NULL REFERENCES refund_requests(id),
      event TEXT NOT NULL,
      detail TEXT,
      actor TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_customer ON refund_requests(customer_id);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
    CREATE INDEX IF NOT EXISTS idx_audit_refund ON audit_log(refund_request_id);
  `);
}

module.exports = { getDb };

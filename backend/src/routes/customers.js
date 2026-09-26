const express = require('express');
const router = express.Router();
const { getCustomer, getCustomerOrders } = require('../services/refundService');
const { getDb } = require('../db/schema');

// GET /api/customers - list all customers (for dropdown)
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const customers = db.prepare(
      'SELECT id, name, email, location, country, total_orders FROM customers ORDER BY name ASC'
    ).all();
    res.json(customers);
  } catch (err) {
    console.error('[GET /customers]', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// GET /api/customers/:id - customer detail + orders
router.get('/:id', (req, res) => {
  try {
    const customer = getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const orders = getCustomerOrders(customer.id);
    res.json({ ...customer, orders });
  } catch (err) {
    console.error('[GET /customers/:id]', err);
    res.status(500).json({ error: 'Failed to fetch customer.' });
  }
});

module.exports = router;

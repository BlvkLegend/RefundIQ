import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatMoney, formatDate, cn } from '../lib/utils';

function OrderCard({ order, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(order)}
      className={cn(
        'w-full text-left px-4 py-3.5 rounded-xl border transition-colors',
        selected
          ? 'border-accent bg-accent-bg'
          : 'border-border-subtle bg-surface-1 hover:border-border-default hover:bg-surface-2'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            'mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            selected ? 'bg-accent' : 'bg-surface-3'
          )}>
            <i className={`ti ti-package ${selected ? 'text-white' : 'text-text-muted'}`} style={{ fontSize: '16px' }} />
          </div>
          <div className="min-w-0">
            <p className="text-text-primary text-sm font-semibold leading-snug">{order.product_name}</p>
            <p className="text-text-muted text-xs mt-0.5">
              {order.id} &middot; Delivered {formatDate(order.delivered_at)}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-text-primary text-sm font-bold">{formatMoney(order.amount, order.currency)}</p>
          {order.is_final_sale && (
            <span className="text-2xs text-accent font-semibold">Final sale</span>
          )}
        </div>
      </div>
    </button>
  );
}

function DecisionPanel({ result }) {
  const config = {
    approved: {
      icon: 'ti-circle-check',
      iconColor: 'text-status-approved-text',
      border: 'border-status-approved bg-status-approved',
      title: 'Refund Approved',
    },
    denied: {
      icon: 'ti-circle-x',
      iconColor: 'text-status-denied-text',
      border: 'border-status-denied bg-status-denied',
      title: 'Refund Not Eligible',
    },
    escalated: {
      icon: 'ti-alert-triangle',
      iconColor: 'text-status-escalated-text',
      border: 'border-status-escalated bg-status-escalated',
      title: 'Request Under Review',
    },
  };

  const c = config[result.status] || config.escalated;

  return (
    <div className={cn('rounded-xl border p-4 sm:p-5 mt-6', c.border)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0">
          <i className={`ti ${c.icon} ${c.iconColor}`} style={{ fontSize: '22px' }} />
        </div>
        <div>
          <h3 className="text-text-primary font-bold text-base">{c.title}</h3>
          <StatusBadge status={result.status} />
        </div>
      </div>

      {result.ai_customer_response && (
        <div className="bg-surface-0 rounded-lg px-4 py-3 mb-4 border border-border-subtle">
          <p className="text-text-secondary text-sm leading-relaxed">
            {result.ai_customer_response}
          </p>
        </div>
      )}

      {result.status === 'approved' && result.refund_amount > 0 && (
        <div className="inline-flex items-center gap-3 bg-surface-2 rounded-lg px-4 py-2.5 mb-4">
          <i className="ti ti-currency-dollar text-status-approved-text" style={{ fontSize: '18px' }} />
          <div>
            <p className="text-text-muted text-xs">Refund amount</p>
            <p className="text-status-approved-text font-bold text-lg leading-tight">
              {formatMoney(result.refund_amount, result.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3 flex-wrap">
        <p className="text-text-muted text-xs break-all">
          Request ID: <span className="font-mono text-text-secondary">{result.id}</span>
        </p>
        <Link
          to={`/requests/${result.id}`}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-light font-medium transition-colors whitespace-nowrap"
        >
          View full details
          <i className="ti ti-arrow-up-right" style={{ fontSize: '13px' }} />
        </Link>
      </div>
    </div>
  );
}

export function SubmitRequest() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  async function handleCustomerChange(e) {
    const id = e.target.value;
    if (!id) {
      setSelectedCustomer(null);
      setCustomerOrders([]);
      setSelectedOrder(null);
      return;
    }
    setLoadingCustomer(true);
    try {
      const data = await api.getCustomer(id);
      setSelectedCustomer(data);
      setCustomerOrders(data.orders || []);
      setSelectedOrder(null);
      setResult(null);
      setError(null);
    } catch {
      setError('Could not load customer data. Please try again.');
    } finally {
      setLoadingCustomer(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCustomer || !selectedOrder || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.submitRefundRequest({
        customerId: selectedCustomer.id,
        orderId: selectedOrder.id,
        customerMessage: message.trim()
      });
      setResult(data);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Your request could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = selectedCustomer && selectedOrder && message.trim().length >= 10 && !submitting;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-text-primary text-xl sm:text-2xl font-bold">Submit Refund Request</h1>
        <p className="text-text-muted text-sm mt-1">
          Choose a customer account, select the order, and describe the issue clearly.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Customer */}
        <div>
          <label className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-2">
            <i className="ti ti-user" style={{ fontSize: '15px' }} />
            Customer account
          </label>
          <select
            onChange={handleCustomerChange}
            defaultValue=""
            className="w-full px-3 py-2.5 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
          >
            <option value="" disabled>Select a customer account</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
            ))}
          </select>
        </div>

        {/* Customer info */}
        {selectedCustomer && (
          <div className="px-4 py-3.5 bg-surface-1 border border-border-subtle rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center flex-shrink-0">
                  <i className="ti ti-user text-text-muted" style={{ fontSize: '17px' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-text-primary font-semibold">{selectedCustomer.name}</p>
                  <p className="text-text-muted text-xs mt-0.5 break-all">{selectedCustomer.email}</p>
                  <p className="text-text-muted text-xs">{selectedCustomer.location}, {selectedCustomer.country}</p>
                </div>
              </div>
              <span className="text-text-muted text-xs bg-surface-2 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                {selectedCustomer.total_orders} order{selectedCustomer.total_orders !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Order */}
        {selectedCustomer && (
          <div>
            <label className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-2">
              <i className="ti ti-package" style={{ fontSize: '15px' }} />
              Select order
            </label>
            {loadingCustomer ? (
              <div className="flex items-center gap-2 text-text-muted text-sm py-3">
                <i className="ti ti-loader-2 animate-spin" style={{ fontSize: '16px' }} />
                Loading orders...
              </div>
            ) : customerOrders.length === 0 ? (
              <p className="text-text-muted text-sm py-2">No orders found for this customer.</p>
            ) : (
              <div className="space-y-2">
                {customerOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    selected={selectedOrder?.id === order.id}
                    onSelect={setSelectedOrder}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Message */}
        {selectedOrder && (
          <div>
            <label className="flex items-center gap-2 text-text-secondary text-sm font-semibold mb-2">
              <i className="ti ti-message" style={{ fontSize: '15px' }} />
              Describe the issue
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe clearly what went wrong with your order. The more detail you provide, the faster we can process your request."
              rows={5}
              maxLength={3000}
              className="w-full px-3 py-3 bg-surface-1 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-text-muted text-xs">Be specific about the exact problem you experienced.</p>
              <p className="text-text-muted text-xs">{message.length}/3000</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-status-denied border border-status-denied text-status-denied-text text-sm">
            <i className="ti ti-alert-circle flex-shrink-0 mt-0.5" style={{ fontSize: '16px' }} />
            {error}
          </div>
        )}

        {/* Submit */}
        {selectedOrder && (
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
              canSubmit
                ? 'bg-accent hover:bg-accent-light text-white shadow-sm'
                : 'bg-surface-3 text-text-muted cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <i className="ti ti-loader-2 animate-spin" style={{ fontSize: '16px' }} />
                Processing your request...
              </>
            ) : (
              <>
                <i className="ti ti-send" style={{ fontSize: '16px' }} />
                Submit Refund Request
              </>
            )}
          </button>
        )}
      </form>

      {result && <DecisionPanel result={result} />}
    </div>
  );
}

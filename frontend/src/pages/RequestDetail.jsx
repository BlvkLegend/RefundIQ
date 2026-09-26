import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime, formatDate, formatMoney, classificationLabel, cn } from '../lib/utils';

function Section({ title, iconClass, children, className }) {
  return (
    <div className={cn('border border-border-subtle rounded-xl overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-1 flex items-center gap-2">
        <i className={`ti ${iconClass} text-text-muted`} style={{ fontSize: '15px' }} />
        <h3 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, accent }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border-subtle last:border-0">
      <span className="text-text-muted text-xs flex-shrink-0 pt-0.5 min-w-[80px]">{label}</span>
      <span className={cn(
        'text-xs text-right break-all leading-relaxed',
        mono ? 'font-mono text-text-secondary' : 'text-text-primary',
        accent ? 'text-accent-light font-bold' : ''
      )}>
        {value ?? 'N/A'}
      </span>
    </div>
  );
}

function AuditEvent({ event }) {
  const actorConfig = {
    customer: { icon: 'ti-user',     color: 'text-status-pending-text' },
    ai:       { icon: 'ti-brain',    color: 'text-accent' },
    system:   { icon: 'ti-settings', color: 'text-text-muted' },
    agent:    { icon: 'ti-headset',  color: 'text-status-approved-text' },
  };
  const cfg = actorConfig[event.actor] || actorConfig.system;

  return (
    <div className="flex gap-3 py-3 border-b border-border-subtle last:border-0">
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center mt-0.5">
        <i className={`ti ${cfg.icon} ${cfg.color}`} style={{ fontSize: '13px' }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-text-primary text-xs font-semibold capitalize">
            {event.event.replace(/_/g, ' ')}
          </span>
          <span className={cn('text-2xs uppercase font-bold px-1.5 py-0.5 rounded bg-surface-2', cfg.color)}>
            {event.actor}
          </span>
        </div>
        {event.detail && (
          <p className="text-text-secondary text-xs leading-relaxed break-words">{event.detail}</p>
        )}
        <p className="text-text-muted text-2xs mt-1">{formatDateTime(event.created_at)}</p>
      </div>
    </div>
  );
}

export function RequestDetail() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentNotes, setAgentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [req, trail] = await Promise.all([
          api.getRefundRequest(id),
          api.getRefundRequestAudit(id)
        ]);
        setRequest(req);
        setAudit(trail);
        setAgentNotes(req.agent_notes || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function saveNotes() {
    setSaving(true);
    try {
      const updated = await api.updateRefundRequest(id, { agentNotes });
      setRequest(updated);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function manualResolve(decision) {
    if (!window.confirm(`Mark this request as "${decision}"? This action cannot be undone.`)) return;
    setResolving(decision);
    try {
      const updated = await api.updateRefundRequest(id, { decision });
      const trail = await api.getRefundRequestAudit(id);
      setRequest(updated);
      setAudit(trail);
    } catch (e) {
      alert(e.message);
    } finally {
      setResolving(null);
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-text-muted">
      <i className="ti ti-loader-2 animate-spin" style={{ fontSize: '20px' }} />
      <span>Loading request details...</span>
    </div>
  );
  if (error) return (
    <div className="p-6 flex items-center gap-3 text-status-denied-text">
      <i className="ti ti-alert-circle" style={{ fontSize: '20px' }} />
      <span>{error}</span>
    </div>
  );
  if (!request) return null;

  let policyChecks = [];
  let aiFlags = [];
  try { policyChecks = JSON.parse(request.policy_result || '{}').checks || []; } catch {}
  try { aiFlags = JSON.parse(request.ai_flags || '[]'); } catch {}

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-text-muted text-sm hover:text-text-primary transition-colors mb-4 font-medium"
        >
          <i className="ti ti-arrow-left" style={{ fontSize: '15px' }} />
          Back to dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-text-primary text-xl sm:text-2xl font-bold">Refund Request</h1>
              <StatusBadge status={request.status} />
              {request.policy_ai_conflict ? (
                <div className="flex items-center gap-1.5 text-accent text-xs font-semibold bg-accent-bg px-2 py-1 rounded-lg border border-accent-dim">
                  <i className="ti ti-alert-triangle" style={{ fontSize: '12px' }} />
                  Policy vs AI conflict
                </div>
              ) : null}
            </div>
            <p className="text-text-muted text-xs font-mono break-all">{request.id}</p>
          </div>
          {request.status === 'approved' && request.refund_amount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-1 border border-status-approved rounded-xl flex-shrink-0">
              <i className="ti ti-currency-dollar text-status-approved-text" style={{ fontSize: '22px' }} />
              <div>
                <p className="text-text-muted text-xs">Refund amount</p>
                <p className="text-status-approved-text font-bold text-xl leading-tight">
                  {formatMoney(request.refund_amount, request.currency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column on lg, single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left / main column */}
        <div className="lg:col-span-2 space-y-4">

          <Section title="Customer message" iconClass="ti-message-circle">
            <div className="bg-surface-0 border border-border-subtle rounded-lg px-4 py-3">
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap break-words">
                {request.customer_message}
              </p>
            </div>
          </Section>

          <Section title="AI analysis" iconClass="ti-brain">
            <div className="space-y-3">
              <Row label="Classification" value={classificationLabel(request.ai_classification)} />
              <Row label="AI recommendation" value={request.ai_suggested_decision || 'N/A'} />
              <Row label="Confidence" value={request.ai_confidence || 'N/A'} />

              {request.policy_ai_conflict ? (
                <div className="flex items-start gap-3 px-3 py-3 bg-accent-bg border border-accent-dim rounded-lg">
                  <i className="ti ti-alert-triangle text-accent flex-shrink-0 mt-0.5" style={{ fontSize: '15px' }} />
                  <p className="text-accent text-xs leading-relaxed">
                    The AI recommended "{request.ai_suggested_decision}" but the refund policy overrode this decision. Policy always takes precedence.
                  </p>
                </div>
              ) : null}

              {request.ai_reasoning && (
                <div className="pt-2">
                  <p className="text-text-muted text-2xs uppercase tracking-wider mb-2 font-semibold">Agent reasoning (internal)</p>
                  <p className="text-text-secondary text-xs leading-relaxed bg-surface-0 border border-border-subtle px-3 py-2.5 rounded-lg break-words">
                    {request.ai_reasoning}
                  </p>
                </div>
              )}

              {aiFlags.length > 0 && (
                <div className="pt-1">
                  <p className="text-text-muted text-2xs uppercase tracking-wider mb-2 font-semibold">Flags detected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiFlags.map(f => (
                      <span key={f} className="px-2 py-1 rounded-lg bg-surface-3 text-text-secondary text-2xs font-mono border border-border-subtle">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {request.ai_customer_response && (
                <div className="pt-1">
                  <p className="text-text-muted text-2xs uppercase tracking-wider mb-2 font-semibold">Response sent to customer</p>
                  <div className="bg-surface-0 border border-border-subtle rounded-lg px-3 py-2.5">
                    <p className="text-text-secondary text-xs leading-relaxed break-words">
                      {request.ai_customer_response}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title="Policy evaluation" iconClass="ti-shield-check">
            <div className="space-y-2">
              {policyChecks.length === 0 ? (
                <p className="text-text-muted text-xs">No policy data available for this request.</p>
              ) : policyChecks.map((check, i) => {
                const pass = check.includes(':PASS');
                const fail = check.includes(':FAIL');
                return (
                  <div key={i} className="flex items-start gap-2.5 py-0.5">
                    <i
                      className={cn(
                        'ti flex-shrink-0 mt-0.5',
                        pass ? 'ti-circle-check text-status-approved-text'
                          : fail ? 'ti-circle-x text-status-denied-text'
                          : 'ti-alert-triangle text-status-escalated-text'
                      )}
                      style={{ fontSize: '15px' }}
                    />
                    <span className="text-text-secondary text-xs font-mono break-all">{check}</span>
                  </div>
                );
              })}
            </div>
            {request.decision_reason && (
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-text-muted text-2xs uppercase tracking-wider mb-2 font-semibold">Decision reason</p>
                <p className="text-text-secondary text-sm leading-relaxed">{request.decision_reason}</p>
              </div>
            )}
          </Section>

          <Section title="Agent notes" iconClass="ti-notes">
            <textarea
              value={agentNotes}
              onChange={e => setAgentNotes(e.target.value)}
              placeholder="Add internal notes for your team..."
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            />
            <button
              onClick={saveNotes}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border-default text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 font-medium transition-colors disabled:opacity-50"
            >
              <i className="ti ti-device-floppy" style={{ fontSize: '14px' }} />
              {saving ? 'Saving...' : 'Save notes'}
            </button>
          </Section>

          {request.status === 'escalated' && (
            <div className="flex flex-col sm:flex-row items-start gap-4 px-4 py-4 bg-surface-1 border border-status-escalated rounded-xl">
              <i className="ti ti-clock text-status-escalated-text flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }} />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-semibold mb-1">Manual review required</p>
                <p className="text-status-escalated-text text-xs mb-3 leading-relaxed">
                  {request.escalation_reason || 'This request has been flagged for human review before a decision is made.'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => manualResolve('approved')}
                    disabled={!!resolving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-status-approved border border-status-approved text-status-approved-text text-sm font-semibold hover:brightness-125 disabled:opacity-50 transition-all"
                  >
                    <i className="ti ti-circle-check" style={{ fontSize: '15px' }} />
                    {resolving === 'approved' ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => manualResolve('denied')}
                    disabled={!!resolving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-status-denied border border-status-denied text-status-denied-text text-sm font-semibold hover:brightness-125 disabled:opacity-50 transition-all"
                  >
                    <i className="ti ti-circle-x" style={{ fontSize: '15px' }} />
                    {resolving === 'denied' ? 'Denying...' : 'Deny'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right / sidebar column - stacks below on mobile */}
        <div className="space-y-4">
          <Section title="Customer" iconClass="ti-user">
            <Row label="Name" value={request.customer_name} />
            <Row label="Email" value={request.customer_email} mono />
            <Row label="Location" value={`${request.customer_location}, ${request.customer_country}`} />
          </Section>

          <Section title="Order" iconClass="ti-package">
            <Row label="Order ID" value={request.order_id} mono />
            <Row label="Product" value={request.product_name} />
            <Row label="Category" value={request.product_category} />
            <Row label="Order value" value={formatMoney(request.order_amount, request.currency)} accent />
            <Row label="Final sale" value={request.is_final_sale ? 'Yes - not eligible' : 'No'} />
            <Row label="Ordered" value={formatDate(request.ordered_at)} />
            <Row label="Delivered" value={formatDate(request.delivered_at)} />
          </Section>

          <Section title="Timeline" iconClass="ti-calendar">
            <Row label="Submitted" value={formatDateTime(request.created_at)} />
            <Row label="Resolved" value={formatDateTime(request.resolved_at)} />
            <Row label="State" value={request.processing_state} mono />
          </Section>

          <Section title="Audit trail" iconClass="ti-list-check">
            {audit.length === 0 ? (
              <p className="text-text-muted text-xs">No events recorded yet.</p>
            ) : (
              <div>{audit.map(ev => <AuditEvent key={ev.id} event={ev} />)}</div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

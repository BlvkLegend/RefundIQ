export function formatDate(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(iso) {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatMoney(amount, currency = 'USD') {
  if (amount == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2
  }).format(amount);
}

export function statusLabel(status) {
  const map = {
    approved: 'Approved',
    denied: 'Denied',
    escalated: 'Escalated',
    pending: 'Pending',
    processing: 'Processing'
  };
  return map[status] || status;
}

export function classificationLabel(c) {
  const map = {
    change_of_mind: 'Change of mind',
    damaged_product: 'Damaged product',
    incorrect_item: 'Incorrect item',
    missing_item: 'Missing item',
    quality_issue: 'Quality issue',
    duplicate_request: 'Duplicate request',
    fraudulent: 'Potentially fraudulent',
    prompt_injection_attempt: 'Security flag',
    ambiguous: 'Unclear request',
    other: 'Other',
    unavailable: 'AI unavailable'
  };
  return map[c] || c || 'Unclassified';
}

export function daysSince(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Mock AI Provider
 *
 * Produces realistic structured refund analysis without any API key.
 * Used as the default provider in demo mode and when no API key is set.
 * Responses are deterministic based on the customer message content.
 */

const INJECTION_PATTERNS = [
  /ignore (the |all |your )?(previous |above |system |policy |refund )/i,
  /you are now (an )?(admin|root|superuser|manager)/i,
  /override (the |all |this )?policy/i,
  /forget (your |all |previous |the )?instructions/i,
  /disregard (your |the |all )?rules/i,
  /as (an |a )?admin/i,
  /grant (this |a |the )?refund/i,
  /bypass/i,
  /you are a (helpful )?(assistant|bot|ai) without/i,
  /new (persona|role|identity|instructions)/i,
];

function detectInjection(text) {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

const DAMAGE_KEYWORDS = ['broken', 'cracked', 'damaged', 'defect', 'not working', 'stopped working',
  'dead', 'faulty', 'malfunction', 'shattered', 'dead pixel', 'won\'t turn on', 'won\'t charge',
  'overheating', 'screen problem', 'battery'];

const WRONG_ITEM_KEYWORDS = ['wrong item', 'wrong size', 'wrong model', 'wrong colour', 'wrong color',
  'not what i ordered', 'received the wrong', 'different product', 'incorrect item', 'not the right'];

const MISSING_KEYWORDS = ['never arrived', 'never received', 'not delivered', 'missing', 'lost in transit',
  'tracking shows delivered but', 'did not receive'];

const QUALITY_KEYWORDS = ['poor quality', 'low quality', 'bad quality', 'not as described', 'misleading',
  'looks different', 'cheap', 'flimsy', 'disappointed'];

const CHANGE_MIND_KEYWORDS = ['changed my mind', 'no longer need', 'don\'t want', 'bought by mistake',
  'ordered by mistake', 'wrong purchase', 'found a better', 'found it cheaper'];

const DUPLICATE_KEYWORDS = ['already submitted', 'submitted before', 'second request', 'previous request',
  'already applied', 'applied again'];

function classify(message) {
  const lower = message.toLowerCase();

  if (detectInjection(message)) return 'prompt_injection_attempt';
  if (DUPLICATE_KEYWORDS.some(k => lower.includes(k))) return 'duplicate_request';
  if (MISSING_KEYWORDS.some(k => lower.includes(k))) return 'missing_item';
  if (WRONG_ITEM_KEYWORDS.some(k => lower.includes(k))) return 'incorrect_item';
  if (DAMAGE_KEYWORDS.some(k => lower.includes(k))) return 'damaged_product';
  if (QUALITY_KEYWORDS.some(k => lower.includes(k))) return 'quality_issue';
  if (CHANGE_MIND_KEYWORDS.some(k => lower.includes(k))) return 'change_of_mind';

  // Check for vague/ambiguous
  if (lower.length < 30 || lower.split(' ').length < 6) return 'ambiguous';

  return 'other';
}

function getFlags(message, classification) {
  const flags = [];
  const lower = message.toLowerCase();

  if (classification === 'prompt_injection_attempt') {
    flags.push('prompt_injection_attempt', 'suspicious');
    return flags;
  }

  // Contradiction: claims damage but also says "works fine"
  if (DAMAGE_KEYWORDS.some(k => lower.includes(k)) && lower.includes('works fine')) {
    flags.push('contradictory');
  }

  // Suspicious: demanding exact dollar amounts or threatening
  if (/i (will|want|demand|need) (the )?\$([\d,]+)/.test(lower) && lower.includes('or i')) {
    flags.push('suspicious');
  }

  // Ambiguous: very short or unclear
  if (lower.split(' ').length < 6) {
    flags.push('ambiguous');
  }

  if (classification === 'ambiguous') {
    flags.push('ambiguous');
  }

  return flags;
}

function getConfidence(classification, flags) {
  if (flags.includes('prompt_injection_attempt')) return 'high';
  if (flags.includes('contradictory') || flags.includes('ambiguous')) return 'low';
  if (['damaged_product', 'incorrect_item', 'missing_item'].includes(classification)) return 'high';
  if (['quality_issue', 'duplicate_request'].includes(classification)) return 'medium';
  return 'medium';
}

function suggestDecision(classification, flags, orderAmount) {
  if (flags.includes('prompt_injection_attempt') || flags.includes('suspicious')) return 'escalate';
  if (flags.includes('contradictory')) return 'escalate';

  if (classification === 'prompt_injection_attempt') return 'escalate';
  if (classification === 'duplicate_request') return 'deny';
  if (classification === 'ambiguous') return 'escalate';

  if (['damaged_product', 'incorrect_item', 'missing_item'].includes(classification)) {
    return orderAmount > 500 ? 'escalate' : 'approve';
  }

  if (classification === 'quality_issue') return 'approve';
  if (classification === 'change_of_mind') return 'deny';

  return 'escalate';
}

function extractIssue(message, classification) {
  const lower = message.toLowerCase();
  const truncated = message.slice(0, 120);

  const issueMap = {
    damaged_product: `Customer reports product arrived in a damaged or non-functional state: "${truncated}"`,
    incorrect_item: `Customer received the wrong item or wrong variant: "${truncated}"`,
    missing_item: `Customer states the item was not received: "${truncated}"`,
    quality_issue: `Customer is dissatisfied with product quality: "${truncated}"`,
    change_of_mind: `Customer no longer wants the item: "${truncated}"`,
    duplicate_request: `Customer is submitting a repeat refund request for the same order`,
    prompt_injection_attempt: `Message contains text attempting to override system instructions`,
    ambiguous: `Request is unclear or lacks sufficient detail to classify`,
    other: `General refund request: "${truncated}"`
  };

  return issueMap[classification] || truncated;
}

function buildReasoning(classification, flags, orderAmount, productName) {
  const parts = [];

  if (classification === 'prompt_injection_attempt') {
    parts.push('The customer message contains language attempting to override system instructions or claim elevated permissions.');
    parts.push('This is flagged as a potential prompt injection attempt and must be escalated regardless of the stated issue.');
    return parts.join(' ');
  }

  if (classification === 'damaged_product') {
    parts.push(`Customer describes a specific product defect with the ${productName}.`);
    parts.push(flags.includes('contradictory')
      ? 'However, the message contains contradictory information that reduces confidence in the claim.'
      : 'The claim is specific and consistent with no evident contradictions.');
    if (orderAmount > 500) parts.push('High-value item requires manual review before approving.');
  } else if (classification === 'incorrect_item') {
    parts.push(`Customer reports receiving the wrong product or variant instead of the ${productName}.`);
    parts.push('This warrants investigation with fulfilment records before approving.');
  } else if (classification === 'missing_item') {
    parts.push(`Customer states the ${productName} was not received.`);
    parts.push('Delivery confirmation and tracking data should be verified before approving.');
  } else if (classification === 'change_of_mind') {
    parts.push(`Customer indicates they no longer want the ${productName}.`);
    parts.push('Change of mind alone does not constitute grounds for an automatic refund under policy.');
  } else if (classification === 'duplicate_request') {
    parts.push('Customer acknowledges submitting a previous request for this order.');
    parts.push('A duplicate check should be run against existing refund records before proceeding.');
  } else if (classification === 'ambiguous') {
    parts.push('The request lacks sufficient detail to determine the nature of the issue.');
    parts.push('Escalating for a support agent to follow up with the customer directly.');
  } else {
    parts.push(`Request does not clearly fall into a standard refund category for the ${productName}.`);
    parts.push('Escalating for manual review.');
  }

  return parts.join(' ');
}

function buildCustomerResponse(classification, decision, productName, flags) {
  if (flags.includes('prompt_injection_attempt')) {
    return 'Thank you for contacting us. Your request has been received and will be reviewed by our support team. We will be in touch within 24 to 48 hours.';
  }

  if (decision === 'approve') {
    const responses = {
      damaged_product: `We are sorry to hear about the issue with your ${productName}. After reviewing your request, we have approved a full refund. The amount will be returned to your original payment method within 5 to 7 business days.`,
      incorrect_item: `We apologise for sending the wrong item. Your refund for the ${productName} order has been approved and will be processed within 5 to 7 business days.`,
      missing_item: `We are sorry your order did not arrive as expected. Your refund has been approved and will be processed within 5 to 7 business days.`,
      quality_issue: `Thank you for letting us know about the quality concern with your ${productName}. We have approved your refund. The amount will be returned within 5 to 7 business days.`,
      other: `Your refund request has been reviewed and approved. The amount will be returned to your original payment method within 5 to 7 business days.`
    };
    return responses[classification] || responses.other;
  }

  if (decision === 'deny') {
    const responses = {
      change_of_mind: `Thank you for reaching out. Unfortunately, we are unable to process a refund for a change of mind on the ${productName} at this time. Please review our returns policy for further details.`,
      duplicate_request: `It looks like a refund request for this order has already been submitted and is being processed. Please allow 5 to 7 business days for the funds to appear. Contact us if you have not received them after that period.`,
      other: `Thank you for contacting us. Unfortunately, we are unable to approve a refund for this order at this time. If you have additional information or believe this decision is incorrect, please contact our support team directly.`
    };
    return responses[classification] || responses.other;
  }

  // Escalate
  return `Thank you for reaching out about your ${productName} order. Your request has been forwarded to our senior support team for review. A team member will contact you within 24 to 48 hours with an update.`;
}

/**
 * Analyze a refund request using the mock provider.
 * Returns the same shape as the real AI provider.
 */
async function analyzeWithMock({ customerMessage, productName, productCategory, orderAmount, customerName }) {
  // Simulate realistic processing delay
  await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

  const classification = classify(customerMessage);
  const flags = getFlags(customerMessage, classification);
  const confidence = getConfidence(classification, flags);
  const suggested_decision = suggestDecision(classification, flags, orderAmount);

  return {
    error: false,
    classification,
    confidence,
    extracted_issue: extractIssue(customerMessage, classification),
    flags,
    suggested_decision,
    reasoning: buildReasoning(classification, flags, orderAmount, productName),
    customer_response: buildCustomerResponse(classification, suggested_decision, productName, flags)
  };
}

module.exports = { analyzeWithMock };

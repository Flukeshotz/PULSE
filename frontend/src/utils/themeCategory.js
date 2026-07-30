// Lightweight cross-app theme categorization. Each product's themes are
// LLM-generated independently, so there's no shared taxonomy to join on —
// this keyword match over theme_id/name buckets them into categories that
// are comparable across apps, so we can answer "who else has this problem?"
const CATEGORIES = [
  { id: 'support', label: 'Customer Support', keywords: ['support', 'service', 'escalat', 'callback', 'customer_care', 'customer care'] },
  { id: 'stability', label: 'App Stability & Performance', keywords: ['crash', 'glitch', 'freeze', 'slow', 'lag', 'performance', 'unresponsive', 'bug', 'buffering'] },
  { id: 'fees', label: 'Fees & Charges', keywords: ['brokerage', 'charge', 'fee', 'cost', 'expensive'] },
  { id: 'fulfillment', label: 'Withdrawals & Fulfillment', keywords: ['withdraw', 'refund', 'fd_', 'fd ', 'payout', 'disburs', 'fund'] },
  { id: 'kyc', label: 'KYC & Onboarding', keywords: ['kyc', 'verification', 'onboard', 'account_open', 'account opening'] },
  { id: 'ux', label: 'UI / UX', keywords: ['ui_', 'ux', 'interface', 'cluttered', 'confusing', 'design'] },
];

export function categorizeTheme(themeId, name) {
  const haystack = `${themeId || ''} ${name || ''}`.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(k => haystack.includes(k))) return cat;
  }
  return { id: 'other', label: 'Other' };
}

export const CATEGORY_ORDER = CATEGORIES.map(c => ({ id: c.id, label: c.label }));

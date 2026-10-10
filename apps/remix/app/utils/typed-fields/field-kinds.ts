/**
 * (10-08) what each box on a agreement IS, so the signing page opens the right editor for it instead
 * of a generic "Enter Text" box. The box's key travels as `fieldMeta.label` (set by the template builder and kept
 * on prefill by the sender). Values must match what the sending system fills in exactly.
 */

export type FieldKind =
  | 'personName'
  | 'title'
  | 'email'
  | 'phone'
  | 'address'
  | 'businessName'
  | 'businessType'
  | 'state'
  | 'ein'
  | 'entityLine'
  | 'text';

export type FieldKindInfo = {
  kind: FieldKind;
  /** Dialog title the signer sees. */
  title: string;
  /** One line under the title. */
  help: string;
};

const K = (kind: FieldKind, title: string, help: string): FieldKindInfo => ({ kind, title, help });

export const FIELD_KINDS: Record<string, FieldKindInfo> = {
  rep_name: K('personName', 'Your full name', 'Your legal name, as it should appear on this agreement.'),
  signer_name: K('personName', 'Your full name', 'Your legal name, as it should appear on this agreement.'),
  company_signer_name: K('personName', 'Full name', 'The legal name of the person signing for the company.'),
  rep_title: K('title', 'Your title', 'Your title at your business — for example Owner, President or Managing Member.'),
  signer_title: K(
    'title',
    'Your title',
    'Your title at your business — for example Owner, President or Managing Member.',
  ),
  company_signer_title: K('title', 'Title', 'The title of the person signing for the company.'),
  rep_email: K('email', 'Your email', 'The email address we should use to reach you.'),
  signer_email: K('email', 'Your email', 'The email address we should use to reach you.'),
  rep_phone: K('phone', 'Your phone number', 'The best number to reach you.'),
  business_address: K('address', 'Your business address', 'Where your business is located.'),
  signer_address: K('address', 'Your business address', 'Where your business is located.'),
  entity_name: K('businessName', 'Legal business name', 'Exactly as registered with the state, including LLC / Inc.'),
  signer_business: K(
    'businessName',
    'Legal business name',
    'Exactly as registered with the state, including LLC / Inc.',
  ),
  trade_name: K(
    'businessName',
    'Trade name (DBA)',
    'The name you do business under, if different. Leave blank if none.',
  ),
  entity_type: K('businessType', 'Business type', 'How your business is set up.'),
  entity_state: K('state', 'State registered', 'The state where your business is registered.'),
  ein: K(
    'ein',
    'Employer Identification Number (EIN)',
    'Your business tax ID — 9 digits, like 12-3456789. Never stored.',
  ),
  entity_line: K('entityLine', 'Business', 'Built from your business name, type and state.'),
};

/** The kind for a box, from its label. Unknown / unlabeled boxes get a plain text editor with a sensible title. */
export function fieldKindFor(label: string | null | undefined): FieldKindInfo {
  const key = (label ?? '').trim();
  if (FIELD_KINDS[key]) {
    return FIELD_KINDS[key];
  }
  // A label that isn't one of our keys is a human title the template author typed — show it as-is.
  if (key && !/^[a-z0-9_@]+$/.test(key)) {
    return K('text', key, 'Type your answer.');
  }
  return K('text', 'Your answer', 'Type your answer.');
}

/** True when the label is one of our keys (so linked boxes can be filled together). */
export const isKnownKey = (label: string | null | undefined) => !!label && !!FIELD_KINDS[label.trim()];

// ── Business type + state: the exact words the sending system fills in ─────────────────────────────────────────────────────────
export const BUSINESS_TYPES = [
  'limited liability company',
  'corporation',
  'partnership',
  'sole proprietorship',
] as const;
export const BUSINESS_TYPE_LABEL: Record<string, string> = {
  'limited liability company': 'LLC (limited liability company)',
  corporation: 'Corporation',
  partnership: 'Partnership',
  'sole proprietorship': 'Sole proprietorship',
};

export const US_STATES: { code: string; name: string }[] = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
].map(([code, name]) => ({ code, name }));

const stateByCode = new Map(US_STATES.map((s) => [s.code, s.name]));
const stateByName = new Map(US_STATES.map((s) => [s.name.toLowerCase(), s.code]));
/** "TX" / "texas" / "Texas" → "Texas" (the full name the sending system uses), or null. */
export const stateName = (v: string) =>
  stateByCode.get(v.trim().toUpperCase()) ??
  (stateByName.has(v.trim().toLowerCase())
    ? (US_STATES.find((s) => s.name.toLowerCase() === v.trim().toLowerCase())?.name ?? null)
    : null);
export const stateCode = (v: string) =>
  stateByCode.has(v.trim().toUpperCase()) ? v.trim().toUpperCase() : (stateByName.get(v.trim().toLowerCase()) ?? null);

// ── Person name ─────────────────────────────────────────────────────────────────────────────────────────────────────
export type NameParts = { first: string; middle: string; last: string };
export function parseName(v: string): NameParts {
  const p = v.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) {
    return { first: '', middle: '', last: '' };
  }
  if (p.length === 1) {
    return { first: p[0], middle: '', last: '' };
  }
  return { first: p[0], middle: p.slice(1, -1).join(' '), last: p[p.length - 1] };
}
export const formatName = (n: NameParts) =>
  [n.first, n.middle, n.last]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
export function nameProblem(n: NameParts): string | null {
  if (!n.first.trim()) {
    return 'Enter your first name.';
  }
  if (!n.last.trim()) {
    return 'Enter your last name.';
  }
  return null;
}

// ── Address: "123 Main St, Suite 4, Austin, TX 78701" ───────────────────────────────────────────────────────────────
export type AddressParts = { street: string; suite: string; city: string; state: string; zip: string };
/**
 * Reads an address the way people type it, from the end: ZIP, then the state (code or name), then the city, then the
 * street and an optional suite. "1 Main St, Austin, TX 78701", "123 s test st, tallahassee FL, 32301" and
 * "9 Elm, Unit 2, Dallas, Texas 75001-1234" all work. Anything unreadable goes in the street line — nothing is lost.
 */
export function parseAddress(v: string): AddressParts {
  const whole = v.trim();
  const fail = { street: whole, suite: '', city: '', state: '', zip: '' };
  const zipM = whole.match(/[\s,]+(\d{5}(?:-\d{4})?)\s*$/);
  if (!zipM) {
    return fail;
  }
  let rest = whole.slice(0, zipM.index).replace(/[\s,.]+$/, '');
  // state: the last word (2 letters) or the last 1–3 words that make a state name
  let state = '';
  const words = rest.split(/[\s,]+/);
  for (let n = 3; n >= 1 && !state; n--) {
    const cand = words.slice(-n).join(' ');
    const code =
      n === 1 && /^[A-Za-z]{2}$/.test(cand) ? stateCode(cand) : n > 1 || cand.length > 2 ? stateCode(cand) : null;
    if (code) {
      state = code;
      rest = rest.slice(0, rest.toLowerCase().lastIndexOf(cand.toLowerCase())).replace(/[\s,]+$/, '');
    }
  }
  if (!state) {
    return fail;
  }
  const parts = rest
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return fail;
  }
  const city = parts.pop() ?? '';
  const street = parts.shift() ?? '';
  return { street, suite: parts.join(', '), city, state, zip: zipM[1] ?? '' };
}
export function formatAddress(a: AddressParts): string {
  return [a.street.trim(), a.suite.trim(), a.city.trim(), `${a.state.trim().toUpperCase()} ${a.zip.trim()}`.trim()]
    .filter(Boolean)
    .join(', ');
}
export function addressProblem(a: AddressParts): string | null {
  if (!a.street.trim()) {
    return 'Enter the street address.';
  }
  if (!a.city.trim()) {
    return 'Enter the city.';
  }
  if (!stateCode(a.state)) {
    return 'Pick the state.';
  }
  if (!/^\d{5}(-\d{4})?$/.test(a.zip.trim())) {
    return 'Enter a 5-digit ZIP code (or ZIP+4).';
  }
  return null;
}

// ── Small validators ────────────────────────────────────────────────────────────────────────────────────────────────
export const emailProblem = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a real email address.';
export function formatEin(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 9);
  return d.length > 2 ? `${d.slice(0, 2)}-${d.slice(2)}` : d;
}
export const einProblem = (v: string) =>
  /^\d{2}-\d{7}$/.test(v.trim()) ? null : 'An EIN is 9 digits, like 12-3456789.';
export function formatPhone(v: string) {
  const d = v
    .replace(/\D/g, '')
    .replace(/^1(?=\d{10}$)/, '')
    .slice(0, 10);
  if (d.length < 4) {
    return d;
  }
  if (d.length < 7) {
    return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  }
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
export const phoneProblem = (v: string) =>
  v.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').length === 10 ? null : 'Enter a 10-digit phone number.';

/** "Acme LLC, a Texas limited liability company" — the same sentence the sending system builds. */
export function entityLine(name: string, type: string, state: string, tradeName = ''): string {
  if (!name.trim()) {
    return '';
  }
  if (type === 'sole proprietorship') {
    return `${name.trim()}, a sole proprietorship${tradeName.trim() ? ` doing business as ${tradeName.trim()}` : ''}`;
  }
  return `${name.trim()}, a ${state.trim() ? `${state.trim()} ` : ''}${type || 'business'}`;
}

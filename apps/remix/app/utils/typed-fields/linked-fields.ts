/**
 * (10-08, "if one field is changed, all are changed for things like that"): after a signer saves a box,
 * which OTHER boxes of theirs must change with it. Pure — the page applies the list one by one.
 *  · the same key anywhere else (their name in four places, their title, their address…)
 *  · their name also fills the signing site's own Name boxes, and their initials follow it
 *  · business name / type / state / DBA rebuild the "Acme LLC, a Texas limited liability company" line
 * Locked boxes are never touched (the server refuses them anyway).
 */
import { entityLine } from './field-kinds';

export type LinkField = {
  id: number;
  type: string; // Prisma FieldType: TEXT | NAME | INITIALS | …
  inserted: boolean;
  customText: string;
  fieldMeta?: { label?: string | null; text?: string | null; readOnly?: boolean | null } | null;
};

export type LinkedUpdate = { fieldId: number; type: 'TEXT' | 'NAME' | 'INITIALS' | 'EMAIL'; value: string | null };

const NAME_KEYS = new Set(['rep_name', 'signer_name', 'company_signer_name']);
const EMAIL_KEYS = new Set(['rep_email', 'signer_email']);
const ENTITY_PARTS = new Set(['entity_name', 'entity_type', 'entity_state', 'trade_name']);

const labelOf = (f: LinkField) => (f.fieldMeta?.label ?? '').trim();
const editable = (f: LinkField) => !f.fieldMeta?.readOnly;
/** What a box shows now: what the signer saved, else what we filled in. */
export const shownValue = (f: LinkField) => (f.inserted ? f.customText : (f.fieldMeta?.text ?? '')) || '';

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

/** (10-08) The side panel's "Full Name" changed → every name spot of this signer follows (text name boxes, Name boxes,
 *  initials). Only boxes already filled; locked ones never. */
export function nameSyncUpdates(all: LinkField[], name: string): LinkedUpdate[] {
  const v = name.trim();
  if (!v) {
    return [];
  }
  const out: LinkedUpdate[] = [];
  for (const f of all) {
    if (!editable(f) || !f.inserted) {
      continue;
    }
    if (f.type === 'TEXT' && NAME_KEYS.has(labelOf(f)) && f.customText !== v) {
      out.push({ fieldId: f.id, type: 'TEXT', value: v });
    }
    if (f.type === 'NAME' && f.customText !== v) {
      out.push({ fieldId: f.id, type: 'NAME', value: v });
    }
    if (f.type === 'INITIALS' && f.customText !== initialsOf(v)) {
      out.push({ fieldId: f.id, type: 'INITIALS', value: initialsOf(v) });
    }
  }
  return out;
}

export function linkedUpdates(all: LinkField[], changed: LinkField, value: string | null): LinkedUpdate[] {
  // The signing site's own Name / Email boxes link to the matching our field keys.
  if (changed.type === 'NAME' || changed.type === 'EMAIL') {
    if (!value) {
      return [];
    }
    const isName = changed.type === 'NAME';
    const out: LinkedUpdate[] = [];
    for (const f of all) {
      if (f.id === changed.id || !editable(f)) {
        continue;
      }
      if (f.type === changed.type && f.inserted && f.customText !== value) {
        out.push({ fieldId: f.id, type: changed.type, value });
      }
      if (f.type === 'TEXT' && (isName ? NAME_KEYS : EMAIL_KEYS).has(labelOf(f)) && shownValue(f) !== value) {
        out.push({ fieldId: f.id, type: 'TEXT', value });
      }
      if (isName && f.type === 'INITIALS' && f.inserted && f.customText !== initialsOf(value)) {
        out.push({ fieldId: f.id, type: 'INITIALS', value: initialsOf(value) });
      }
    }
    return out;
  }
  const key = labelOf(changed);
  if (!key) {
    return [];
  }
  const out: LinkedUpdate[] = [];
  const others = all.filter((f) => f.id !== changed.id && editable(f));

  // 1 · the same key elsewhere
  for (const f of others) {
    if (
      f.type === 'TEXT' &&
      labelOf(f) === key &&
      (shownValue(f) !== (value ?? '') || f.inserted !== (value != null))
    ) {
      out.push({ fieldId: f.id, type: 'TEXT', value });
    }
  }

  // 2 · their name → the signing site's Name boxes + their initials (only boxes already filled; empty ones fill on load / click)
  if (NAME_KEYS.has(key) && value) {
    for (const f of others) {
      if (f.type === 'NAME' && f.inserted && f.customText !== value) {
        out.push({ fieldId: f.id, type: 'NAME', value });
      }
      if (f.type === 'INITIALS' && f.inserted && f.customText !== initialsOf(value)) {
        out.push({ fieldId: f.id, type: 'INITIALS', value: initialsOf(value) });
      }
    }
  }

  if (EMAIL_KEYS.has(key) && value) {
    for (const f of others) {
      if (f.type === 'EMAIL' && f.inserted && f.customText !== value) {
        out.push({ fieldId: f.id, type: 'EMAIL', value });
      }
    }
  }

  // 3 · the business line follows its parts
  if (ENTITY_PARTS.has(key)) {
    const now = (k: string) => {
      if (k === key) {
        return value ?? '';
      }
      const f = all.find((x) => x.type === 'TEXT' && labelOf(x) === k);
      return f ? shownValue(f) : '';
    };
    const line = entityLine(now('entity_name'), now('entity_type'), now('entity_state'), now('trade_name'));
    if (line) {
      for (const f of others) {
        if (f.type === 'TEXT' && labelOf(f) === 'entity_line' && shownValue(f) !== line) {
          out.push({ fieldId: f.id, type: 'TEXT', value: line });
        }
      }
    }
  }
  return out;
}

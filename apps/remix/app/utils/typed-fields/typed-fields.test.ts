import { describe, expect, it } from 'vitest';

import {
  addressProblem,
  einProblem,
  emailProblem,
  entityLine,
  fieldKindFor,
  formatAddress,
  formatEin,
  formatName,
  formatPhone,
  nameProblem,
  parseAddress,
  parseName,
  stateCode,
  stateName,
} from './field-kinds';
import { initialsOf, type LinkField, linkedUpdates, nameSyncUpdates } from './linked-fields';

describe('field kinds', () => {
  it('maps our field keys to the right editor, never a generic box', () => {
    expect(fieldKindFor('rep_name').kind).toBe('personName');
    expect(fieldKindFor('business_address').kind).toBe('address');
    expect(fieldKindFor('entity_type').kind).toBe('businessType');
    expect(fieldKindFor('entity_state').kind).toBe('state');
    expect(fieldKindFor('rep_title').kind).toBe('title');
    expect(fieldKindFor('ein').kind).toBe('ein');
    expect(fieldKindFor('rep_name').title).not.toMatch(/enter text/i);
  });
  it('an unknown key gets a plain box with a real title; a human label is shown as-is', () => {
    expect(fieldKindFor(undefined)).toMatchObject({ kind: 'text', title: 'Your answer' });
    expect(fieldKindFor('weird_key')).toMatchObject({ kind: 'text', title: 'Your answer' });
    expect(fieldKindFor('Favorite caliber')).toMatchObject({ kind: 'text', title: 'Favorite caliber' });
  });
});

describe('name', () => {
  it('splits and joins first / middle / last', () => {
    expect(parseName('John Quincy Public')).toEqual({ first: 'John', middle: 'Quincy', last: 'Public' });
    expect(parseName('  Pat   Test  ')).toEqual({ first: 'Pat', middle: '', last: 'Test' });
    expect(formatName({ first: 'Pat', middle: '', last: 'Test' })).toBe('Pat Test');
    expect(nameProblem({ first: 'Pat', middle: '', last: '' })).toMatch(/last/);
    expect(nameProblem({ first: 'Pat', middle: '', last: 'Test' })).toBeNull();
  });
});

describe('address', () => {
  it('reads what the sending system fills in and writes one tidy line', () => {
    const a = parseAddress('1 Main St, Austin, TX 78701');
    expect(a).toEqual({ street: '1 Main St', suite: '', city: 'Austin', state: 'TX', zip: '78701' });
    expect(formatAddress({ ...a, suite: 'Suite 4' })).toBe('1 Main St, Suite 4, Austin, TX 78701');
    expect(parseAddress('123 s test st, tallahassee FL, 32301')).toMatchObject({
      city: 'tallahassee',
      state: 'FL',
      zip: '32301',
    });
    expect(parseAddress('9 Elm, Unit 2, Dallas, Texas 75001-1234')).toEqual({
      street: '9 Elm',
      suite: 'Unit 2',
      city: 'Dallas',
      state: 'TX',
      zip: '75001-1234',
    });
  });
  it('something it cannot read goes in the street line, nothing lost', () => {
    expect(parseAddress('somewhere odd')).toEqual({ street: 'somewhere odd', suite: '', city: '', state: '', zip: '' });
  });
  it('refuses a bad ZIP or a missing state', () => {
    expect(addressProblem({ street: '1 Main', suite: '', city: 'Austin', state: 'TX', zip: '787' })).toMatch(/ZIP/);
    expect(addressProblem({ street: '1 Main', suite: '', city: 'Austin', state: '', zip: '78701' })).toMatch(/state/);
    expect(addressProblem({ street: '1 Main', suite: '', city: 'Austin', state: 'tx', zip: '78701' })).toBeNull();
  });
});

describe('small fields', () => {
  it('state names are full names', () => {
    expect(stateName('tx')).toBe('Texas');
    expect(stateName('texas')).toBe('Texas');
    expect(stateCode('Florida')).toBe('FL');
    expect(stateName('Narnia')).toBeNull();
  });
  it('EIN, phone, email', () => {
    expect(formatEin('123456789')).toBe('12-3456789');
    expect(einProblem('12-3456789')).toBeNull();
    expect(einProblem('12-345')).toMatch(/9 digits/);
    expect(formatPhone('+1 850 555 1212')).toBe('(850) 555-1212');
    expect(emailProblem('pat@example.com')).toBeNull();
    expect(emailProblem('pat@')).toMatch(/real email/);
  });
  it('business line is the same sentence the sender builds', () => {
    expect(entityLine('Rep Co LLC', 'limited liability company', 'Texas')).toBe(
      'Rep Co LLC, a Texas limited liability company',
    );
    expect(entityLine('Jane Doe', 'sole proprietorship', 'Texas', 'Jane Guns')).toBe(
      'Jane Doe, a sole proprietorship doing business as Jane Guns',
    );
  });
});

const f = (
  id: number,
  type: string,
  label: string | null,
  shown: string,
  extra: Partial<LinkField> = {},
): LinkField => ({
  id,
  type,
  inserted: true,
  customText: shown,
  fieldMeta: { label, text: shown },
  ...extra,
});

describe('fill everywhere', () => {
  const at = (i: number): LinkField => {
    const x = all[i];
    if (!x) {
      throw new Error(`no field ${i}`);
    }
    return x;
  };
  const all = [
    f(1, 'TEXT', 'rep_name', 'Pat Test'),
    f(2, 'TEXT', 'rep_name', 'Pat Test'),
    f(3, 'TEXT', 'rep_name', 'Pat Test', { fieldMeta: { label: 'rep_name', readOnly: true } }),
    f(4, 'NAME', null, 'Pat Test'),
    f(5, 'INITIALS', null, 'PT'),
    f(6, 'TEXT', 'rep_title', 'Owner'),
    f(7, 'TEXT', 'entity_name', 'Rep Co LLC'),
    f(8, 'TEXT', 'entity_type', 'limited liability company'),
    f(9, 'TEXT', 'entity_state', 'Texas'),
    f(10, 'TEXT', 'entity_line', 'Rep Co LLC, a Texas limited liability company'),
    f(11, 'EMAIL', null, 'pat@x.test'),
    f(12, 'TEXT', 'rep_email', 'pat@x.test'),
  ];
  it('their name changes every name spot, Name boxes and initials — never a locked box', () => {
    const u = linkedUpdates(all, at(0), 'John Quincy Test');
    expect(u).toEqual([
      { fieldId: 2, type: 'TEXT', value: 'John Quincy Test' },
      { fieldId: 4, type: 'NAME', value: 'John Quincy Test' },
      { fieldId: 5, type: 'INITIALS', value: 'JQT' },
    ]);
  });
  it('a Name box links back to the name text boxes', () => {
    const u = linkedUpdates(all, at(3), 'Jo Test');
    expect(u.map((x) => x.fieldId).sort()).toEqual([1, 2, 5]);
  });
  it('title only changes title', () => {
    expect(linkedUpdates(all, at(5), 'President')).toEqual([]);
  });
  it('business type rebuilds the business line', () => {
    expect(linkedUpdates(all, at(7), 'corporation')).toEqual([
      { fieldId: 10, type: 'TEXT', value: 'Rep Co LLC, a Texas corporation' },
    ]);
  });
  it('email box and rep_email text stay together', () => {
    expect(linkedUpdates(all, at(11), 'new@x.test')).toEqual([{ fieldId: 11, type: 'EMAIL', value: 'new@x.test' }]);
    expect(linkedUpdates(all, at(10), 'new@x.test')).toEqual([{ fieldId: 12, type: 'TEXT', value: 'new@x.test' }]);
  });
  it('no change → nothing to do', () => {
    expect(linkedUpdates(all, at(0), 'Pat Test')).toEqual([]);
    expect(initialsOf('pat  test')).toBe('PT');
  });
});

describe('side panel name', () => {
  it('typing a new Full Name updates every filled name spot (company signer too), never locked ones', () => {
    const all = [
      f(1, 'TEXT', 'company_signer_name', 'Lab Admin'),
      f(2, 'TEXT', 'company_signer_title', 'new title'),
      f(3, 'NAME', null, 'Lab Admin'),
      f(4, 'TEXT', 'rep_name', 'Pat', { fieldMeta: { label: 'rep_name', readOnly: true } }),
    ];
    expect(nameSyncUpdates(all, 'Jane Q Signer')).toEqual([
      { fieldId: 1, type: 'TEXT', value: 'Jane Q Signer' },
      { fieldId: 3, type: 'NAME', value: 'Jane Q Signer' },
    ]);
    expect(nameSyncUpdates(all, '  ')).toEqual([]);
  });
});

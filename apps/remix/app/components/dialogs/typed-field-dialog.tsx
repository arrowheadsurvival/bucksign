/**
 * (10-08) one editor for every typed box on the signing page. Opens with what is already in the box (never
 * empty), shows a real title and a line of help, uses the right inputs for what the box IS (name parts, address parts,
 * dropdowns, masked EIN / phone), and has Reset — back to the value we filled in — and Clear.
 */
import type { TTextFieldMeta } from '@documenso/lib/types/field-meta';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { Input } from '@documenso/ui/primitives/input';
import { Label } from '@documenso/ui/primitives/label';
import { Textarea } from '@documenso/ui/primitives/textarea';
import { useMemo, useState } from 'react';
import { createCallable } from 'react-call';

import {
  type AddressParts,
  addressProblem,
  BUSINESS_TYPE_LABEL,
  BUSINESS_TYPES,
  einProblem,
  emailProblem,
  type FieldKindInfo,
  formatAddress,
  formatEin,
  formatName,
  formatPhone,
  type NameParts,
  nameProblem,
  parseAddress,
  parseName,
  phoneProblem,
  stateCode,
  stateName,
  US_STATES,
} from '~/utils/typed-fields/field-kinds';

export type TypedFieldDialogProps = {
  info: FieldKindInfo;
  fieldMeta?: TTextFieldMeta | null;
  /** What is in the box right now ('' when empty). */
  current: string;
  /** What we filled in when it was sent (null when nothing was). Reset puts this back. */
  original: string | null;
  required: boolean;
};

export type TypedFieldDialogResult = { value: string } | { clear: true } | null;

const selectCls =
  'border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const Row = ({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor: string }) => (
  <div className="space-y-1">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
  </div>
);

export const TypedFieldDialog = createCallable<TypedFieldDialogProps, TypedFieldDialogResult>(
  ({ call, info, fieldMeta, current, original, required }) => {
    const start = current || original || '';
    const [text, setText] = useState(start);
    const [name, setName] = useState<NameParts>(() => parseName(start));
    const [addr, setAddr] = useState<AddressParts>(() => parseAddress(start));
    const [touched, setTouched] = useState(false);

    const reset = () => {
      const v = original ?? '';
      setText(info.kind === 'ein' ? formatEin(v) : info.kind === 'phone' ? formatPhone(v) : v);
      setName(parseName(v));
      setAddr(parseAddress(v));
      setTouched(false);
    };

    // The value this editor would save, and what's wrong with it (if anything).
    const { value, problem } = useMemo(() => {
      switch (info.kind) {
        case 'personName':
          return { value: formatName(name), problem: nameProblem(name) };
        case 'address':
          return { value: formatAddress(addr), problem: addressProblem(addr) };
        case 'email':
          return { value: text.trim(), problem: emailProblem(text) };
        case 'ein':
          return { value: text.trim(), problem: einProblem(text) };
        case 'phone':
          return { value: text.trim(), problem: phoneProblem(text) };
        case 'state':
          return { value: stateName(text) ?? '', problem: stateName(text) ? null : 'Pick the state.' };
        case 'businessType':
          return {
            value: text,
            problem: (BUSINESS_TYPES as readonly string[]).includes(text) ? null : 'Pick the business type.',
          };
        default: {
          const limit = fieldMeta?.characterLimit ?? 0;
          const v = text.trim();
          if (!v) {
            return { value: '', problem: 'This box is empty.' };
          }
          if (limit > 0 && v.length > limit) {
            return { value: v, problem: `Keep it to ${limit} characters (${v.length - limit} over).` };
          }
          return { value: v, problem: null };
        }
      }
    }, [info.kind, name, addr, text, fieldMeta?.characterLimit]);

    const save = () => {
      setTouched(true);
      if (problem) {
        return;
      }
      call.end({ value });
    };

    const id = (s: string) => `tf-${s}`;
    const showProblem = touched && problem;

    return (
      <Dialog open={true} onOpenChange={(open) => (!open ? call.end(null) : null)}>
        <DialogContent data-testid="tf-field-dialog" data-kind={info.kind}>
          <DialogHeader>
            <DialogTitle data-testid="tf-field-title">{info.title}</DialogTitle>
            <DialogDescription className="mt-2">{info.help}</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {info.kind === 'personName' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Row label="First name" htmlFor={id('first')}>
                  <Input
                    id={id('first')}
                    autoFocus
                    autoComplete="given-name"
                    value={name.first}
                    onChange={(e) => setName({ ...name, first: e.target.value })}
                  />
                </Row>
                <Row label="Middle (optional)" htmlFor={id('middle')}>
                  <Input
                    id={id('middle')}
                    autoComplete="additional-name"
                    value={name.middle}
                    onChange={(e) => setName({ ...name, middle: e.target.value })}
                  />
                </Row>
                <Row label="Last name" htmlFor={id('last')}>
                  <Input
                    id={id('last')}
                    autoComplete="family-name"
                    value={name.last}
                    onChange={(e) => setName({ ...name, last: e.target.value })}
                  />
                </Row>
              </div>
            )}

            {info.kind === 'address' && (
              <div className="space-y-3">
                <Row label="Street address" htmlFor={id('street')}>
                  <Input
                    id={id('street')}
                    autoFocus
                    autoComplete="address-line1"
                    value={addr.street}
                    onChange={(e) => setAddr({ ...addr, street: e.target.value })}
                  />
                </Row>
                <Row label="Suite / unit (optional)" htmlFor={id('suite')}>
                  <Input
                    id={id('suite')}
                    autoComplete="address-line2"
                    value={addr.suite}
                    onChange={(e) => setAddr({ ...addr, suite: e.target.value })}
                  />
                </Row>
                <div className="grid gap-3 sm:grid-cols-[1fr,8rem,7rem]">
                  <Row label="City" htmlFor={id('city')}>
                    <Input
                      id={id('city')}
                      autoComplete="address-level2"
                      value={addr.city}
                      onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                    />
                  </Row>
                  <Row label="State" htmlFor={id('state')}>
                    <select
                      id={id('state')}
                      className={selectCls}
                      value={stateCode(addr.state) ?? ''}
                      onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                    >
                      <option value="">—</option>
                      {US_STATES.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.code}
                        </option>
                      ))}
                    </select>
                  </Row>
                  <Row label="ZIP" htmlFor={id('zip')}>
                    <Input
                      id={id('zip')}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={addr.zip}
                      onChange={(e) => setAddr({ ...addr, zip: e.target.value.replace(/[^\d-]/g, '').slice(0, 10) })}
                    />
                  </Row>
                </div>
              </div>
            )}

            {info.kind === 'businessType' && (
              <select id={id('type')} className={selectCls} value={text} onChange={(e) => setText(e.target.value)}>
                <option value="">Pick one…</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BUSINESS_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            )}

            {info.kind === 'state' && (
              <select
                id={id('state1')}
                className={selectCls}
                value={stateName(text) ?? ''}
                onChange={(e) => setText(e.target.value)}
              >
                <option value="">Pick the state…</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {(info.kind === 'email' ||
              info.kind === 'ein' ||
              info.kind === 'phone' ||
              info.kind === 'title' ||
              info.kind === 'businessName') && (
              <Input
                id={id('one')}
                autoFocus
                type={info.kind === 'email' ? 'email' : info.kind === 'phone' ? 'tel' : 'text'}
                inputMode={info.kind === 'ein' || info.kind === 'phone' ? 'numeric' : undefined}
                autoComplete={
                  info.kind === 'email'
                    ? 'email'
                    : info.kind === 'phone'
                      ? 'tel'
                      : info.kind === 'title'
                        ? 'organization-title'
                        : info.kind === 'businessName'
                          ? 'organization'
                          : 'off'
                }
                placeholder={info.kind === 'ein' ? '12-3456789' : info.kind === 'phone' ? '(555) 555-5555' : undefined}
                value={text}
                onChange={(e) =>
                  setText(
                    info.kind === 'ein'
                      ? formatEin(e.target.value)
                      : info.kind === 'phone'
                        ? formatPhone(e.target.value)
                        : e.target.value,
                  )
                }
              />
            )}

            {(info.kind === 'text' || info.kind === 'entityLine') && (
              <Textarea
                id={id('text')}
                autoFocus
                className="w-full rounded-md"
                placeholder={fieldMeta?.placeholder || undefined}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}

            {value && info.kind !== 'text' && (
              <p className="text-muted-foreground text-xs" data-testid="tf-field-preview">
                On the agreement:{' '}
                <span className="font-medium text-foreground">
                  {info.kind === 'businessType' ? (BUSINESS_TYPE_LABEL[value] ?? value) : value}
                </span>
              </p>
            )}
            {showProblem && (
              <p className="text-red-600 text-sm" role="alert" data-testid="tf-field-problem">
                {problem}
              </p>
            )}

            <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
              <div className="flex gap-2">
                {original != null && original !== '' && (
                  <Button type="button" variant="ghost" onClick={reset} data-testid="tf-field-reset">
                    Reset
                  </Button>
                )}
                {!required && current && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => call.end({ clear: true })}
                    data-testid="tf-field-clear"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => call.end(null)} data-testid="tf-field-cancel">
                  Cancel
                </Button>
                <Button type="submit" data-testid="tf-field-save">
                  Save
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  },
);

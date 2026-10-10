/**
 * (10-08, "the person signing should be auto filled with the person's name… this is something that
 * should be an automatic fill"): when the page opens, the signer's empty Name boxes are filled with their name. They
 * can still click one to change it — and the change follows to every other spot (linked-fields.ts).
 */
import { FieldType, RecipientRole } from '@prisma/client';
import { useEffect, useRef } from 'react';

import { type LinkField, nameSyncUpdates } from '~/utils/typed-fields/linked-fields';

import { useRequiredEnvelopeSigningContext } from '../document-signing/envelope-signing-provider';

export const AutoFillNames = () => {
  const { recipient, recipientFields, fullName, signField, isDirectTemplate } = useRequiredEnvelopeSigningContext();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || isDirectTemplate || recipient.role === RecipientRole.ASSISTANT || !fullName.trim()) {
      return;
    }

    const empty = recipientFields.filter((f) => f.type === FieldType.NAME && !f.inserted && !f.fieldMeta?.readOnly);
    done.current = true;

    void (async () => {
      for (const f of empty) {
        try {
          await signField(f.id, { type: FieldType.NAME, value: fullName.trim() });
        } catch (err) {
          console.error('[typed-fields] name auto-fill failed', err);
          return;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName]);

  // (10-08, "I can change my name to the left, but not on the form"): typing in the side panel's Full Name updates every
  // name spot on the form once they stop typing. The first value is the one the page opened with — no sync for that.
  const firstName = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstName.current === null) {
      firstName.current = fullName;
      return;
    }

    if (isDirectTemplate || recipient.role === RecipientRole.ASSISTANT) {
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      const updates = nameSyncUpdates(recipientFields as LinkField[], fullName);

      void (async () => {
        for (const u of updates) {
          try {
            await signField(u.fieldId, { type: u.type, value: u.value } as Parameters<typeof signField>[1]);
          } catch (err) {
            console.error('[typed-fields] name sync failed', err);
            return;
          }
        }
      })();
    }, 800);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName]);

  return null;
};

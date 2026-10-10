import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { FieldType, RecipientRole } from '@prisma/client';
import { RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';

import { useRequiredEnvelopeSigningContext } from '../document-signing/envelope-signing-provider';

/** The boxes "Start over" empties — what the signer fills themselves. Values the sender filled in (text) are kept. */
const CLEARABLE: FieldType[] = [FieldType.INITIALS, FieldType.SIGNATURE, FieldType.DATE, FieldType.CHECKBOX];

const emptyValue = (type: FieldType): TSignEnvelopeFieldValue | null => {
  if (type === FieldType.INITIALS) {
    return { type: FieldType.INITIALS, value: null };
  }

  if (type === FieldType.SIGNATURE) {
    return { type: FieldType.SIGNATURE, value: null };
  }

  if (type === FieldType.DATE) {
    return { type: FieldType.DATE, value: false };
  }

  if (type === FieldType.CHECKBOX) {
    return { type: FieldType.CHECKBOX, value: [] };
  }

  return null;
};

/**
 * Start over: empties every initials, signature, date and tick box
 * this signer filled (each one is recorded on the audit log as uninserted), forgets the adopted signature and initials,
 * and reloads the page, which opens the adopt steps again. Only while the document is still being signed — a completed
 * signature can't be undone.
 */
export const EnvelopeStartOverDialog = () => {
  const { recipient, recipientFields, signField, setSignature, setInitials } = useRequiredEnvelopeSigningContext();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (recipient.role !== RecipientRole.SIGNER) {
    return null;
  }

  const filled = recipientFields.filter((f) => f.inserted && !f.fieldMeta?.readOnly && CLEARABLE.includes(f.type));

  const startOver = async () => {
    setBusy(true);

    try {
      for (const f of filled) {
        const value = emptyValue(f.type);

        if (value) {
          await signField(f.id, value);
        }
      }

      setSignature(null);
      setInitials(null);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        data-testid="start-over"
        onClick={() => setOpen(true)}
      >
        <RotateCcwIcon className="mr-2 h-4 w-4" />
        Start over
      </Button>

      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent position="center" data-testid="start-over-dialog">
          <DialogHeader>
            <DialogTitle>Start over?</DialogTitle>
            <DialogDescription>
              Clear everything you've filled in and start again? Your adopted signature and initials will be cleared
              too. {filled.length > 0 ? `${filled.length} box${filled.length === 1 ? '' : 'es'} will be emptied.` : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" data-testid="start-over-yes" loading={busy} onClick={() => void startOver()}>
              Yes, start over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

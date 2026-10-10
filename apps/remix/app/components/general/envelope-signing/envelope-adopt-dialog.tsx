import { extractInitials } from '@documenso/lib/utils/recipient-formatter';
import { isSignatureFieldType } from '@documenso/prisma/guards/is-signature-field';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { SignaturePad } from '@documenso/ui/primitives/signature-pad';
import { SignatureRender } from '@documenso/ui/primitives/signature-pad/signature-render';
import { FieldType, RecipientRole } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';

import { DocumentSigningDisclosure } from '../document-signing/document-signing-disclosure';
import { useRequiredEnvelopeSigningContext } from '../document-signing/envelope-signing-provider';

type AdoptStep = 'signature' | 'initials' | 'review';

/**
 * Before the first box the signer adopts what they'll sign with, in steps: their signature, their initials
 * (when the document has initials boxes), then a review of both with "Change" on each. Each pad draws, types or
 * uploads. Every signature / initials box then fills from these in one click. "Read it first" closes it; the side panel
 * (and any box) still opens the same pads later.
 */
export const EnvelopeAdoptDialog = () => {
  const { recipient, recipientFields, envelope, fullName, signature, setSignature, initials, setInitials } =
    useRequiredEnvelopeSigningContext();

  const needsSignature = useMemo(
    () => recipientFields.some((f) => isSignatureFieldType(f.type) && !f.inserted),
    [recipientFields],
  );
  const needsInitials = useMemo(
    () => recipientFields.some((f) => f.type === FieldType.INITIALS && !f.inserted),
    [recipientFields],
  );

  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<AdoptStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [sig, setSig] = useState(signature ?? '');
  const [ini, setIni] = useState(initials ?? '');

  // decide once, on arrival
  useEffect(() => {
    const wanted: AdoptStep[] = [];

    // always show each step the document needs, even when one was adopted before (a reload, or
    // initials already in some boxes) — the pad starts with it, so the signer sees and confirms it before Review
    if (needsSignature) {
      wanted.push('signature');
    }

    if (needsInitials) {
      wanted.push('initials');
    }

    if (wanted.length > 0) {
      wanted.push('review');
    }

    setSteps(wanted);
    setOpen(recipient.role === RecipientRole.SIGNER && wanted.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open || steps.length === 0) {
    return null;
  }

  const step = steps[stepIndex];
  const nextStep = steps[stepIndex + 1];
  const goTo = (s: AdoptStep) => setStepIndex(Math.max(0, steps.indexOf(s)));

  const pads = {
    typedSignatureEnabled: envelope.documentMeta.typedSignatureEnabled,
    uploadSignatureEnabled: envelope.documentMeta.uploadSignatureEnabled,
    drawSignatureEnabled: envelope.documentMeta.drawSignatureEnabled,
  };

  const ready = (!steps.includes('signature') || !!sig) && (!steps.includes('initials') || !!ini);

  const finish = () => {
    if (steps.includes('signature') && sig) {
      setSignature(sig);
    }

    if (steps.includes('initials') && ini) {
      setInitials(ini);
    }

    setOpen(false);
  };

  const title = step === 'signature' ? 'Your signature' : step === 'initials' ? 'Your initials' : 'Review';

  const description =
    step === 'signature'
      ? 'Draw, type or upload your signature. It goes in every signature box on this document.'
      : step === 'initials'
        ? 'Draw, type or upload your initials. They go in every initials box on this document.'
        : 'This is how they will appear in the boxes. Change either one, or adopt them and start signing.';

  const stepValue = step === 'signature' ? sig : step === 'initials' ? ini : '';

  return (
    <Dialog open={true} onOpenChange={(v) => !v && setOpen(false)}>
      <DialogContent position="center" className="max-w-2xl" data-testid="adopt-dialog">
        <DialogHeader>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide" data-testid="adopt-step">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === 'review' ? (
          <div
            className={
              steps.includes('signature') && steps.includes('initials')
                ? 'grid gap-4 sm:grid-cols-[2fr_1fr]'
                : 'grid gap-4'
            }
          >
            {steps.includes('signature') && (
              <AdoptedPreview
                label="Signature"
                value={sig}
                onChange={() => goTo('signature')}
                testId="adopt-change-signature"
              />
            )}
            {steps.includes('initials') && (
              <AdoptedPreview
                label="Initials"
                value={ini}
                onChange={() => goTo('initials')}
                testId="adopt-change-initials"
              />
            )}
          </div>
        ) : (
          // keyed by step so each step gets a fresh pad (its own tab row, its own drawing)
          <SignaturePad
            key={step}
            id={step === 'signature' ? 'adopt-signature' : 'adopt-initials'}
            fullName={step === 'signature' ? fullName : fullName ? extractInitials(fullName) : ''}
            value={stepValue}
            onChange={({ value: v }) => (step === 'signature' ? setSig(v) : setIni(v))}
            kind={step}
            {...pads}
          />
        )}

        {step === 'review' && <DocumentSigningDisclosure />}

        <DialogFooter>
          {stepIndex === 0 ? (
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Read it first
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              data-testid="adopt-back"
              onClick={() => setStepIndex(stepIndex - 1)}
            >
              Back
            </Button>
          )}

          {step === 'review' ? (
            <Button type="button" data-testid="adopt-save" disabled={!ready} onClick={finish}>
              Adopt and start signing
            </Button>
          ) : (
            <Button
              type="button"
              data-testid="adopt-next"
              disabled={!stepValue}
              onClick={() => setStepIndex(stepIndex + 1)}
            >
              {nextStep === 'initials' ? 'Next: initials' : 'Next: review'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type AdoptedPreviewProps = {
  label: string;
  value: string;
  onChange: () => void;
  testId: string;
};

const AdoptedPreview = ({ label, value, onChange, testId }: AdoptedPreviewProps) => {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{label}</span>
        <Button type="button" variant="link" className="h-auto p-0 text-sm" data-testid={testId} onClick={onChange}>
          Change
        </Button>
      </div>
      <div className="mt-2 flex aspect-signature-pad items-center justify-center rounded-lg border bg-white p-2">
        <SignatureRender value={value} />
      </div>
    </div>
  );
};

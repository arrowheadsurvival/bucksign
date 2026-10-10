import { Button } from '@documenso/ui/primitives/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@documenso/ui/primitives/dialog';
import { SignaturePad } from '@documenso/ui/primitives/signature-pad';
import { Trans } from '@lingui/react/macro';
import { useState } from 'react';
import { createCallable } from 'react-call';

import { DocumentSigningDisclosure } from '../general/document-signing/document-signing-disclosure';

export type SignFieldSignatureDialogProps = {
  initialSignature?: string;
  fullName?: string;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
  /** (10-08) re-signing a placed signature — the new one replaces every signature box of this signer. */
  redraw?: boolean;
  /** (10-10) the same pad adopts the signer's INITIALS (drawn, typed or uploaded) */
  kind?: 'signature' | 'initials';
};

export const SignFieldSignatureDialog = createCallable<SignFieldSignatureDialogProps, string | null>(
  ({
    call,
    fullName,
    typedSignatureEnabled,
    uploadSignatureEnabled,
    drawSignatureEnabled,
    initialSignature,
    redraw,
    kind = 'signature',
  }) => {
    const isInitials = kind === 'initials';
    const [localSignature, setLocalSignature] = useState(initialSignature);

    return (
      <Dialog open={true} onOpenChange={(value) => (!value ? call.end(null) : null)}>
        <DialogContent position="center">
          <div>
            <DialogHeader>
              <DialogTitle data-testid="tf-signature-title">
                {isInitials ? (
                  redraw ? (
                    'Redraw your initials'
                  ) : (
                    'Your initials'
                  )
                ) : redraw ? (
                  'Redraw your signature'
                ) : (
                  <Trans>Sign Signature Field</Trans>
                )}
              </DialogTitle>
              {(redraw || isInitials) && (
                <p className="text-muted-foreground text-sm">
                  {isInitials
                    ? redraw
                      ? "Your new initials replace them everywhere you've initialled on this document."
                      : 'Draw, type or upload your initials. They go in every initials box on this document.'
                    : "Your new signature replaces it everywhere you've signed on this document."}
                </p>
              )}
            </DialogHeader>

            <SignaturePad
              fullName={fullName}
              value={localSignature ?? ''}
              onChange={({ value }) => setLocalSignature(value)}
              typedSignatureEnabled={typedSignatureEnabled}
              uploadSignatureEnabled={uploadSignatureEnabled}
              drawSignatureEnabled={drawSignatureEnabled}
              kind={kind}
            />
          </div>

          <DocumentSigningDisclosure />

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => call.end(null)}>
              <Trans>Cancel</Trans>
            </Button>

            <Button
              type="button"
              data-testid="tf-signature-save"
              disabled={!localSignature}
              onClick={() => call.end(localSignature || null)}
            >
              {redraw ? (
                isInitials ? (
                  'Use these initials'
                ) : (
                  'Use this signature'
                )
              ) : isInitials ? (
                'Use these initials'
              ) : (
                <Trans>Sign</Trans>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TFieldInitials } from '@documenso/lib/types/field';
import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { FieldType } from '@prisma/client';

import { SignFieldSignatureDialog } from '~/components/dialogs/sign-field-signature-dialog';

type HandleInitialsFieldClickOptions = {
  field: TFieldInitials;
  /** the signer's adopted initials (image or typed); null = not adopted yet */
  initials: string | null;
  /** typed-tab default, e.g. "CB" from their full name */
  suggested?: string;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
};

/**
 * * Initials are adopted once, on the same pad as the signature. A click on an empty box fills it with the adopted
 * initials; a click on a filled box redraws them (the caller then replaces every initials box of this signer).
 */
export const handleInitialsFieldClick = async (
  options: HandleInitialsFieldClickOptions,
): Promise<Extract<TSignEnvelopeFieldValue, { type: typeof FieldType.INITIALS }> | null> => {
  const { field, initials, suggested, typedSignatureEnabled, uploadSignatureEnabled, drawSignatureEnabled } = options;

  if (field.type !== FieldType.INITIALS) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Invalid field type',
    });
  }

  const pad = (redraw: boolean) =>
    SignFieldSignatureDialog.call({
      kind: 'initials',
      redraw,
      fullName: suggested,
      typedSignatureEnabled,
      uploadSignatureEnabled,
      drawSignatureEnabled,
    });

  if (field.inserted) {
    const redrawn = await pad(true);

    return redrawn ? { type: FieldType.INITIALS, value: redrawn } : null;
  }

  const value = initials || (await pad(false));

  return value ? { type: FieldType.INITIALS, value } : null;
};

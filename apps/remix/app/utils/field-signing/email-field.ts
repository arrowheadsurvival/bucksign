import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TFieldEmail } from '@documenso/lib/types/field';
import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { FieldType } from '@prisma/client';
import { SignFieldEmailDialog } from '~/components/dialogs/sign-field-email-dialog';
import { TypedFieldDialog } from '~/components/dialogs/typed-field-dialog';
import { FIELD_KINDS, fieldKindFor } from '~/utils/typed-fields/field-kinds';

type HandleEmailFieldClickOptions = {
  field: TFieldEmail;
  email: string | null;
  placeholderEmail: string | null;
};

export const handleEmailFieldClick = async (
  options: HandleEmailFieldClickOptions,
): Promise<Extract<TSignEnvelopeFieldValue, { type: typeof FieldType.EMAIL }> | null> => {
  const { field, email, placeholderEmail } = options;

  if (field.type !== FieldType.EMAIL) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Invalid field type',
    });
  }

  // (10-08) a filled box opens for editing (with what's in it) — never wiped on click.
  if (field.inserted) {
    const result = await TypedFieldDialog.call({
      info: FIELD_KINDS.rep_email ?? fieldKindFor('rep_email'),
      current: field.customText || '',
      original: null,
      required: field.fieldMeta?.required !== false,
    });

    if (!result) {
      return null;
    }

    if ('clear' in result) {
      return { type: FieldType.EMAIL, value: null };
    }

    return result.value === field.customText ? null : { type: FieldType.EMAIL, value: result.value };
  }

  let emailToInsert = email;

  if (!emailToInsert) {
    emailToInsert = await SignFieldEmailDialog.call({
      placeholderEmail,
    });
  }

  if (!emailToInsert) {
    return null;
  }

  return {
    type: FieldType.EMAIL,
    value: emailToInsert,
  };
};

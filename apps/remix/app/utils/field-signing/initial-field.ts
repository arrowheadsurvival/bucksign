import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TFieldInitials } from '@documenso/lib/types/field';
import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { FieldType } from '@prisma/client';
import { SignFieldInitialsDialog } from '~/components/dialogs/sign-field-initials-dialog';
import { TypedFieldDialog } from '~/components/dialogs/typed-field-dialog';

type HandleInitialsFieldClickOptions = {
  field: TFieldInitials;
  initials: string | null;
};

export const handleInitialsFieldClick = async (
  options: HandleInitialsFieldClickOptions,
): Promise<Extract<TSignEnvelopeFieldValue, { type: typeof FieldType.INITIALS }> | null> => {
  const { field, initials } = options;

  if (field.type !== FieldType.INITIALS) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Invalid field type',
    });
  }

  // (10-08) a filled box opens for editing (with what's in it) — never wiped on click.
  if (field.inserted) {
    const result = await TypedFieldDialog.call({
      info: { kind: 'text', title: 'Your initials', help: 'The initials of your full name.' },
      current: field.customText || '',
      original: null,
      required: field.fieldMeta?.required !== false,
    });

    if (!result) {
      return null;
    }

    if ('clear' in result) {
      return { type: FieldType.INITIALS, value: null };
    }

    return result.value === field.customText ? null : { type: FieldType.INITIALS, value: result.value };
  }

  let initialsToInsert = initials;

  if (!initialsToInsert) {
    initialsToInsert = await SignFieldInitialsDialog.call({});
  }

  if (!initialsToInsert) {
    return null;
  }

  return {
    type: FieldType.INITIALS,
    value: initialsToInsert,
  };
};

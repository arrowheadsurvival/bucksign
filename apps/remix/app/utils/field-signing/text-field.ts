import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TFieldText } from '@documenso/lib/types/field';
import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { FieldType } from '@prisma/client';

import { TypedFieldDialog } from '~/components/dialogs/typed-field-dialog';
import { fieldKindFor } from '~/utils/typed-fields/field-kinds';

type HandleTextFieldClickOptions = {
  field: TFieldText;
  text: string | null;
};

/**
 * (10-08) clicking a box opens the editor WITH what is in it — a filled box is edited, never wiped first.
 * Upstream un-inserted the box on the first click (deleting its value) and opened an empty "Enter Text" box on the
 * second. Returns null when nothing should change (Cancel).
 */
export const handleTextFieldClick = async (
  options: HandleTextFieldClickOptions,
): Promise<Extract<TSignEnvelopeFieldValue, { type: typeof FieldType.TEXT }> | null> => {
  const { field, text } = options;

  if (field.type !== FieldType.TEXT) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Invalid field type',
    });
  }

  if (text) {
    return { type: FieldType.TEXT, value: text };
  }

  const result = await TypedFieldDialog.call({
    info: fieldKindFor(field.fieldMeta?.label),
    fieldMeta: field.fieldMeta,
    current: field.inserted ? field.customText || '' : '',
    original: field.fieldMeta?.text ?? null,
    required: field.fieldMeta?.required !== false,
  });

  if (!result) {
    return null;
  }

  if ('clear' in result) {
    return field.inserted ? { type: FieldType.TEXT, value: null } : null;
  }

  if (field.inserted && result.value === field.customText) {
    return null; // unchanged
  }

  return { type: FieldType.TEXT, value: result.value };
};

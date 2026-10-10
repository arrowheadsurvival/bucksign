import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TFieldName } from '@documenso/lib/types/field';
import type { TSignEnvelopeFieldValue } from '@documenso/trpc/server/envelope-router/sign-envelope-field.types';
import { FieldType } from '@prisma/client';
import { SignFieldNameDialog } from '~/components/dialogs/sign-field-name-dialog';
import { TypedFieldDialog } from '~/components/dialogs/typed-field-dialog';
import { FIELD_KINDS, fieldKindFor } from '~/utils/typed-fields/field-kinds';

type HandleNameFieldClickOptions = {
  field: TFieldName;
  name: string | null;
};

export const handleNameFieldClick = async (
  options: HandleNameFieldClickOptions,
): Promise<Extract<TSignEnvelopeFieldValue, { type: typeof FieldType.NAME }> | null> => {
  const { field, name } = options;

  if (field.type !== FieldType.NAME) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Invalid field type',
    });
  }

  // (10-08) a filled box opens for editing (with what's in it) — never wiped on click.
  if (field.inserted) {
    const result = await TypedFieldDialog.call({
      info: FIELD_KINDS.rep_name ?? fieldKindFor('rep_name'),
      current: field.customText || '',
      original: null,
      required: field.fieldMeta?.required !== false,
    });

    if (!result) {
      return null;
    }

    if ('clear' in result) {
      return { type: FieldType.NAME, value: null };
    }

    return result.value === field.customText ? null : { type: FieldType.NAME, value: result.value };
  }

  let nameToInsert = name;

  if (!nameToInsert) {
    nameToInsert = await SignFieldNameDialog.call({
      // Props here.
    });
  }

  if (!nameToInsert) {
    return null;
  }

  return {
    type: FieldType.NAME,
    value: nameToInsert,
  };
};

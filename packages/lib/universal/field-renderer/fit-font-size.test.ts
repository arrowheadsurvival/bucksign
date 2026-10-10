// sort-imports-ignore
import '../../server-only/konva/skia-backend';

import { describe, expect, it } from 'vitest';

import { fitFontSizeToBox } from './calculate-overflow-layout';

const base = { fontFamily: 'Noto Sans, sans-serif', lineHeight: 1, letterSpacing: 0 };

describe('fitFontSizeToBox (shrink, never cut off)', () => {
  it('leaves a value that fits at its own size', () => {
    expect(fitFontSizeToBox({ ...base, textToRender: 'Acme', fontSize: 12, baseWidth: 300, baseHeight: 18 })).toBe(12);
  });

  it('shrinks a long value onto one line', () => {
    const size = fitFontSizeToBox({
      ...base,
      textToRender: '1234 Long Street Name Boulevard',
      fontSize: 12,
      baseWidth: 120,
      baseHeight: 18,
    });
    expect(size).toBeLessThan(12);
    expect(size).toBeGreaterThanOrEqual(5.4);
  });

  it('never goes below the floor (45% of the size, at least 5)', () => {
    const size = fitFontSizeToBox({
      ...base,
      textToRender: 'x'.repeat(400),
      fontSize: 12,
      baseWidth: 60,
      baseHeight: 14,
    });
    expect(size).toBeCloseTo(5.4, 5);
  });

  it('a bigger box keeps a bigger size', () => {
    const text = '720 Capital Circle NE, Suite G, Tallahassee, FL 32301';
    const small = fitFontSizeToBox({ ...base, textToRender: text, fontSize: 12, baseWidth: 150, baseHeight: 18 });
    const wide = fitFontSizeToBox({ ...base, textToRender: text, fontSize: 12, baseWidth: 300, baseHeight: 18 });
    expect(wide).toBeGreaterThan(small);
  });

  it('empty value or empty box: unchanged', () => {
    expect(fitFontSizeToBox({ ...base, textToRender: '', fontSize: 12, baseWidth: 10, baseHeight: 10 })).toBe(12);
    expect(fitFontSizeToBox({ ...base, textToRender: 'abc', fontSize: 12, baseWidth: 0, baseHeight: 10 })).toBe(12);
  });
});

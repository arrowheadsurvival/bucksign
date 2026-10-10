import { unsafe_useEffectOnce } from '@documenso/lib/client-only/hooks/use-effect-once';
import { SIGNATURE_CANVAS_DPI } from '@documenso/lib/constants/signatures';

import { Trans, useLingui } from '@lingui/react/macro';
import { Undo2 } from 'lucide-react';
import type { StrokeOptions } from 'perfect-freehand';
import { getStroke } from 'perfect-freehand';
import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils';
import { checkSignatureValidity, getSvgPathFromStroke, INITIALS_MIN_COVERAGE } from './helper';
import { Point } from './point';
import { SignaturePadColorPicker } from './signature-pad-color-picker';

export type SignaturePadDrawProps = {
  className?: string;
  value: string;
  onChange: (_signatureDataUrl: string) => void;
  /** (10-10) initials are small marks — they need far less ink than a signature to count */
  kind?: 'signature' | 'initials';
};

/**
 * (10-08) the saved signature is the INK, not the whole pad. The pad is a wide 16:7 canvas, and a signature
 * drawn in part of it was saved with all the blank space around it — then shrunk to fit the box, so it never filled it.
 * Crop to the drawn pixels plus a small margin.
 */
const trimmedDataUrl = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;

  if (!ctx || !width || !height) {
    return canvas.toDataURL();
  }

  const { data } = ctx.getImageData(0, 0, width, height);
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < left) {
          left = x;
        }
        if (x > right) {
          right = x;
        }
        if (y < top) {
          top = y;
        }
        if (y > bottom) {
          bottom = y;
        }
      }
    }
  }

  if (right < 0) {
    return canvas.toDataURL();
  }

  const pad = Math.round(Math.max(right - left, bottom - top) * 0.04) + 4;
  const sx = Math.max(0, left - pad);
  const sy = Math.max(0, top - pad);
  const sw = Math.min(width, right + pad + 1) - sx;
  const sh = Math.min(height, bottom + pad + 1) - sy;
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  out.getContext('2d')?.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  return out.toDataURL();
};

export const SignaturePadDraw = ({
  className,
  value,
  onChange,
  kind = 'signature',
  ...props
}: SignaturePadDrawProps) => {
  const { t } = useLingui();

  const $el = useRef<HTMLCanvasElement>(null);

  const $imageData = useRef<ImageData | null>(null);
  const $fileInput = useRef<HTMLInputElement>(null);

  const [isPressed, setIsPressed] = useState(false);
  const [lines, setLines] = useState<Point[][]>([]);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);
  const [isSignatureValid, setIsSignatureValid] = useState<boolean | null>(null);

  const [selectedColor, setSelectedColor] = useState('black');

  const perfectFreehandOptions = useMemo(() => {
    const size = $el.current ? Math.min($el.current.height, $el.current.width) * 0.03 : 10;

    return {
      size,
      thinning: 0.25,
      streamline: 0.5,
      smoothing: 0.5,
      end: {
        taper: size * 2,
      },
    } satisfies StrokeOptions;
  }, []);

  const onMouseDown = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(true);

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);

    setCurrentLine([point]);
  };

  const onMouseMove = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (!isPressed) {
      return;
    }

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);
    const lastPoint = currentLine[currentLine.length - 1];

    if (lastPoint && point.distanceTo(lastPoint) > 5) {
      setCurrentLine([...currentLine, point]);

      // Update the canvas here to draw the lines
      if ($el.current) {
        const ctx = $el.current.getContext('2d');

        if (ctx) {
          ctx.restore();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = selectedColor;

          lines.forEach((line) => {
            const pathData = new Path2D(getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)));

            ctx.fill(pathData);
          });

          const pathData = new Path2D(getSvgPathFromStroke(getStroke([...currentLine, point], perfectFreehandOptions)));
          ctx.fill(pathData);
        }
      }
    }
  };

  const onMouseUp = (event: MouseEvent | PointerEvent | TouchEvent, addLine = true) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    setIsPressed(false);

    const point = Point.fromEvent(event, SIGNATURE_CANVAS_DPI, $el.current);

    const newLines = [...lines];

    if (addLine && currentLine.length > 0) {
      newLines.push([...currentLine, point]);
      setCurrentLine([]);
    }

    setLines(newLines);

    if ($el.current && newLines.length > 0) {
      const ctx = $el.current.getContext('2d');

      if (ctx) {
        ctx.restore();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = selectedColor;

        newLines.forEach((line) => {
          const pathData = new Path2D(getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)));
          ctx.fill(pathData);
        });

        const isValidSignature = checkSignatureValidity($el, kind === 'initials' ? INITIALS_MIN_COVERAGE : undefined);

        setIsSignatureValid(isValidSignature);

        if (isValidSignature) {
          onChange?.(trimmedDataUrl($el.current));
        }
        ctx.save();
      }
    }
  };

  const onMouseEnter = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if ('buttons' in event && event.buttons === 1) {
      onMouseDown(event);
    }
  };

  const onMouseLeave = (event: MouseEvent | PointerEvent | TouchEvent) => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (isPressed) {
      onMouseUp(event, true);
    } else {
      onMouseUp(event, false);
    }
  };

  const onClearClick = () => {
    if ($el.current) {
      const ctx = $el.current.getContext('2d');

      ctx?.clearRect(0, 0, $el.current.width, $el.current.height);
      $imageData.current = null;
    }

    if ($fileInput.current) {
      $fileInput.current.value = '';
    }

    onChange('');

    setLines([]);
    setCurrentLine([]);
    setIsPressed(false);
  };

  const onUndoClick = () => {
    if (lines.length === 0 || !$el.current) {
      return;
    }

    const newLines = lines.slice(0, -1);
    setLines(newLines);

    // Clear and redraw the canvas
    const ctx = $el.current.getContext('2d');
    const { width, height } = $el.current;
    ctx?.clearRect(0, 0, width, height);

    if ($imageData.current) {
      ctx?.putImageData($imageData.current, 0, 0);
    }

    newLines.forEach((line) => {
      const pathData = new Path2D(getSvgPathFromStroke(getStroke(line, perfectFreehandOptions)));
      ctx?.fill(pathData);
    });

    onChange?.(trimmedDataUrl($el.current));
  };

  unsafe_useEffectOnce(() => {
    if ($el.current) {
      $el.current.width = $el.current.clientWidth * SIGNATURE_CANVAS_DPI;
      $el.current.height = $el.current.clientHeight * SIGNATURE_CANVAS_DPI;
    }

    if ($el.current && value) {
      const ctx = $el.current.getContext('2d');

      const { width, height } = $el.current;

      const img = new Image();

      img.onload = () => {
        // A saved (cropped) signature goes back in the middle of the pad, scaled down only if it's bigger.
        const k = Math.min(1, width / img.width, height / img.height);
        const w = img.width * k;
        const h = img.height * k;
        ctx?.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);

        const defaultImageData = ctx?.getImageData(0, 0, width, height) || null;

        $imageData.current = defaultImageData;
      };

      img.src = value;
    }
  });

  return (
    <div className={cn('h-full w-full', className)}>
      <canvas
        data-testid="signature-pad-draw"
        ref={$el}
        // (10-08) The pad is paper: white with the real ink colour, also in dark mode. Inverting it showed white ink
        // on grey while the saved signature (and the PDF) is black.
        className="h-full w-full"
        style={{ touchAction: 'none' }}
        onPointerMove={(event) => onMouseMove(event)}
        onPointerDown={(event) => onMouseDown(event)}
        onPointerUp={(event) => onMouseUp(event)}
        onPointerLeave={(event) => onMouseLeave(event)}
        onPointerEnter={(event) => onMouseEnter(event)}
        {...props}
      />

      <SignaturePadColorPicker
        className={cn('transition-opacity duration-100', {
          'pointer-events-none opacity-0': isPressed,
        })}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
      />

      <div
        className={cn('absolute right-3 bottom-3 flex gap-2 transition-opacity duration-100', {
          'pointer-events-none opacity-0': isPressed,
        })}
      >
        <button
          type="button"
          className="rounded-full p-0 text-[0.688rem] text-muted-foreground/60 ring-offset-background hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onClearClick()}
        >
          {kind === 'initials' ? 'Clear initials' : <Trans>Clear Signature</Trans>}
        </button>
      </div>

      {isSignatureValid === false && (
        <div
          className={cn('absolute bottom-4 left-4 flex gap-2 transition-opacity duration-100', {
            'pointer-events-none opacity-0': isPressed,
          })}
        >
          <span className="text-destructive text-xs">
            {kind === 'initials' ? 'Initials are too small' : <Trans>Signature is too small</Trans>}
          </span>
        </div>
      )}

      {isSignatureValid && lines.length > 0 && (
        <div
          className={cn('absolute bottom-4 left-4 flex gap-2 transition-opacity duration-100', {
            'pointer-events-none opacity-0': isPressed,
          })}
        >
          <button
            type="button"
            title={t`Undo`}
            className="rounded-full p-0 text-[0.688rem] text-muted-foreground/60 ring-offset-background hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onUndoClick}
          >
            <Undo2 className="h-4 w-4" />
            <span className="sr-only">
              <Trans>Undo</Trans>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

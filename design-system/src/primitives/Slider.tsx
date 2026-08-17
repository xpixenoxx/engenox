// design-system/src/primitives/Slider.tsx
// Slider — 4-position autonomy dial (snapped positions)

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { clsx } from 'clsx';

// Radix Slider uses number[] for multi-thumb but accepts number for single-thumb
// We override to support both for flexibility
export type SliderProps = Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value' | 'defaultValue' | 'onValueChange'> & {
  marks?: { value: number; label: string }[];
  value?: number | number[];
  defaultValue?: number | number[];
  onValueChange?: (value: number | number[]) => void;
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, marks, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={clsx('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-muted">
      <SliderPrimitive.Range className="absolute h-full bg-brand" />
    </SliderPrimitive.Track>
    {marks && marks.map((mark) => (
      <div
        key={mark.value}
        className="absolute bottom-full mb-1 text-body-xs text-text-muted font-mono"
        style={{ left: `${(mark.value / 3) * 100}%`, transform: 'translateX(-50%)' }}
      >
        {mark.label}
      </div>
    ))}
    <SliderPrimitive.Thumb
      className={clsx(
        'block h-5 w-5 rounded-full border-2 border-surface-raised bg-brand shadow-sm',
        'transition-transform duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50'
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
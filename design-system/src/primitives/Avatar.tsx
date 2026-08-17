// design-system/src/primitives/Avatar.tsx
// Avatar — entity avatar (fallback initials, provenance badge slot)

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { clsx } from 'clsx';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }
>(({ className, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    xs: 'h-5 w-5 text-body-xs',
    sm: 'h-7 w-7 text-body-sm',
    md: 'h-9 w-9 text-body-sm',
    lg: 'h-11 w-11 text-body-base',
    xl: 'h-14 w-14 text-body-lg',
  };
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={clsx('relative inline-flex shrink-0 overflow-hidden rounded-full', sizeClasses[size], className)}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={clsx('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & { initials?: string }
>(({ className, initials, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={clsx(
      'flex h-full w-full items-center justify-center rounded-full bg-brand/10 text-brand font-medium',
      className
    )}
    {...props}
  >
    {initials}
  </AvatarPrimitive.Fallback>
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
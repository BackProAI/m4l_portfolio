import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Card Component - Container for sections
// ============================================================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-background border border-border-light',
      bordered: 'bg-background border-2 border-border',
      elevated: 'bg-background shadow-md',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl p-6 transition-shadow',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// ============================================================================
// Card Header Component
// ============================================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mb-4 space-y-1.5', className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

// ============================================================================
// Card Title Component
// ============================================================================

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight text-neutral-800',
          className
        )}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

// ============================================================================
// Card Description Component
// ============================================================================

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-neutral-500', className)}
      {...props}
    />
  );
});

CardDescription.displayName = 'CardDescription';

// ============================================================================
// Card Content Component
// ============================================================================

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn('', className)} {...props} />;
  }
);

CardContent.displayName = 'CardContent';

// ============================================================================
// Card Footer Component
// ============================================================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('mt-4 flex items-center gap-4', className)}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// ============================================================================
// Exports
// ============================================================================

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};

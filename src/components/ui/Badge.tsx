import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Badge Component - For status indicators and labels
// ============================================================================

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'warning'
    | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default:
        'bg-neutral-100 text-neutral-800 border border-neutral-200',
      primary:
        'bg-primary-100 text-primary-700 border border-primary-200',
      secondary:
        'bg-secondary-100 text-secondary-700 border border-secondary-200',
      success:
        'bg-green-100 text-green-700 border border-green-200',
      error:
        'bg-red-100 text-red-700 border border-red-200',
      warning:
        'bg-yellow-100 text-yellow-700 border border-yellow-200',
      info:
        'bg-blue-100 text-blue-700 border border-blue-200',
    };

    const sizes = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base px-3 py-1.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full whitespace-nowrap',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Button Component - mlfs.com.au Themed
// ============================================================================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-600 focus-visible:ring-primary-500',
      secondary:
        'bg-secondary text-white hover:bg-secondary-600 focus-visible:ring-secondary-500',
      accent:
        'bg-accent text-white hover:bg-accent-600 focus-visible:ring-accent-500',
      ghost:
        'text-primary hover:bg-primary-50 focus-visible:ring-primary-500',
      outline:
        'border-2 border-primary text-primary hover:bg-primary-50 focus-visible:ring-primary-500',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm rounded-md',
      md: 'h-11 px-6 text-base rounded-lg',
      lg: 'h-14 px-8 text-lg rounded-xl',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          isLoading && 'relative',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {isLoading && loadingText ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

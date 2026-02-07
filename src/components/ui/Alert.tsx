import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Alert Component - For displaying messages
// ============================================================================

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  title?: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = 'info', icon, title, children, ...props },
    ref
  ) => {
    const variants = {
      info: {
        container: 'bg-blue-50 border-info text-info',
        icon: (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      success: {
        container: 'bg-green-50 border-success text-success',
        icon: (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      warning: {
        container: 'bg-yellow-50 border-warning text-warning',
        icon: (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      error: {
        container: 'bg-red-50 border-error text-error',
        icon: (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
    };

    const variantConfig = variants[variant];
    const displayIcon = icon !== undefined ? icon : variantConfig.icon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative rounded-lg border-l-4 p-4',
          variantConfig.container,
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {displayIcon && (
            <div className="flex-shrink-0 mt-0.5">{displayIcon}</div>
          )}

          <div className="flex-1 min-w-0">
            {title && (
              <h5 className="mb-1 font-semibold text-inherit">{title}</h5>
            )}
            {children && (
              <div className="text-sm opacity-90">{children}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };

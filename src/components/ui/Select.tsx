import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Select Component - Dropdown for questionnaire
// ============================================================================

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, helperText, children, required, ...props },
    ref
  ) => {
    const id = React.useId();
    const selectId = props.id || id;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            {label}
            {required && <span className="ml-1 text-error">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-lg border px-4 py-3 pr-10 text-base transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-error bg-red-50 focus:ring-error'
                : 'border-border bg-background hover:border-primary-400',
              className
            )}
            required={required}
            {...props}
          >
            {children}
          </select>

          {/* Dropdown arrow icon */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {error && (
          <p className="mt-1.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };

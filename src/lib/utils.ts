import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx (for conditional classes) and twMerge (for deduplication)
 * 
 * @param inputs - Class values to merge
 * @returns Merged className string
 * 
 * @example
 * cn('px-4 py-2', condition && 'bg-primary', 'px-6')
 * // Result: 'px-6 py-2 bg-primary' (px-6 overrides px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

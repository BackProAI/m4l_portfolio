'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';

// ============================================================================
// LoadingAnimation Component - Enhanced loading state with rotating messages
// ============================================================================

const LOADING_MESSAGES = [
  'Analysing portfolio composition...',
  'Evaluating asset allocation...',
  'Assessing risk profile...',
  'Comparing to benchmarks...',
  'Calculating fees and costs...',
  'Reviewing fund performance...',
  'Analysing diversification...',
  'Running stress test scenarios...',
  'Generating comprehensive analysis...',
];

export function LoadingAnimation() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500); // Change message every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Animated Spinner */}
          <div className="relative w-24 h-24">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
            
            {/* Spinning ring */}
            <div 
              className="absolute inset-0 border-4 border-transparent border-t-primary border-r-primary rounded-full animate-spin"
              style={{ animationDuration: '1.5s' }}
            ></div>
            
            {/* Inner pulsing circle */}
            <div 
              className="absolute inset-3 bg-primary-100 rounded-full animate-pulse"
              style={{ animationDuration: '2s' }}
            ></div>
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>

          {/* Loading message */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-primary">
              Analysing Your Portfolio
            </h3>
            <p 
              className="text-neutral-600 min-h-[24px] transition-opacity duration-500"
              key={messageIndex}
            >
              {LOADING_MESSAGES[messageIndex]}
            </p>
            <p className="text-sm text-neutral-500">
              This typically takes 30-60 seconds
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '1.5s',
                }}
              ></div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';

// ============================================================================
// LoadingAnimation Component - Progress ring with live % from backend steps
// ============================================================================

const LOADING_MESSAGES = [
  'Analysing portfolio composition...',
  'Evaluating asset allocation...',
  'Assessing risk profile...',
  'Calculating fees and costs...',
  'Reviewing fund performance...',
  'Analysing diversification...',
  'Running stress test scenarios...',
  'Generating comprehensive analysis...',
];

interface LoadingAnimationProps {
  /** 0-100. When undefined the component cycles messages and shows an indeterminate ring. */
  progress?: number;
  /** Short label emitted by the backend for the current step. */
  progressLabel?: string;
}

export function LoadingAnimation({ progress, progressLabel }: LoadingAnimationProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle generic messages only when we have no backend label
  useEffect(() => {
    if (progressLabel) return;
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [progressLabel]);

  // SVG arc progress ring
  const SIZE = 96;         // px — matches the w-24 h-24 wrapper
  const STROKE = 4;
  const RADIUS = (SIZE - STROKE) / 2; // 44
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~276.5

  const hasProgress = typeof progress === 'number';
  const pct = hasProgress ? Math.min(Math.max(progress, 0), 100) : 0;
  const dashOffset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

  return (
    <Card>
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Progress ring */}
          <div className="relative" style={{ width: SIZE, height: SIZE }}>
            <svg
              width={SIZE}
              height={SIZE}
              className="-rotate-90"   /* start arc from top */
            >
              {/* Track */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-primary-200"
                strokeWidth={STROKE}
              />
              {/* Progress arc */}
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                className="text-primary transition-all duration-700 ease-out"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={hasProgress ? dashOffset : CIRCUMFERENCE * 0.25}
                style={
                  hasProgress
                    ? undefined
                    : { animation: 'spin 1.5s linear infinite', transformOrigin: `${SIZE / 2}px ${SIZE / 2}px` }
                }
              />
            </svg>

            {/* Centre — percentage or spinner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {hasProgress ? (
                <span className="text-primary font-bold text-lg leading-none select-none">
                  {Math.round(pct)}%
                </span>
              ) : (
                /* Fallback pulse dot when no progress signal yet */
                <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          </div>

          {/* Message area */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-primary">
              Analysing Your Portfolio
            </h3>
            <p
              className="text-neutral-600 min-h-[24px] transition-opacity duration-500"
              key={progressLabel ?? messageIndex}
            >
              {progressLabel ?? LOADING_MESSAGES[messageIndex]}
            </p>
          </div>

          {/* Progress dots (only shown while indeterminate) */}
          {!hasProgress && (
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s`, animationDuration: '1.5s' }}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

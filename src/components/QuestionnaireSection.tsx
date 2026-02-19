'use client';

import * as React from 'react';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { InvestorProfile } from '@/types';

// ============================================================================
// QuestionnaireSection Component - Five investor profile questions
// ============================================================================

export interface QuestionnaireSectionProps {
  profile: InvestorProfile;
  onChange: (profile: InvestorProfile) => void;
  onComplete?: (isComplete: boolean) => void;
}

export function QuestionnaireSection({
  profile,
  onChange,
  onComplete,
}: QuestionnaireSectionProps) {
  // Calculate completion status
  const completedCount = React.useMemo(() => {
    let count = 0;
    if (profile.name && profile.name.trim() !== '') count++;
    if (profile.investorType) count++;
    if (profile.phase) count++;
    if (profile.ageRange) count++;
    if (typeof profile.fundCommentary === 'boolean') count++;
    if (typeof profile.includeRiskSummary === 'boolean') count++;
    if (typeof profile.isIndustrySuperFund === 'boolean') {
      count++;
      // If industry super fund is Yes, check conditional fields
      if (profile.isIndustrySuperFund) {
        if (profile.industrySuperFundName && profile.industrySuperFundName.trim() !== '') count++;
        if (profile.industrySuperFundRiskProfile && ['High Growth', 'Growth', 'Balanced', 'Conservative', 'Defensive'].includes(profile.industrySuperFundRiskProfile)) count++;
      }
    }
    return count;
  }, [profile]);

  // Calculate total required fields
  const totalFields = React.useMemo(() => {
    let total = 7; // Base questions: name, investorType, phase, ageRange, fundCommentary, includeRiskSummary, isIndustrySuperFund
    if (profile.isIndustrySuperFund === true) {
      total += 2; // Add conditional fields: industrySuperFundName, industrySuperFundRiskProfile
    }
    return total;
  }, [profile.isIndustrySuperFund]);

  const isComplete = completedCount === totalFields;

  // Notify parent when completion status changes
  React.useEffect(() => {
    if (onComplete) {
      onComplete(isComplete);
    }
  }, [isComplete, onComplete]);

  // Handle field changes
  const handleChange = (field: keyof InvestorProfile, value: any) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Investment Profile</CardTitle>
            <CardDescription>
              Please answer all questions to proceed
            </CardDescription>
          </div>
          <Badge
            variant={isComplete ? 'success' : 'warning'}
            size="lg"
          >
            {completedCount}/{totalFields} Complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Question 0: Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Your Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={profile.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Question 1: Investor Type */}
          <Select
            label="What type of investor are you?"
            required
            value={profile.investorType}
            onChange={(e) =>
              handleChange('investorType', e.target.value)
            }
          >
            <option value="">Select an option...</option>
            <option value="High Growth">High Growth</option>
            <option value="Growth">Growth</option>
            <option value="Balanced">Balanced</option>
            <option value="Conservative">Conservative</option>
            <option value="Defensive">Defensive</option>
          </Select>

          {/* Question 2: Phase */}
          <Select
            label="What phase are you in?"
            required
            value={profile.phase}
            onChange={(e) => handleChange('phase', e.target.value)}
          >
            <option value="">Select an option...</option>
            <option value="Accumulation">Accumulation</option>
            <option value="Investment">Investment</option>
            <option value="Non-super">Non-super</option>
            <option value="Pension">Pension</option>
          </Select>

          {/* Question 3: Age Range */}
          <Select
            label="How old are you?"
            required
            value={profile.ageRange}
            onChange={(e) => handleChange('ageRange', e.target.value)}
          >
            <option value="">Select an option...</option>
            <option value="Under 40">Under 40</option>
            <option value="40-60">40-60</option>
            <option value="60-80">60-80</option>
            <option value="80+">80+</option>
          </Select>

          {/* Question 4: Fund Commentary */}
          <Select
            label="Give me a commentary on each managed fund?"
            required
            value={
              profile.fundCommentary === true
                ? 'yes'
                : profile.fundCommentary === false
                ? 'no'
                : ''
            }
            onChange={(e) =>
              handleChange(
                'fundCommentary',
                e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined
              )
            }
          >
            <option value="">Select an option...</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>

          {/* Question 5: Include Portfolio Risk Summary */}
          <div className="md:col-span-2">
            <Select
              label="Include Portfolio Risk Summary? (Will take 5-7 minutes)"
              required
              value={
                profile.includeRiskSummary === true
                  ? 'yes'
                  : profile.includeRiskSummary === false
                  ? 'no'
                  : ''
              }
              onChange={(e) =>
                handleChange(
                  'includeRiskSummary',
                  e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined
                )
              }
            >
              <option value="">Select an option...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>

          {/* Question 6: Industry Super Fund - Full width span */}
          <div className="md:col-span-2">
            <Select
              label="Is this portfolio from an industry super fund?"
              required
              value={
                profile.isIndustrySuperFund === true
                  ? 'yes'
                  : profile.isIndustrySuperFund === false
                  ? 'no'
                  : ''
              }
              onChange={(e) =>
                handleChange(
                  'isIndustrySuperFund',
                  e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined
                )
              }
            >
              <option value="">Select an option...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </Select>
          </div>

          {/* Conditional fields shown when Industry Super Fund = Yes */}
          {profile.isIndustrySuperFund === true && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Name of Industry Super Fund <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., HOSTPLUS, Australian Super, Cbus"
                  value={profile.industrySuperFundName || ''}
                  onChange={(e) => handleChange('industrySuperFundName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <Select
                  label="Risk Profile of Your Industry Super Fund Investment"
                  required
                  value={profile.industrySuperFundRiskProfile || ''}
                  onChange={(e) => handleChange('industrySuperFundRiskProfile', e.target.value)}
                >
                  <option value="">Select a risk profile...</option>
                  <option value="High Growth">High Growth</option>
                  <option value="Growth">Growth</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Conservative">Conservative</option>
                  <option value="Defensive">Defensive</option>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Completion indicator */}
        {isComplete && (
          <div className="mt-6 p-4 bg-success/10 border border-success rounded-lg">
            <p className="text-success text-sm font-medium flex items-center gap-2">
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
              All questions answered! You can now proceed to upload your portfolio documents.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

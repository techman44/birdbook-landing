'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type IdentificationOption } from '@/lib/api/identification';

interface AIOptionsSelectorProps {
  options: IdentificationOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function AIOptionsSelector({ options, selectedIndex, onSelect }: AIOptionsSelectorProps) {
  if (options.length === 0) return null;

  // If only one option, just show it without selection
  if (options.length === 1) {
    const option = options[0];
    return (
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{option.species}</h3>
            {option.reasoning && (
              <p className="text-sm text-gray-600 mt-2">{option.reasoning}</p>
            )}
          </div>
          <div className="text-right">
            <div
              className={cn(
                'text-2xl font-bold',
                option.confidence >= 0.9
                  ? 'text-emerald-600'
                  : option.confidence >= 0.7
                  ? 'text-amber-600'
                  : 'text-red-600'
              )}
            >
              {Math.round(option.confidence * 100)}%
            </div>
            <div className="text-xs text-gray-500">confidence</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 text-center">Select the correct identification:</p>
      {options.map((option, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className={cn(
            'w-full bg-white rounded-xl border-2 p-4 text-left transition-all',
            selectedIndex === index
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 hover:border-gray-300'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {/* Radio indicator */}
              <div
                className={cn(
                  'mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  selectedIndex === index
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-gray-300'
                )}
              >
                {selectedIndex === index && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">{option.species}</h3>
                {option.reasoning && (
                  <p className="text-sm text-gray-600 mt-1">{option.reasoning}</p>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-2">
              <div
                className={cn(
                  'text-lg font-bold',
                  option.confidence >= 0.9
                    ? 'text-emerald-600'
                    : option.confidence >= 0.7
                    ? 'text-amber-600'
                    : 'text-red-600'
                )}
              >
                {Math.round(option.confidence * 100)}%
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

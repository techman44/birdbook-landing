'use client';

import { useState } from 'react';
import { Check, RefreshCw, MapPin, Share2, AlertTriangle, Bird, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  type IdentificationResult as IdentificationResultType,
  type IdentificationOption,
  getConfidenceLevel,
  getImageUrl,
} from '@/lib/api/identification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface IdentificationResultProps {
  result: IdentificationResultType;
  status: string;
  progress: number;
  onReIdentify?: () => void;
  onShare?: () => void;
  isReIdentifying?: boolean;
}

export function IdentificationResult({
  result,
  status,
  progress,
  onReIdentify,
  onShare,
  isReIdentifying = false,
}: IdentificationResultProps) {
  const { accessToken } = useAuthStore();
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = getImageUrl(result.id, accessToken || '');
  const confidence = result.consensus_confidence ?? result.confidence ?? 0;
  const confidenceLevel = getConfidenceLevel(confidence);
  const confidencePercent = Math.round(confidence * 100);

  // Get all options (AI suggestions)
  const options = result.options ?? [];
  const displayOptions = showAllOptions ? options : options.slice(0, 1);

  const isProcessing = status === 'analyzing' || status === 'verifying' || status === 'uploading';

  return (
    <Card className="overflow-hidden">
      {/* Image */}
      <div className="relative aspect-video bg-gray-100">
        {!imageError ? (
          <img
            src={imageUrl}
            alt={result.consensus_species || 'Bird identification'}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Bird className="h-24 w-24 text-gray-300" />
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
            <RefreshCw className="h-8 w-8 animate-spin mb-4" />
            <p className="text-lg font-medium">
              {status === 'uploading' && 'Uploading...'}
              {status === 'analyzing' && 'Analyzing image...'}
              {status === 'verifying' && 'AI verification in progress...'}
            </p>
            <Progress value={progress} className="w-48 mt-4" />
          </div>
        )}

        {/* Confidence badge */}
        {!isProcessing && confidence > 0 && (
          <div className="absolute bottom-2 right-2">
            <Badge
              className={cn(
                'text-sm',
                confidenceLevel.bgColor,
                confidenceLevel.color.replace('text-', 'text-')
              )}
            >
              {confidencePercent}% {confidenceLevel.label}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Main result */}
        {!isProcessing && result.consensus_species && (
          <div>
            <h2 className="text-2xl font-bold">{result.consensus_species}</h2>
            {result.reasoning && (
              <p className="text-sm text-muted-foreground mt-2">{result.reasoning}</p>
            )}
          </div>
        )}

        {/* Location */}
        {result.location_name && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{result.location_name}</span>
          </div>
        )}

        {/* Alternative suggestions */}
        {options.length > 1 && !isProcessing && (
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAllOptions(!showAllOptions)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {showAllOptions ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide alternatives
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show {options.length - 1} alternative{options.length > 2 ? 's' : ''}
                </>
              )}
            </button>

            {showAllOptions && (
              <div className="mt-3 space-y-3">
                {options.slice(1).map((option, index) => (
                  <OptionCard key={index} option={option} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bird info */}
        {result.bird_info && !isProcessing && (
          <BirdInfoSection birdInfo={result.bird_info} />
        )}

        {/* Actions */}
        {!isProcessing && (
          <div className="flex gap-3 pt-4 border-t">
            {onReIdentify && (
              <Button
                variant="outline"
                onClick={onReIdentify}
                disabled={isReIdentifying}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isReIdentifying && 'animate-spin')} />
                Re-identify
              </Button>
            )}
            {onShare && (
              <Button onClick={onShare} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Share2 className="h-4 w-4" />
                Share Sighting
              </Button>
            )}
          </div>
        )}

        {/* Low confidence warning */}
        {!isProcessing && confidence < 0.5 && confidence > 0 && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Low confidence identification</p>
              <p className="text-amber-700">
                The AI is not very confident about this identification. Consider taking another
                photo with better lighting or a clearer view of the bird.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptionCard({ option }: { option: IdentificationOption }) {
  const confidenceLevel = getConfidenceLevel(option.confidence);
  const confidencePercent = Math.round(option.confidence * 100);

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <p className="font-medium">{option.species}</p>
        <Badge variant="outline" className={cn('text-xs', confidenceLevel.color)}>
          {confidencePercent}%
        </Badge>
      </div>
      {option.reasoning && (
        <p className="text-sm text-muted-foreground mt-1">{option.reasoning}</p>
      )}
    </div>
  );
}

function BirdInfoSection({ birdInfo }: { birdInfo: NonNullable<IdentificationResultType['bird_info']> }) {
  const [expanded, setExpanded] = useState(false);

  const infoItems = [
    { label: 'Habitat', value: birdInfo.habitat },
    { label: 'Distribution', value: birdInfo.distribution },
    { label: 'Size', value: birdInfo.size },
    { label: 'Diet', value: birdInfo.diet },
    { label: 'Behavior', value: birdInfo.behavior },
    { label: 'Conservation Status', value: birdInfo.conservation_status },
  ].filter((item) => item.value);

  const expandedItems = [
    { label: 'Breeding', value: birdInfo.breeding_info },
    { label: 'Calls & Vocalizations', value: birdInfo.calls_vocalizations },
    { label: 'Migration', value: birdInfo.migration_patterns },
    { label: 'Interesting Facts', value: birdInfo.interesting_facts },
    { label: 'Indigenous Significance', value: birdInfo.indigenous_significance },
    { label: 'Similar Species', value: birdInfo.similar_species },
  ].filter((item) => item.value);

  if (infoItems.length === 0 && expandedItems.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <h3 className="font-semibold mb-3">About this bird</h3>
      <div className="space-y-2">
        {infoItems.map((item) => (
          <div key={item.label} className="text-sm">
            <span className="font-medium text-gray-600">{item.label}:</span>{' '}
            <span>{item.value}</span>
          </div>
        ))}

        {expanded &&
          expandedItems.map((item) => (
            <div key={item.label} className="text-sm">
              <span className="font-medium text-gray-600">{item.label}:</span>{' '}
              <span>{item.value}</span>
            </div>
          ))}

        {expandedItems.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}

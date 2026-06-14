'use client';

import { Leaf, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ConservationBadgeProps {
  status: string | null;
  className?: string;
}

// IUCN Conservation Status codes and their colors
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LC: { label: 'Least Concern', color: 'text-green-700', bgColor: 'bg-green-100 hover:bg-green-200' },
  NT: { label: 'Near Threatened', color: 'text-lime-700', bgColor: 'bg-lime-100 hover:bg-lime-200' },
  VU: { label: 'Vulnerable', color: 'text-yellow-700', bgColor: 'bg-yellow-100 hover:bg-yellow-200' },
  EN: { label: 'Endangered', color: 'text-orange-700', bgColor: 'bg-orange-100 hover:bg-orange-200' },
  CR: { label: 'Critically Endangered', color: 'text-red-700', bgColor: 'bg-red-100 hover:bg-red-200' },
  EW: { label: 'Extinct in the Wild', color: 'text-purple-700', bgColor: 'bg-purple-100 hover:bg-purple-200' },
  EX: { label: 'Extinct', color: 'text-gray-700', bgColor: 'bg-gray-200 hover:bg-gray-300' },
  DD: { label: 'Data Deficient', color: 'text-gray-600', bgColor: 'bg-gray-100 hover:bg-gray-200' },
  NE: { label: 'Not Evaluated', color: 'text-gray-500', bgColor: 'bg-gray-100 hover:bg-gray-200' },
};

function parseConservationStatus(status: string | null): { code: string; fullText: string; description: string } | null {
  if (!status) return null;

  // Try to extract the code from formats like:
  // "LC (Least Concern) – population stable overall..."
  // "EN (Endangered) - declining population..."
  // "LC (Least Concern). Global populations recovered..."
  const match = status.match(/^([A-Z]{2})\s*\(([^)]+)\)\s*[–\-.]?\s*(.*)$/);

  if (match) {
    return {
      code: match[1],
      fullText: `${match[1]} (${match[2]})`,
      description: match[3].trim(),
    };
  }

  // Fallback: just try to get the first two capital letters
  const codeMatch = status.match(/^([A-Z]{2})/);
  if (codeMatch) {
    return {
      code: codeMatch[1],
      fullText: status.split('–')[0].split('-')[0].split('.')[0].trim(),
      description: status.includes('–') ? status.split('–')[1].trim() :
                   status.includes('-') ? status.split('-').slice(1).join('-').trim() : '',
    };
  }

  // Last resort: value with no recognizable IUCN code. Show a clamped label
  // so long free-text descriptions don't overflow their container.
  return {
    code: status.trim(),
    fullText: status.trim(),
    description: '',
  };
}

export function ConservationBadge({ status, className }: ConservationBadgeProps) {
  const parsed = parseConservationStatus(status);

  if (!parsed) return null;

  const config = statusConfig[parsed.code] || statusConfig.NE;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-colors flex items-center gap-1 text-xs font-medium border-0',
            config.bgColor,
            config.color,
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Leaf className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[10rem]">{parsed.code}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={cn('border-0', config.bgColor, config.color)}>
              <Leaf className="h-3 w-3 mr-1" />
              {parsed.fullText}
            </Badge>
          </div>
          {parsed.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {parsed.description}
            </p>
          )}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              IUCN Red List Conservation Status
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

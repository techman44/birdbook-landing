import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format shutter speed to standard photography format (e.g., 1/640s)
 * Handles both decimal values (0.0015625) and already formatted strings (1/640s)
 */
export function formatShutterSpeed(value: string | number | null | undefined): string | null {
  if (!value) return null;

  const str = String(value);

  // Already in fraction format (e.g., "1/640s" or "1/640")
  if (str.includes('/')) {
    return str.endsWith('s') ? str : `${str}s`;
  }

  // Remove trailing 's' if present to parse the number
  const numStr = str.replace(/s$/i, '');
  const num = parseFloat(numStr);

  if (isNaN(num)) return str;

  // Convert decimal to fraction format
  if (num < 1) {
    const denominator = Math.round(1 / num);
    return `1/${denominator}s`;
  }

  // For slow shutter speeds (1 second or more), show as decimal
  return `${num.toFixed(2)}s`;
}

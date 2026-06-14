'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadImage,
  getIdentificationStatus,
  reIdentify,
  identifyRegion,
  type IdentificationResult,
  type UploadOptions,
  type BirdDetection,
  type IdentificationOption,
  type RegionIdentifyResult,
} from '../api/identification';

export type IdentifyStatus =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'verifying'
  | 'complete'
  | 'failed'
  | 'error';

interface UseIdentifyReturn {
  status: IdentifyStatus;
  progress: number;
  result: IdentificationResult | null;
  error: string | null;
  upload: (file: File, options?: UploadOptions) => Promise<void>;
  reset: () => void;
  reIdentify: (possiblyIncorrect?: boolean, suggestedSpecies?: string) => Promise<void>;
}

export function useIdentify(): UseIdentifyReturn {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<IdentifyStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const failureCountRef = useRef(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    failureCountRef.current = 0;
  }, []);

  const startPolling = useCallback((identificationId: number) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const statusResult = await getIdentificationStatus(identificationId);
        failureCountRef.current = 0;

        if (statusResult.status === 'complete') {
          stopPolling();
          setStatus('complete');
          setProgress(100);
          setResult(statusResult);
          // Invalidate my-birds query to show new identification
          queryClient.invalidateQueries({ queryKey: ['my-birds'] });
        } else if (statusResult.status === 'failed') {
          stopPolling();
          setStatus('failed');
          setError('Identification failed. Please try again.');
        } else if (statusResult.status === 'verifying') {
          setStatus('verifying');
          setProgress(80);
        } else if (statusResult.status === 'analyzing') {
          setStatus('analyzing');
          setProgress(60);
        }
      } catch (err) {
        failureCountRef.current++;
        console.error('[useIdentify] Poll error:', err);

        if (failureCountRef.current >= 3) {
          stopPolling();
          // Don't set error - just stop polling, the result might still be valid
          setStatus('complete');
        }
      }
    }, 3000);
  }, [stopPolling, queryClient]);

  const upload = useCallback(
    async (file: File, options?: UploadOptions) => {
      try {
        setStatus('uploading');
        setProgress(10);
        setError(null);
        setResult(null);

        const uploadResult = await uploadImage(file, options);
        setProgress(70);

        // Check if we need to poll for verification
        if (uploadResult.status === 'analyzing' || uploadResult.status === 'verifying') {
          setStatus(uploadResult.status);
          setResult(uploadResult);
          startPolling(uploadResult.id);
        } else if (uploadResult.status === 'complete' || uploadResult.status === 'uploaded') {
          setStatus('complete');
          setProgress(100);
          setResult(uploadResult);
          // Invalidate my-birds query to show new identification
          queryClient.invalidateQueries({ queryKey: ['my-birds'] });
        } else if (uploadResult.status === 'failed') {
          setStatus('failed');
          setError('Identification failed. Please try again.');
        }
      } catch (err) {
        console.error('[useIdentify] Upload error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [startPolling, queryClient]
  );

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  }, [stopPolling]);

  const handleReIdentify = useCallback(
    async (possiblyIncorrect?: boolean, suggestedSpecies?: string) => {
      if (!result?.id) return;

      try {
        setStatus('analyzing');
        setProgress(30);

        const reidentifyResult = await reIdentify(result.id, possiblyIncorrect, suggestedSpecies);

        // Re-identify now returns candidate options without applying them to
        // the record; merge them into the local result for display.
        setStatus('complete');
        setProgress(100);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                options: reidentifyResult.options,
                species: reidentifyResult.species,
                confidence: reidentifyResult.confidence,
                reasoning: reidentifyResult.reasoning,
              }
            : prev
        );
      } catch (err) {
        console.error('[useIdentify] Re-identify error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Re-identification failed');
      }
    },
    [result, startPolling]
  );

  return {
    status,
    progress,
    result,
    error,
    upload,
    reset,
    reIdentify: handleReIdentify,
  };
}

// ---------------------------------------------------------------------------
// Multi-bird tap-to-identify
// ---------------------------------------------------------------------------

/** Per-bird identification state for a multi-bird photo. */
export interface BirdRegionResult {
  species: string;
  confidence: number;
  reasoning: string;
  options: IdentificationOption[];
}

const sameBox = (
  a: [number, number, number, number],
  b: [number, number, number, number]
) => a.every((v, i) => Math.abs(v - b[i]) < 0.02);

interface UseMultiBirdArgs {
  identificationId: number | string | null | undefined;
  detections: BirdDetection[];
  /** model_results from the record — region entries seed already-identified birds. */
  modelResults?: IdentificationResult['model_results'] | null;
}

/**
 * Drives the Vision-Pro style multi-bird flow: bird #1 (highest detector
 * confidence) is the primary auto-identified bird; tapping another chip crops
 * + identifies that region server-side. Results are cached per bird index.
 */
export function useMultiBird({ identificationId, detections, modelResults }: UseMultiBirdArgs) {
  const [selectedBird, setSelectedBird] = useState(0);
  const [regionResults, setRegionResults] = useState<Record<number, BirdRegionResult>>({});
  const [loadingBird, setLoadingBird] = useState<number | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);

  // Seed already-identified birds from persisted model_results region entries
  useEffect(() => {
    if (!modelResults || detections.length < 2) return;
    const seeded: Record<number, BirdRegionResult> = {};
    for (const mr of modelResults) {
      if (!mr.region) continue;
      const idx = detections.findIndex((d) => sameBox(d.box, mr.region!));
      if (idx >= 0 && !seeded[idx]) {
        seeded[idx] = {
          species: mr.top_prediction,
          confidence: mr.confidence,
          reasoning: mr.reasoning || '',
          options: mr.options || [
            {
              species: mr.top_prediction,
              confidence: mr.confidence,
              reasoning: mr.reasoning || '',
            },
          ],
        };
      }
    }
    if (Object.keys(seeded).length > 0) {
      setRegionResults((prev) => ({ ...seeded, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identificationId, detections.length]);

  const regionMutation = useMutation({
    mutationFn: ({ box }: { index: number; box: [number, number, number, number] }) => {
      if (!identificationId) throw new Error('No identification to refine');
      return identifyRegion(identificationId, box);
    },
    onMutate: ({ index }) => {
      setLoadingBird(index);
      setRegionError(null);
    },
    onSuccess: (data: RegionIdentifyResult, { index }) => {
      setRegionResults((prev) => ({
        ...prev,
        [index]: {
          species: data.species,
          confidence: data.confidence,
          reasoning: data.reasoning,
          options: data.options,
        },
      }));
      setSelectedBird(index);
    },
    onError: (err: Error) => {
      setRegionError(err.message || 'Bird identification failed');
    },
    onSettled: () => setLoadingBird(null),
  });

  const selectBird = useCallback(
    (index: number) => {
      setRegionError(null);
      if (index === 0) {
        setSelectedBird(0);
        return;
      }
      if (regionResults[index]) {
        setSelectedBird(index);
        return;
      }
      const det = detections[index];
      if (!det || regionMutation.isPending) return;
      regionMutation.mutate({ index, box: det.box });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detections, regionResults, regionMutation.isPending, identificationId]
  );

  const reset = useCallback(() => {
    setSelectedBird(0);
    setRegionResults({});
    setLoadingBird(null);
    setRegionError(null);
  }, []);

  return {
    /** True when the indicator overlay + per-bird UI should be shown. */
    isMultiBird: detections.length >= 2,
    selectedBird,
    selectBird,
    loadingBird,
    regionResults,
    regionError,
    identifiedIndexes: [0, ...Object.keys(regionResults).map(Number)],
    reset,
  };
}

/** Pull a normalized detections array out of an identification response. */
export function getDetections(
  result: Pick<IdentificationResult, 'detections'> | null | undefined
): BirdDetection[] {
  return result?.detections?.detections ?? [];
}

// Hook for fetching My Birds with infinite scroll
export function useMyBirds() {
  const { useInfiniteQuery } = require('@tanstack/react-query');
  const { getMyBirds } = require('../api/identification');

  return useInfiniteQuery({
    queryKey: ['my-birds'],
    queryFn: async ({ pageParam = 1 }) => {
      return getMyBirds(pageParam, 24);
    },
    getNextPageParam: (lastPage: { has_more: boolean; sightings: unknown[] }) => {
      if (!lastPage.has_more) return undefined;
      const currentPage = Math.ceil(lastPage.sightings.length / 24);
      return currentPage + 1;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });
}

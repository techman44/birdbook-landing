'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFeed,
  addReaction,
  removeReaction,
  addDiscussionReaction,
  removeDiscussionReaction,
  type FeedParams,
  type ReactionType,
} from '../api/social';

export function useFeed(params: Omit<FeedParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: ['feed', params],
    queryFn: async ({ pageParam = 1 }) => {
      return getFeed({ ...params, page: pageParam, limit: 20 });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60_000,
  });
}

/**
 * A reaction target — points at either a sighting (feed/library/profile/groups)
 * or a discussion (groups only). Lets one hook serve every surface that shows
 * a reactable item.
 */
export type ReactionTargetKind = 'sighting' | 'discussion';

export interface ReactionTarget {
  kind: ReactionTargetKind;
  id: number;
  reactionType: ReactionType;
  isReacted: boolean;
}

interface ReactableItem {
  id: number;
  item_type?: 'sighting' | 'discussion';
  love_count: number;
  seen_too_count: number;
  user_loved: boolean;
  user_seen_too: boolean;
}

function applyReactionDelta<T extends ReactableItem>(item: T, target: ReactionTarget): T {
  const itemKind: ReactionTargetKind = item.item_type ?? 'sighting';
  if (item.id !== target.id || itemKind !== target.kind) return item;

  const delta = target.isReacted ? -1 : 1;
  if (target.reactionType === 'love') {
    return {
      ...item,
      user_loved: !target.isReacted,
      love_count: Math.max(0, item.love_count + delta),
    };
  }
  return {
    ...item,
    user_seen_too: !target.isReacted,
    seen_too_count: Math.max(0, item.seen_too_count + delta),
  };
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (target: ReactionTarget) => {
      if (target.kind === 'sighting') {
        if (target.isReacted) {
          await removeReaction('sighting', target.id, target.reactionType);
        } else {
          await addReaction('sighting', target.id, target.reactionType);
        }
      } else {
        if (target.isReacted) {
          await removeDiscussionReaction(target.id, target.reactionType);
        } else {
          await addDiscussionReaction(target.id, target.reactionType);
        }
      }
      return target;
    },
    onMutate: async (target) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['feed'] }),
        queryClient.cancelQueries({ queryKey: ['group-posts'] }),
        queryClient.cancelQueries({ queryKey: ['sighting'] }),
        queryClient.cancelQueries({ queryKey: ['my-birds'] }),
      ]);

      // Feed: infinite list of sightings under each page
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            sightings: page.sightings.map((s: ReactableItem) => applyReactionDelta(s, target)),
          })),
        };
      });

      // Group combined feed: flat posts array
      queryClient.setQueriesData({ queryKey: ['group-posts'] }, (old: any) => {
        if (!old?.posts) return old;
        return {
          ...old,
          posts: old.posts.map((p: ReactableItem) => applyReactionDelta(p, target)),
        };
      });

      // Single sighting detail page
      if (target.kind === 'sighting') {
        queryClient.setQueriesData({ queryKey: ['sighting'] }, (old: any) => {
          if (!old || typeof old !== 'object' || !('id' in old)) return old;
          return applyReactionDelta(old as ReactableItem, target);
        });
      }

      // MyBirds: same sighting record shows up here too — keep counts in sync
      // when the user is the post owner liking from another surface.
      if (target.kind === 'sighting') {
        queryClient.setQueriesData({ queryKey: ['my-birds'] }, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              sightings: (page.sightings ?? []).map((s: ReactableItem) =>
                applyReactionDelta(s, target),
              ),
            })),
          };
        });
      }
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['group-posts'] });
      queryClient.invalidateQueries({ queryKey: ['sighting'] });
      queryClient.invalidateQueries({ queryKey: ['my-birds'] });
    },
  });
}

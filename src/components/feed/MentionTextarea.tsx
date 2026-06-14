'use client';

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildImageUrl } from '@/lib/api/client';
import { globalSearch } from '@/lib/api/search';
import { getGroupMembers } from '@/lib/api/groups';

const MAX_SUGGESTIONS = 6;

export interface MentionCandidate {
  username: string;
  display_name: string | null;
  profile_photo_url: string | null;
  /** Lower = ranked first. 0 thread participants / group members, 1 search results. */
  priority: number;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** Usernames already in the thread — ranked first in suggestions. */
  participants?: string[];
  /** When the post lives in a group, members are fetched and ranked first. */
  groupSlug?: string | null;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
  /** Dropdown opens above (default, for bottom-anchored inputs) or below. */
  dropdownPosition?: 'above' | 'below';
  onSubmit?: () => void;
}

export interface MentionTextareaHandle {
  focus: () => void;
}

/**
 * Comment input with @mention autosuggest. Typing `@pre` opens a typeahead
 * ranked: thread participants + group members first, then people from global
 * search. Selecting inserts `@username `. Renders as a single-line input to
 * drop into existing comment forms.
 */
export const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(
  function MentionTextarea(
    {
      value,
      onChange,
      participants = [],
      groupSlug,
      placeholder,
      disabled,
      maxLength,
      className,
      dropdownPosition = 'above',
      onSubmit,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStart, setMentionStart] = useState(0); // index of the '@'
    const [highlighted, setHighlighted] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

    // Group members (fetched once per group, cached by react-query)
    const { data: groupMembersData } = useQuery({
      queryKey: ['group-members-mentions', groupSlug],
      queryFn: () => getGroupMembers(groupSlug!, 100),
      enabled: !!groupSlug && mentionQuery !== null,
      staleTime: 5 * 60 * 1000,
    });

    // People search for the typed prefix (debounced via keepPreviousData feel;
    // react-query dedupes identical queries)
    const { data: searchData } = useQuery({
      queryKey: ['mention-search', mentionQuery],
      queryFn: () => globalSearch(mentionQuery!),
      enabled: mentionQuery !== null && mentionQuery.length >= 1,
      staleTime: 60 * 1000,
    });

    const suggestions = useMemo<MentionCandidate[]>(() => {
      if (mentionQuery === null) return [];
      const q = mentionQuery.toLowerCase();
      const seen = new Set<string>();
      const out: MentionCandidate[] = [];

      const push = (c: MentionCandidate) => {
        const key = c.username.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(c);
      };

      const matches = (username: string, displayName?: string | null) =>
        q.length === 0 ||
        username.toLowerCase().startsWith(q) ||
        (displayName ?? '').toLowerCase().startsWith(q);

      // 1. Thread participants
      for (const username of participants) {
        if (matches(username)) {
          push({ username, display_name: null, profile_photo_url: null, priority: 0 });
        }
      }

      // 2. Group members
      for (const m of groupMembersData?.members ?? []) {
        if (matches(m.username, m.display_name)) {
          push({
            username: m.username,
            display_name: m.display_name,
            profile_photo_url: m.profile_photo_url,
            priority: 0,
          });
        }
      }

      // 3. Global people search
      for (const u of searchData?.users ?? []) {
        if (matches(u.username, u.display_name)) {
          push({
            username: u.username,
            display_name: u.display_name,
            profile_photo_url: u.profile_photo_url,
            priority: 1,
          });
        }
      }

      return out.slice(0, MAX_SUGGESTIONS);
    }, [mentionQuery, participants, groupMembersData, searchData]);

    // Keep highlight in range when the list changes (clamped at render time)
    const activeIndex = Math.min(highlighted, Math.max(suggestions.length - 1, 0));

    // Close on outside click
    useEffect(() => {
      const close = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setMentionQuery(null);
        }
      };
      document.addEventListener('mousedown', close);
      return () => document.removeEventListener('mousedown', close);
    }, []);

    // Detect an active @token before the caret
    const detectMention = useCallback((text: string, caret: number) => {
      const before = text.slice(0, caret);
      const match = before.match(/(?:^|[^A-Za-z0-9_-])@([A-Za-z0-9_-]{0,30})$/);
      if (match) {
        setMentionStart(caret - match[1].length - 1);
        setMentionQuery(match[1]);
      } else {
        setMentionQuery(null);
      }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      detectMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
    };

    const insertMention = (username: string) => {
      const after = value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
      const next = `${value.slice(0, mentionStart)}@${username} ${after.replace(/^ /, '')}`;
      onChange(next);
      setMentionQuery(null);
      // Restore focus and put the caret after the inserted mention
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          const caret = mentionStart + username.length + 2;
          el.setSelectionRange(caret, caret);
        }
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (mentionQuery !== null && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlighted((activeIndex + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlighted((activeIndex - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(suggestions[activeIndex].username);
          return;
        }
        if (e.key === 'Escape') {
          setMentionQuery(null);
          return;
        }
      }
      if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

    return (
      <div ref={containerRef} className={cn('relative flex-1 min-w-0', className)}>
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete="off"
        />

        {mentionQuery !== null && suggestions.length > 0 && (
          <div
            className={cn(
              'absolute left-0 right-0 z-50 bg-white dark:bg-gray-900 border rounded-lg shadow-lg overflow-hidden',
              dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
            <div className="px-3 py-1.5 text-xs text-muted-foreground border-b flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              Mention someone
            </div>
            {suggestions.map((s, i) => (
              <button
                key={s.username}
                type="button"
                onMouseDown={(e) => {
                  // mousedown so the input doesn't blur first
                  e.preventDefault();
                  insertMention(s.username);
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                  i === activeIndex ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-gray-50'
                )}
              >
                <Avatar className="h-6 w-6 flex-shrink-0">
                  {s.profile_photo_url ? (
                    <AvatarImage src={buildImageUrl(s.profile_photo_url)} alt={s.username} />
                  ) : null}
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[10px]">
                    {getInitials(s.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">@{s.username}</span>
                {s.display_name && (
                  <span className="text-xs text-muted-foreground truncate">{s.display_name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

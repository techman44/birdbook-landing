'use client';

import { Fragment } from 'react';
import Link from 'next/link';

// Mirrors the backend mention parser (notifications.py): letters, numbers,
// underscore, hyphen, 1-30 chars, not preceded by another word char so we
// don't match the middle of emails/paths.
const MENTION_RE = /(?<![A-Za-z0-9_-])@([A-Za-z0-9_-]{1,30})/g;

interface MentionTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with @username tokens turned into links to the profile.
 * Everything else is plain text; whitespace is preserved by the caller's
 * styling (e.g. whitespace-pre-wrap). The link only assumes the username
 * is routable — it doesn't verify the user exists (a dead link to a
 * non-existent profile just 404s, same as typing the URL).
 */
export function MentionText({ text, className }: MentionTextProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset lastIndex since the regex is global and module-level.
  MENTION_RE.lastIndex = 0;
  let key = 0;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const [full, username] = match;
    const start = match.index;
    if (start > lastIndex) {
      parts.push(<Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>);
    }
    parts.push(
      <Link
        key={key++}
        href={`/profile/${username}`}
        className="text-emerald-600 hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {full}
      </Link>,
    );
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return <span className={className}>{parts}</span>;
}

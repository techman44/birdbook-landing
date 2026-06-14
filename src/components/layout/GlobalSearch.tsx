'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bird,
  Calendar,
  Camera,
  Loader2,
  Search,
  User as UserIcon,
  Users,
} from 'lucide-react';

import { globalSearch } from '@/lib/api/search';
import { buildImageUrl } from '@/lib/api/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

/**
 * Header search box with a combined results dropdown (species / users /
 * sightings). Debounced; closes on outside click or navigation.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 250);
    return () => clearTimeout(t);
  }, [input]);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => globalSearch(debounced),
    enabled,
  });

  const go = (href: string) => {
    setOpen(false);
    setInput('');
    router.push(href);
  };

  const hasResults =
    (data?.species.length ?? 0) +
      (data?.users.length ?? 0) +
      (data?.sightings.length ?? 0) +
      (data?.equipment?.length ?? 0) +
      (data?.groups?.length ?? 0) +
      (data?.events?.length ?? 0) >
    0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search species, people, sightings…"
        className="pl-8 h-9"
      />

      {open && enabled && (
        <div className="absolute top-11 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-[28rem] overflow-y-auto z-50">
          {isFetching && (
            <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Searching…
            </div>
          )}

          {!isFetching && !hasResults && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No matches for &ldquo;{debounced}&rdquo;.
            </div>
          )}

          {data?.species.length ? (
            <div className="py-1">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Species</div>
              {data.species.map((s) => (
                <button
                  key={`sp-${s.id}`}
                  type="button"
                  onClick={() => go(`/encyclopedia/${s.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  <Bird className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">{s.common_name}</span>
                    <span className="text-xs text-muted-foreground italic truncate">{s.scientific_name}</span>
                  </span>
                  {s.matched_by === 'semantic' && (
                    <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                      description match
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : null}

          {data?.users.length ? (
            <div className="py-1 border-t">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">People</div>
              {data.users.map((u) => (
                <button
                  key={`u-${u.id}`}
                  type="button"
                  onClick={() => go(`/profile/${u.username}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={buildImageUrl(u.profile_photo_url || '')} alt={u.username} />
                    <AvatarFallback>
                      <UserIcon className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{u.display_name || u.username}</span>
                  <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
                </button>
              ))}
            </div>
          ) : null}

          {data?.sightings.length ? (
            <div className="py-1 border-t">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Sightings</div>
              {data.sightings.map((s) => (
                <button
                  key={`si-${s.id}`}
                  type="button"
                  onClick={() => go(`/sighting/${s.public_id ?? s.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  {s.image_path ? (
                    <img
                      src={buildImageUrl(s.image_path)}
                      alt={s.common_name}
                      className="h-8 w-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                      <Bird className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">{s.common_name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{s.username}{s.caption ? ` · ${s.caption}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {data?.equipment?.length ? (
            <div className="py-1 border-t">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Gear</div>
              {data.equipment.map((g) => (
                <button
                  key={`g-${g.id}`}
                  type="button"
                  onClick={() => go(`/gear/${g.id}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  {g.product_image_url ? (
                    <img
                      src={g.product_image_url}
                      alt={g.full_name}
                      className="h-8 w-8 rounded object-contain bg-white shrink-0"
                    />
                  ) : (
                    <Camera className="h-4 w-4 text-sky-600 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">{g.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {g.brand} · {g.equipment_type.replace(/_/g, ' ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {data?.groups?.length ? (
            <div className="py-1 border-t">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Groups</div>
              {data.groups.map((gr) => (
                <button
                  key={`gr-${gr.id}`}
                  type="button"
                  onClick={() => go(`/groups/${gr.slug}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  <Users className="h-4 w-4 text-violet-600 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">{gr.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {gr.member_count} member{gr.member_count === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {data?.events?.length ? (
            <div className="py-1 border-t">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">Events</div>
              {data.events.map((ev) => (
                <button
                  key={`ev-${ev.id}`}
                  type="button"
                  onClick={() => go(`/events/${ev.public_id ?? ev.slug}`)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="text-sm block truncate">{ev.title}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[
                        ev.start_date ? new Date(ev.start_date).toLocaleDateString() : null,
                        ev.location_name,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

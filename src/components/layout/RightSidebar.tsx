'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Bird,
  Users,
  Calendar,
  TrendingUp,
  Camera,
  Loader2,
  ChevronRight,
  MapPin,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSidebarStats, type SidebarStats } from '@/lib/api/stats';
import { getEventTypeLabel, getEventTypeColor } from '@/lib/api/events';
import { getGroupTypeLabel } from '@/lib/api/groups';
import { buildImageUrl } from '@/lib/api/client';

function TrendingSpeciesWidget({ species }: { species: SidebarStats['trending_species'] }) {
  if (!species || species.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Trending Species
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {species.slice(0, 5).map((s, index) => (
            <Link
              key={s.species_name}
              href={`/encyclopedia?search=${encodeURIComponent(s.common_name)}`}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {s.image_url ? (
                  <img
                    src={buildImageUrl(s.image_url)}
                    alt={s.common_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bird className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                  {s.common_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.sighting_count} sightings
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                #{index + 1}
              </Badge>
            </Link>
          ))}
        </div>
        <Link href="/encyclopedia">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            View all species
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function TopPhotographersWidget({ photographers }: { photographers: SidebarStats['top_photographers'] }) {
  if (!photographers || photographers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          Top Photographers
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {photographers.slice(0, 5).map((p, index) => (
            <Link
              key={p.user_id}
              href={`/profile/${p.username}`}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.profile_photo_url ? buildImageUrl(p.profile_photo_url) : undefined} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {(p.display_name || p.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {index < 3 && (
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-amber-700'
                  }`}>
                    {index + 1}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                  {p.display_name || p.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.sighting_count} photos · {p.species_count} species
                </p>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/discover">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            Discover more
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function RecommendedGroupsWidget({ groups }: { groups: SidebarStats['recommended_groups'] }) {
  if (!groups || groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-500" />
          Suggested Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {groups.slice(0, 4).map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.public_id}`}
              className="block group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                    {g.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs py-0 h-5">
                      {getGroupTypeLabel(g.group_type)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {g.member_count} members
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/groups">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            Browse all groups
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function UpcomingEventsWidget({ events }: { events: SidebarStats['upcoming_events'] }) {
  if (!events || events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {events.slice(0, 4).map((e) => {
            const date = new Date(e.start_datetime);
            return (
              <Link
                key={e.id}
                href={`/events/${e.public_id}`}
                className="block group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-center bg-gray-100 rounded-lg p-2 min-w-[50px]">
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {date.toLocaleDateString('en-AU', { month: 'short' })}
                    </div>
                    <div className="text-lg font-bold text-emerald-600">
                      {date.getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">
                      {e.title}
                    </p>
                    <Badge className={`${getEventTypeColor(e.event_type)} text-xs mt-1`}>
                      {getEventTypeLabel(e.event_type)}
                    </Badge>
                    {e.location_name && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{e.location_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        <Link href="/events">
          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
            View all events
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function StatsOverview({ stats }: { stats: SidebarStats }) {
  return (
    <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{stats.total_sightings.toLocaleString()}</div>
            <div className="text-xs opacity-80">Sightings</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.total_species.toLocaleString()}</div>
            <div className="text-xs opacity-80">Species</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.total_users.toLocaleString()}</div>
            <div className="text-xs opacity-80">Birders</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RightSidebar() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['sidebar-stats'],
    queryFn: getSidebarStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <WidgetSkeleton />
        <WidgetSkeleton />
        <WidgetSkeleton />
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      <StatsOverview stats={stats} />
      <TrendingSpeciesWidget species={stats.trending_species} />
      <TopPhotographersWidget photographers={stats.top_photographers} />
      <RecommendedGroupsWidget groups={stats.recommended_groups} />
      <UpcomingEventsWidget events={stats.upcoming_events} />

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-2">
        <p>BirdBook &copy; 2024</p>
        <div className="flex justify-center gap-2 mt-1">
          <Link href="/about" className="hover:text-emerald-600">About</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-emerald-600">Privacy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-emerald-600">Terms</Link>
        </div>
      </div>
    </div>
  );
}

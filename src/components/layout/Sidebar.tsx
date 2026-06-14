'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getUnreadCount } from '@/lib/api/messages';
import { getNotificationUnreadCount } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useChatSocket, type ChatEvent } from '@/lib/hooks/useChatSocket';
import {
  Bell,
  Bird,
  Home,
  Camera,
  BookOpen,
  Users,
  Map,
  Compass,
  Feather,
  Aperture,
  Calendar,
  MessageSquare,
  Shield,
} from 'lucide-react';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/identify', label: 'Identify', icon: Camera },
  { href: '/mybirds', label: 'My Birds', icon: Feather },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/encyclopedia', label: 'Encyclopedia', icon: BookOpen },
  { href: '/gear', label: 'Gear', icon: Aperture },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/maps', label: 'Maps', icon: Map },
  { href: '/discover', label: 'Discover', icon: Compass },
];

export function Sidebar() {
  const pathname = usePathname();
  const isAuthed = useAuthStore((s) => !!s.accessToken);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const queryClient = useQueryClient();

  // Site admins get an extra Admin entry at the bottom of the nav
  const items = isAdmin
    ? [...navItems, { href: '/admin', label: 'Admin', icon: Shield }]
    : navItems;

  // Light periodic polls for both unread badges. Sidebar is mounted on
  // every authed page so a single hook here covers the whole app. The
  // WS subscription below keeps them snappy between polls.
  const { data: messagesUnread } = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: getUnreadCount,
    refetchInterval: 120_000,
    enabled: isAuthed,
  });
  const messagesUnreadCount = messagesUnread?.unread_count ?? 0;

  const { data: notifUnread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: getNotificationUnreadCount,
    refetchInterval: 30_000,
    enabled: isAuthed,
  });
  const notifUnreadCount = notifUnread?.unread_count ?? 0;

  const badgeFor = (href: string): number => {
    if (href === '/messages') return messagesUnreadCount;
    if (href === '/notifications') return notifUnreadCount;
    return 0;
  };

  // Shared WS connection — the Sidebar is mounted on every authed page,
  // so this is the single socket the app relies on for live updates.
  // Pages (notifications, inbox) read from the query cache and refetch
  // when we invalidate here, rather than each opening their own socket.
  const onEvent = useCallback(
    (event: ChatEvent) => {
      if (event.type === 'message:new' || event.type === 'message:read') {
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
      } else if (event.type === 'notification:new') {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
      }
    },
    [queryClient],
  );
  useChatSocket({ onEvent, enabled: isAuthed });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo - only show in mobile sheet, hidden on desktop sidebar */}
      <div className="flex items-center h-14 px-4 border-b md:hidden">
        <Link href="/feed" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <Bird className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="font-bold text-lg">BirdBook</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const badge = badgeFor(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-medium rounded-full bg-emerald-600 text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Legal links */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600 hover:underline">
            Privacy
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-gray-600 hover:underline">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/guidelines" className="hover:text-gray-600 hover:underline">
            Guidelines
          </Link>
        </div>
      </div>
    </div>
  );
}

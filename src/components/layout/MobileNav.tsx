'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Camera, Feather, BookOpen, User } from 'lucide-react';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/identify', label: 'Identify', icon: Camera },
  { href: '/mybirds', label: 'My Birds', icon: Feather },
  { href: '/encyclopedia', label: 'Species', icon: BookOpen },
  { href: '/account', label: 'Profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs',
                isActive ? 'text-emerald-600' : 'text-gray-500'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-emerald-600')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

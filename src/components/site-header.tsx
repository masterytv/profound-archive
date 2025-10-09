'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Brain, Heart, Lightbulb, Sun } from 'lucide-react';

export default function SiteHeader() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/search', label: 'Search' },
    { href: '/chat', label: 'Chat' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <div className="flex items-center gap-1">
            <Sun className="h-5 w-5 text-orange-500" />
            <Brain className="h-5 w-5 text-blue-500" />
            <Heart className="h-5 w-5 text-red-500" />
            <Lightbulb className="h-5 w-5 text-yellow-500" />
          </div>
          <span className="font-bold">Profound Archive</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === link.href ? 'text-foreground' : 'text-foreground/60'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

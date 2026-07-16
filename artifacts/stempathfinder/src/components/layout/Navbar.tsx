import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const linkClass = (active: boolean) =>
    `text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`;

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="font-semibold text-foreground tracking-tight">
            STEMPath
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <Link href="/" className={linkClass(location === '/')}>
              Home
            </Link>
            <Link href="/match" className={linkClass(location === '/match' || location === '/results')}>
              Find Opportunities
            </Link>
          </div>

          <div className="sm:hidden">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-border px-4 py-3 space-y-3">
          <Link href="/" className={`block ${linkClass(location === '/')}`} onClick={() => setMobileOpen(false)}>
            Home
          </Link>
          <Link href="/match" className={`block ${linkClass(location === '/match' || location === '/results')}`} onClick={() => setMobileOpen(false)}>
            Find Opportunities
          </Link>
        </div>
      )}
    </nav>
  );
}

import { Link, useLocation } from 'wouter';
import { Compass, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <Compass className="h-5 w-5" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-primary">STEMPath</span>
            </Link>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
            <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location === '/' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>
              Home
            </Link>
            <Link href="/match" className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location === '/match' || location === '/results' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>
              Find Opportunities
            </Link>
            <Link href="/match">
              <Button size="sm" className="gap-2 font-semibold">
                Start Matching <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-border">
          <div className="pt-2 pb-3 space-y-1">
            <Link href="/" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${location === '/' ? 'border-primary text-primary bg-accent' : 'border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground'}`} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </Link>
            <Link href="/match" className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${location === '/match' || location === '/results' ? 'border-primary text-primary bg-accent' : 'border-transparent text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground'}`} onClick={() => setIsMobileMenuOpen(false)}>
              Find Opportunities
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

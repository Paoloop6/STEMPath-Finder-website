import { Link, useLocation } from 'wouter';
import { Compass } from 'lucide-react';

const LINKS: Array<[string, string]> = [
  ['/', 'Home'],
  ['/find', 'Find matches'],
  ['/database', 'Database'],
  ['/student-pathways', 'Pathways'],
  ['/how', 'How it works'],
  ['/different', 'Vs. ChatGPT'],
  ['/guides', 'Guides'],
  ['/docs', 'Documentation'],
];

/** Floating liquid-glass navigation shared across all public pages. */
export function TopBar() {
  const [loc] = useLocation();
  const isActive = (href: string) => (href === '/' ? loc === '/' : loc.startsWith(href));

  return (
    <div className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav className="liquid-glass mx-auto flex h-14 max-w-[var(--page-width)] items-center justify-between rounded-[var(--radius-large)] px-2.5 sm:px-4">
        <Link href="/" className="flex items-center gap-2 pl-1.5 font-display text-[15px] font-semibold text-foreground">
          <Compass className="size-5" aria-hidden="true" />
          <span className="hidden sm:inline">STEMPath Finder</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-[var(--radius-small)] px-2.5 py-1.5 text-[13px] transition-colors sm:px-3 ${
                isActive(href) ? 'bg-white/12 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="/admin/login"
            className="ml-0.5 hidden rounded-[var(--radius-small)] px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Admin
          </a>
        </div>
      </nav>
    </div>
  );
}

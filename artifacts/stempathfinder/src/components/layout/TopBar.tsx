import { Link, useLocation } from 'wouter';
import { Ticket } from 'lucide-react';
import { myBoard, useMyBoard } from '@/lib/my-board';
import { FlapWord } from '@/components/home/DeparturesBoard';

const LINKS: Array<[string, string]> = [
  ['/find', 'Find matches'],
  ['/database', 'Database'],
  ['/student-pathways', 'Pathways'],
  ['/how', 'How it works'],
  ['/different', 'Vs. a chatbot'],
  ['/guides', 'Guides'],
];

/** Signage bar shared across all public pages: wordmark left, wayfinding right,
 * the active route underlined like a lit tab. */
export function TopBar() {
  const [loc] = useLocation();
  const { items } = useMyBoard();
  const isActive = (href: string) => (href === '/' ? loc === '/' : loc.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[color-mix(in_srgb,var(--hall)_90%,transparent)] backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-[var(--page-width)] items-center justify-between px-4 sm:px-6" aria-label="Primary">
        <Link
          href="/"
          className="font-display press inline-flex items-center gap-2 text-[18px] font-[900] leading-none tracking-[-0.02em] text-foreground"
          aria-current={loc === '/' ? 'page' : undefined}
        >
          <span className="font-board inline-grid size-6 place-items-center rounded-[3px] bg-[var(--board)] text-[11px] font-bold leading-none text-[var(--flap-amber)]" aria-hidden="true">
            NS
          </span>
          <span className="hidden sm:inline">NextStep Database</span>
          <span className="sm:hidden">NextStep</span>
        </Link>
        <div className="-mx-2 flex items-center overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.filter(([href]) => href !== '/find').map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`nav-link press flex h-14 shrink-0 items-center px-2.5 text-[13.5px] sm:px-3 ${
                isActive(href) ? 'font-semibold text-foreground' : 'text-[var(--ink-muted)] hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => myBoard.setDrawer(true)}
            className="press ml-2 inline-flex h-9 shrink-0 items-center gap-2 rounded-[4px] border border-[var(--hall-line-strong)] px-2.5 text-[13.5px] font-medium text-foreground hover:bg-[var(--surface-subtle)]"
            aria-label={`Open your board, ${items.length} saved`}
          >
            <Ticket className="size-4" aria-hidden="true" />
            <span className="hidden md:inline">My board</span>
            <FlapWord text={String(items.length)} width={items.length > 9 ? 2 : 1} size={12} tone={items.length ? 'amber' : 'dim'} />
          </button>
          <Link href="/find" className="btn-slab press ml-2 shrink-0 !px-3.5 !py-2 text-[13.5px]">
            Find matches
          </Link>
        </div>
      </nav>
    </header>
  );
}

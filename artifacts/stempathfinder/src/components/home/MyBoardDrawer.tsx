import { Drawer } from 'vaul';
import type React from 'react';
import { Link, useLocation } from 'wouter';
import { openWithTransition } from '@/lib/open-transition';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { myBoard, useMyBoard, type SavedDeparture } from '@/lib/my-board';
import { FlapWord, useNow } from '@/components/home/DeparturesBoard';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function parse(value: string | null): Date | null {
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  const us = value.match(/(^|\D)(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return new Date(Number(us[4]), Number(us[2]) - 1, Number(us[3]), 12);
  return null;
}

function flaps(d: Date | null): string {
  if (!d) return '  TBA ';
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

function countdown(d: Date | null, now: Date): { text: string; tone: 'yellow' | 'red' | 'dim' | undefined } {
  if (!d) return { text: 'Date not listed', tone: 'dim' };
  const n = Math.round((d.getTime() - now.getTime()) / 86_400_000);
  if (n < 0) return { text: 'Deadline passed', tone: 'red' };
  if (n === 0) return { text: 'Closes today', tone: 'yellow' };
  if (n === 1) return { text: 'Closes tomorrow', tone: 'yellow' };
  if (n <= 14) return { text: `${n} days left`, tone: 'yellow' };
  return { text: `${n} days left`, tone: undefined };
}

/** The gate code printed on the stub: two letters from the organization or title. */
function stubCode(item: SavedDeparture): string {
  const src = (item.organization || item.title).replace(/[^A-Za-z ]/g, ' ').trim();
  const words = src.split(/\s+/).filter(Boolean);
  const code = words.length >= 2 ? words[0][0] + words[1][0] : src.slice(0, 2);
  return code.toUpperCase().padEnd(2, 'X');
}

function BoardingPass({ item, index }: { item: SavedDeparture; index: number }) {
  const now = useNow(60_000);
  const [, navigate] = useLocation();
  const d = parse(item.deadline);
  const cd = countdown(d, now);
  const remove = () => {
    const gone = myBoard.remove(item.id);
    if (gone) {
      toast('Removed from your board', {
        description: gone.title,
        action: { label: 'Undo', onClick: () => myBoard.restore(gone) },
      });
    }
  };
  return (
    <article className="pass" aria-label={item.title}>
      <div className="pass-stub">
        <span className="font-board text-[11px] font-bold tracking-[0.16em] text-[var(--flap-dim)]">Gate</span>
        <span className="font-board text-[30px] font-bold leading-none text-[var(--flap-amber)]">{stubCode(item)}</span>
        <span className="font-board tnum text-[11px] font-bold tracking-[0.16em] text-[var(--flap-dim)]">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <div className="pass-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-board text-[11px] font-bold tracking-[0.16em] text-[var(--flap-dim)]">Departure</span>
            <h3 className="font-board mt-1 line-clamp-2 text-[20px] font-bold leading-[1.02] text-[var(--flap-text)]">{item.title}</h3>
            {item.organization && <p className="mt-1 truncate text-[13px] text-[var(--flap-dim)]">{item.organization}</p>}
          </div>
          <button
            type="button"
            onClick={remove}
            className="press -mr-1 -mt-1 inline-grid size-8 shrink-0 place-items-center rounded-[4px] text-[var(--flap-dim)] hover:bg-[rgba(244,239,226,0.08)] hover:text-[var(--flap-text)]"
            aria-label={`Remove ${item.title} from your board`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <FlapWord text={flaps(d)} width={6} size={15} tone={cd.tone === 'yellow' ? 'yellow' : 'amber'} />
            <p className={`mt-1.5 text-[12.5px] ${cd.tone === 'red' ? 'text-[var(--signal-red)]' : cd.tone === 'yellow' ? 'text-[var(--signal-yellow)]' : 'text-[var(--flap-dim)]'}`}>
              {cd.text}
            </p>
          </div>
          <Link
            href={item.path}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              const title = e.currentTarget.closest('.pass')?.querySelector('h3') ?? null;
              myBoard.setDrawer(false);
              // Let the sheet start closing before the record opens.
              window.setTimeout(() => openWithTransition(navigate, item.path, title, item.title), 120);
            }}
            className="press inline-flex items-center gap-1 font-board text-[13px] font-bold tracking-[0.1em] text-[var(--flap-text)] underline-offset-4 hover:underline"
          >
            Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The visitor's saved departures, as a drawer of boarding passes. */
export function MyBoardDrawer() {
  const { items, drawerOpen } = useMyBoard();
  const reduce = useReducedMotion();
  const passTransition = reduce ? { duration: 0 } : { type: 'spring' as const, duration: 0.42, bounce: 0 };

  return (
    <Drawer.Root open={drawerOpen} onOpenChange={myBoard.setDrawer} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/60" />
        <Drawer.Content
          className="board fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[88vh] w-full max-w-[720px] flex-col rounded-b-none rounded-t-[10px] outline-none"
          aria-describedby={undefined}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[rgba(244,239,226,0.25)]" aria-hidden="true" />
          <div className="flex items-baseline justify-between gap-4 px-5 pb-3 pt-4">
            <Drawer.Title className="font-board text-[28px] font-bold leading-none tracking-[0.04em] text-[var(--flap-amber)]">
              Your board
            </Drawer.Title>
            <span className="inline-flex items-center gap-2 font-board text-[14px] font-semibold text-[var(--flap-text)]">
              <FlapWord text={String(items.length)} width={items.length > 9 ? 2 : 1} size={14} tone={items.length ? 'amber' : 'dim'} />
              {items.length === 1 ? 'departure' : 'departures'}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-[rgba(244,239,226,0.14)] px-4 pb-6 pt-4">
            {items.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <p className="font-board text-[22px] font-bold leading-none text-[var(--flap-text)]">Nothing saved yet.</p>
                <p className="mx-auto mt-3 max-w-[34ch] text-[14px] leading-[1.5] text-[var(--flap-dim)]">
                  Press the + on any departure and it lands here as a boarding pass. Saved only in this browser, never on a server.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                <AnimatePresence initial={true}>
                  {items.map((item, i) => (
                    <motion.li
                      key={item.id}
                      layout="position"
                      initial={reduce ? false : { opacity: 0, transform: 'translateY(14px)' }}
                      animate={{ opacity: 1, transform: 'translateY(0px)' }}
                      exit={{ opacity: 0, transform: 'translateX(24px)', transition: { duration: 0.18 } }}
                      // Passes arrive one after another as the sheet settles: 45ms apart,
                      // starting once the drawer's own 500ms curve is mostly done.
                      transition={{ ...passTransition, delay: reduce ? 0 : 0.18 + Math.min(i, 8) * 0.045 }}
                    >
                      <BoardingPass item={item} index={i} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

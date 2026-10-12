import { flushSync } from 'react-dom';

/**
 * Opening a departure: the row's title travels to become the detail page's
 * heading (View Transitions API), so the board and the record read as one
 * space. Falls back to a plain navigation where the API or motion is off.
 */
export type Navigate = (to: string, options?: { replace?: boolean; state?: unknown }) => void;

const NAME = 'opp-title';

export function openWithTransition(navigate: Navigate, href: string, titleEl: Element | null, title: string | null) {
  const state = title ? { title } : undefined;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doc.startViewTransition || reduce || !(titleEl instanceof HTMLElement)) {
    navigate(href, { state });
    return;
  }
  titleEl.style.viewTransitionName = NAME;
  const vt = doc.startViewTransition(() => {
    flushSync(() => navigate(href, { state }));
  });
  vt.finished.finally(() => {
    titleEl.style.viewTransitionName = '';
  });
}

/** The title a detail page can paint immediately, before its record loads. */
export function titleFromHistory(): string | null {
  const s = window.history.state as { title?: unknown } | null;
  return s && typeof s.title === 'string' ? s.title : null;
}

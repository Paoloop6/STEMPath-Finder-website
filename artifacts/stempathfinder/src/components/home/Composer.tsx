import { useEffect, useRef, type KeyboardEvent } from 'react';
import { MESSAGE_MAX_LENGTH } from '@/lib/ask-stempath';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  variant?: 'full' | 'compact';
  autoFocus?: boolean;
}

const MAX_HEIGHT: Record<'full' | 'compact', number> = { full: 180, compact: 80 };

export function Composer({ value, onChange, onSend, isLoading, variant = 'full', autoFocus }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFull = variant === 'full';

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT[variant])}px`;
  }, [value, variant]);

  const trimmed = value.trim();
  const canSend = trimmed.length > 0 && trimmed.length <= MESSAGE_MAX_LENGTH && !isLoading;

  function handleSubmit() {
    if (!canSend) return;
    onSend(trimmed);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  if (!isFull) {
    return (
      <div
        className="composer-shell flex items-center gap-2 px-3.5 py-1.5"
        style={{ minWidth: 0 }}
      >
        <span className="font-annotation shrink-0 text-[10px] tracking-[0.1em] text-[var(--brand-muted-3)]">
          REFINE
        </span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Refine your shortlist…"
          aria-label="Refine your shortlist"
          maxLength={MESSAGE_MAX_LENGTH}
          rows={1}
          disabled={isLoading}
          className="max-h-[80px] min-w-0 flex-1 resize-none self-center bg-transparent py-1 text-[13px] leading-[1.4] text-[var(--brand-muted-1)] outline-none placeholder:text-[var(--brand-muted-2)]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="h-7 shrink-0 rounded-[var(--radius-button)] px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-ink)' }}
        >
          Go
        </button>
      </div>
    );
  }

  return (
    <div className="composer-shell w-full max-w-[640px] px-[22px] py-[18px]">
      <div className="font-annotation mb-2.5 text-[10px] uppercase tracking-[0.12em] text-[var(--brand-muted-3)]">
        your request
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder="I'm an 11th grader in Houston looking for biomedical research experience this summer…"
        aria-label="Describe the STEM opportunity you're looking for"
        maxLength={MESSAGE_MAX_LENGTH}
        autoFocus={autoFocus}
        rows={1}
        disabled={isLoading}
        className="max-h-[180px] min-h-[52px] w-full resize-none bg-transparent p-0 text-[15px] leading-[1.55] text-[var(--brand-text-soft)] outline-none placeholder:text-[var(--brand-muted-3)]"
      />
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="font-annotation text-xs text-[var(--brand-muted-3)]">
          grade · location · field · experience · budget · deadline
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="h-[38px] shrink-0 rounded-[var(--radius-button)] px-[18px] text-[13px] font-bold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--brand-accent)', color: 'var(--brand-accent-ink)' }}
        >
          {isLoading ? 'Building your shortlist…' : 'Find opportunities'}
        </button>
      </div>
    </div>
  );
}

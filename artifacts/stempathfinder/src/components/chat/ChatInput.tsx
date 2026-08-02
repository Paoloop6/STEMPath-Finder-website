import { useEffect, useRef, type KeyboardEvent } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { MESSAGE_MAX_LENGTH } from '@/lib/ask-stempath';

const MAX_TEXTAREA_HEIGHT_PX = 180;
const NEAR_LIMIT_THRESHOLD = MESSAGE_MAX_LENGTH - 200;

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ value, onChange, onSend, isLoading, placeholder, autoFocus }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [value]);

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

  return (
    <div className="w-full">
      <div className="flex w-full items-end gap-2 rounded-[var(--radius-card)] border border-border bg-card p-2.5 transition-shadow focus-within:ring-2 focus-within:ring-primary/40">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, MESSAGE_MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'What kind of STEM opportunity are you looking for?'}
          aria-label="Ask STEMPath Finder a question"
          maxLength={MESSAGE_MAX_LENGTH}
          autoFocus={autoFocus}
          rows={1}
          disabled={isLoading}
          className="max-h-[180px] min-h-0 flex-1 resize-none self-center overflow-y-auto border-0 bg-transparent px-2 py-2 text-[15px] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0 md:text-base"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          aria-label="Send message"
          className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary text-primary-foreground transition-transform duration-[var(--motion-base)] hover:enabled:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading ? <Spinner className="size-5" /> : <SendHorizontal className="size-5" />}
        </button>
      </div>
      {value.length > NEAR_LIMIT_THRESHOLD && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {value.length}/{MESSAGE_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}

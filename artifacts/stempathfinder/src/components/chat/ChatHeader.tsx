import { Compass } from 'lucide-react';

interface ChatHeaderProps {
  onNewConversation: () => void;
}

export function ChatHeader({ onNewConversation }: ChatHeaderProps) {
  return (
    <header className="border-b border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-[820px] items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <Compass className="size-4 text-primary" aria-hidden="true" />
          STEMPath Finder
        </a>
        <button
          type="button"
          onClick={onNewConversation}
          className="rounded-[var(--radius-button)] border border-border px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          New conversation
        </button>
      </div>
    </header>
  );
}

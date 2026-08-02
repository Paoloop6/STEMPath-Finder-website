import { AlertTriangle } from 'lucide-react';
import { OpportunityCard } from '@/components/chat/OpportunityCard';
import type { OpportunityMatch } from '@/lib/ask-stempath';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  interpretedRequest?: string;
  matches?: OpportunityMatch[];
  clarificationQuestion?: string | null;
  isError?: boolean;
}

export function MessageBubble({ message }: { message: ChatTurn }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:max-w-[70%]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex items-start gap-2.5 rounded-[var(--radius-card)] border border-[var(--brand-error)]/25 bg-[var(--brand-error)]/6 px-4 py-3.5 text-sm text-[var(--brand-error)]">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {message.interpretedRequest && (
        <p className="mb-1.5 text-xs text-muted-foreground">
          Searching for: {message.interpretedRequest}
        </p>
      )}

      <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-foreground">
        {message.content}
      </p>

      {message.clarificationQuestion && (
        <div className="mt-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/6 px-4 py-3 text-sm font-medium text-foreground">
          {message.clarificationQuestion}
        </div>
      )}

      {message.matches && message.matches.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {message.matches.map((match) => (
            <OpportunityCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
      <div className="skeleton-shimmer h-4 w-3/4 rounded-md" />
      <div className="skeleton-shimmer mt-2 h-3 w-1/2 rounded-md" />
      <div className="mt-3 flex gap-1.5">
        <div className="skeleton-shimmer h-5 w-16 rounded-full" />
        <div className="skeleton-shimmer h-5 w-20 rounded-full" />
      </div>
      <div className="skeleton-shimmer mt-3 h-10 w-full rounded-md" />
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="loading-dots text-primary">
          <span />
          <span />
          <span />
        </span>
        Searching researched opportunities…
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

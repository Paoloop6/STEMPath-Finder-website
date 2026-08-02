import { useEffect, useRef, useState } from 'react';
import { Hero } from '@/components/home/Hero';
import { Results } from '@/components/home/HomeSections';
import type { ChatTurn } from '@/components/chat/MessageBubble';
import { askStempath, type ConversationTurn, type StudentProfile } from '@/lib/ask-stempath';
import { DEFAULT_SEARCH_TIER, type SearchTier } from '@/lib/search-tier';

const CONTEXT_TURN_LIMIT = 6;

/**
 * The matching experience on its own page. V1: one conversation in browser
 * memory only — no Supabase, no localStorage, no saved profile. "New search"
 * clears everything. Structured so auth can be added later without changes here.
 */
function FindMatches() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [profile, setProfile] = useState<StudentProfile>({});
  const [tier, setTier] = useState<SearchTier>(DEFAULT_SEARCH_TIER);
  const [followUp, setFollowUp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const lastSearched = useRef('');

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  useEffect(() => {
    if (lastAssistant) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [lastAssistant?.id]);

  async function sendMessage(text: string) {
    if (isLoading) return;
    lastSearched.current = text;
    const userTurn: ChatTurn = { id: crypto.randomUUID(), role: 'user', content: text };
    const context: ConversationTurn[] = messages
      .slice(-CONTEXT_TURN_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userTurn]);
    setFollowUp('');
    setIsLoading(true);
    try {
      const result = await askStempath(text, context, profile, tier);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.answer,
          interpretedRequest: result.interpreted_request,
          matches: result.matches,
          clarificationQuestion: result.clarification_question,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Something went wrong while searching. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function newSearch() {
    setMessages([]);
    setQuestion('');
    setProfile({});
    setTier(DEFAULT_SEARCH_TIER);
    setFollowUp('');
    lastSearched.current = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <Hero
        value={question}
        onChange={setQuestion}
        onSend={sendMessage}
        isLoading={isLoading}
        onProfileChange={setProfile}
        tier={tier}
        onTierChange={setTier}
      />
      {lastAssistant && (
        <div ref={resultsRef}>
          <Results
            turn={lastAssistant}
            query={lastSearched.current}
            followUp={followUp}
            onFollowUpChange={setFollowUp}
            onFollowUp={() => followUp.trim() && sendMessage(followUp.trim())}
            onNewSearch={newSearch}
            isLoading={isLoading}
          />
        </div>
      )}
    </>
  );
}

export default FindMatches;

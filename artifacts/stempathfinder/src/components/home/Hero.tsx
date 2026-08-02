import { IntakeForm } from '@/components/home/IntakeForm';
import { LiveStats } from '@/components/home/LiveStats';
import type { StudentProfile } from '@/lib/ask-stempath';
import type { SearchTier } from '@/lib/search-tier';

interface HeroProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  isLoading: boolean;
  onProfileChange: (profile: StudentProfile) => void;
  tier: SearchTier;
  onTierChange: (tier: SearchTier) => void;
}

/** Centered search experience for the /find page (optional question + profile). */
export function Hero({
  value,
  onChange,
  onSend,
  isLoading,
  onProfileChange,
  tier,
  onTierChange,
}: HeroProps) {
  return (
    <section className="relative mx-auto w-full max-w-[860px] px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-[1]"
          style={{ background: 'radial-gradient(80% 55% at 50% 22%, rgba(7,8,9,0.95), rgba(7,8,9,0.6) 52%, transparent 80%)' }}
        />
        <div className="text-center">
          <span className="font-annotation text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Personalized matches
          </span>
          <h1 className="font-display mx-auto mt-4 max-w-[680px] text-[34px] font-[660] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[50px]">
            Tell us about you.
          </h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">
            Share a few details — grade, interests, timing. Everything is optional, and we&apos;ll match
            you to real, researched opportunities you&apos;re eligible for.
          </p>
        </div>
        <div className="mt-8">
          <IntakeForm
            question={value}
            onQuestionChange={onChange}
            onChange={onProfileChange}
            onSubmit={() => onSend(value.trim() || 'Find STEM opportunities that fit my profile.')}
            isLoading={isLoading}
            tier={tier}
            onTierChange={onTierChange}
          />
        </div>
        {/* Shows what the search is drawing on, right where the student commits to it. */}
        <div className="mt-6">
          <LiveStats />
        </div>
      </div>
    </section>
  );
}

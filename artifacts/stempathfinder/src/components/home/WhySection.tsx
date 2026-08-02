import { ShieldCheck, Sparkles, Target } from 'lucide-react';

const REASONS = [
  {
    icon: ShieldCheck,
    title: 'Verified, not guessed',
    description:
      'Every opportunity is researched from its official source — no crowdsourced listings, no dead links, no invented deadlines.',
  },
  {
    icon: Target,
    title: 'Matched to you',
    description:
      "Tell us your grade, interests, and location in plain language. We surface programs that actually fit, with a clear reason why.",
  },
  {
    icon: Sparkles,
    title: 'Built for ambition',
    description:
      'From beginner robotics camps to competitive research internships, find the next step that matches where you want to go.',
  },
];

export function WhySection() {
  return (
    <section id="why-stempath" className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1120px]">
        <div className="max-w-[640px]">
          <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">
            Why STEMPath Finder
          </span>
          <h2 className="font-display mt-3 text-[30px] font-[650] leading-tight tracking-[-0.02em] text-foreground sm:text-[38px]">
            Built to be trusted, not just impressive
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[var(--radius-card)] border border-border bg-card p-7 transition-transform duration-[var(--motion-base)] hover:-translate-y-[3px]"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-display mt-5 text-lg font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

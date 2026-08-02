import { BadgeCheck } from 'lucide-react';

interface PreviewCard {
  title: string;
  organization: string;
  type: string;
  fields: string[];
  grades: string;
  status: 'open' | 'upcoming' | 'closed';
  deadline: string;
  majors: string;
}

const PREVIEW_CARDS: PreviewCard[] = [
  {
    title: 'High School Summer Research Program',
    organization: 'McGovern Medical School, UTHealth Houston',
    type: 'Research',
    fields: ['Biomedical & Health Sciences', 'Biology'],
    grades: 'Grades 10–11',
    status: 'open',
    deadline: 'Mar 15',
    majors: 'Biology, Pre-Med',
  },
  {
    title: 'Rice ELITE Tech Camp',
    organization: 'Rice Center for Engineering Leadership',
    type: 'Camp',
    fields: ['Computer Science & AI', 'Robotics'],
    grades: 'Grades 9–12',
    status: 'upcoming',
    deadline: 'Apr 30',
    majors: 'Computer Science, Engineering',
  },
  {
    title: 'Digital Health Workforce Initiative',
    organization: 'Texas Medical Center',
    type: 'Internship',
    fields: ['Computer Science & AI', 'Health Sciences'],
    grades: 'Grades 11–12',
    status: 'closed',
    deadline: 'Jan 15',
    majors: 'Health Informatics',
  },
];

const STATUS_STYLES: Record<PreviewCard['status'], string> = {
  open: 'text-[var(--brand-accent)] bg-[var(--brand-accent)]/12',
  upcoming: 'text-[var(--brand-warning)] bg-[var(--brand-warning)]/12',
  closed: 'text-[var(--brand-error)] bg-[var(--brand-error)]/12',
};

export function ProductPreview() {
  return (
    <div
      className="entrance-fade-up relative mx-auto w-full max-w-md rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6"
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
        <span className="inline-block size-1.5 rounded-full bg-primary" />
        Live preview
      </div>

      <div className="relative">
        {PREVIEW_CARDS.map((card, index) => (
          <div
            key={card.title}
            className="relative mb-4 rounded-[var(--radius-card)] border border-border bg-card p-4 last:mb-0"
            style={{
              transform: `translate(${index % 2 === 0 ? '0px' : '10px'}, 0) rotate(${
                index === 1 ? '-0.6deg' : index === 2 ? '0.5deg' : '0deg'
              })`,
              marginLeft: index * 6,
              marginRight: -(index * 6),
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display text-sm font-semibold leading-snug text-foreground">
                {card.title}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLES[card.status]}`}
              >
                {card.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.organization}</p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {card.type}
              </span>
              {card.fields.slice(0, 2).map((field) => (
                <span
                  key={field}
                  className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                >
                  {field}
                </span>
              ))}
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{card.grades}</span>
              <span>Deadline {card.deadline}</span>
              <span className="col-span-2">Related majors: {card.majors}</span>
            </div>

            <div className="mt-2.5 flex items-center gap-1 text-[10px] text-primary">
              <BadgeCheck className="size-3" />
              Verified source
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

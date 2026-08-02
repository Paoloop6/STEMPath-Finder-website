import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STEM_FIELDS,
  OPPORTUNITY_TYPES,
  FORMAT_PREFERENCES,
  COST_PREFERENCES,
  EXPERIENCE_LEVELS,
  TIME_COMMITMENTS
} from "@/lib/constants";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useStudentProfile } from "@/hooks/use-profile";
import { useMatchOpportunities } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import {
  DEFAULT_SEARCH_TIER,
  SEARCH_TIERS,
  SEARCH_TIER_HINTS,
  SEARCH_TIER_LABELS,
  type SearchTier,
} from "@/lib/search-tier";

const profileSchema = z.object({
  grade: z.coerce.number().min(6).max(12),
  age: z.coerce.number().min(10).max(20),
  stemInterest: z.string().min(1, "Required"),
  opportunityType: z.string().min(1, "Required"),
  locationPreference: z.string().optional().default(""),
  formatPreference: z.string().min(1, "Required"),
  costPreference: z.string().min(1, "Required"),
  experienceLevel: z.string().min(1, "Required"),
  timeCommitment: z.string().min(1, "Required"),
  tier: z.enum(SEARCH_TIERS).default(DEFAULT_SEARCH_TIER),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function MatchForm() {
  const [, setLocation] = useLocation();
  const { profile, setProfile } = useStudentProfile();
  const matchMutation = useMatchOpportunities();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile || {
      grade: 9,
      age: 15,
      stemInterest: "",
      opportunityType: "Any",
      locationPreference: "",
      formatPreference: "No Preference",
      costPreference: "Any",
      experienceLevel: "Beginner",
      timeCommitment: "Flexible",
      tier: DEFAULT_SEARCH_TIER,
    },
  });

  const formatPref = watch("formatPreference");
  const tier = watch("tier");

  const onSubmit = (data: ProfileFormValues) => {
    setProfile(data);
    matchMutation.mutate(
      { data },
      {
        onSuccess: (results) => {
          history.pushState({ results, profile: data }, "", "/results");
          setLocation("/results");
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Find your match</h1>
        <p className="text-muted-foreground mb-8">
          Fill out your profile and we'll score every opportunity for you.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Grade" error={errors.grade?.message}>
              <Controller
                name="grade"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <SelectItem key={g} value={String(g)}>{g}th grade</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Age" error={errors.age?.message}>
              <Input type="number" min={10} max={20} {...register("age")} />
            </Field>
          </div>

          <Field label="Primary STEM interest" error={errors.stemInterest?.message}>
            <Controller
              name="stemInterest"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {STEM_FIELDS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field label="Experience level" error={errors.experienceLevel?.message}>
            <Controller
              name="experienceLevel"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Opportunity type" error={errors.opportunityType?.message}>
              <Controller
                name="opportunityType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPPORTUNITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Time commitment" error={errors.timeCommitment?.message}>
              <Controller
                name="timeCommitment"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_COMMITMENTS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Format" error={errors.formatPreference?.message}>
              <Controller
                name="formatPreference"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_PREFERENCES.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field label="Cost" error={errors.costPreference?.message}>
              <Controller
                name="costPreference"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_PREFERENCES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          {formatPref !== "Remote" && formatPref !== "No Preference" && (
            <Field label="City or state (optional)" error={errors.locationPreference?.message}>
              <Input placeholder="e.g. San Francisco, CA" {...register("locationPreference")} />
            </Field>
          )}

          <Field label="Search depth" error={errors.tier?.message}>
            <Controller
              name="tier"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(v as SearchTier)}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_TIERS.map((t) => (
                      <SelectItem key={t} value={t}>{SEARCH_TIER_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">{SEARCH_TIER_HINTS[tier]}</p>
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              disabled={matchMutation.isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {matchMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {matchMutation.isPending ? "Scoring matches…" : "Find matches"}
            </button>
            {matchMutation.isError && (
              <p className="text-sm text-destructive mt-2">Something went wrong. Please try again.</p>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  );
}

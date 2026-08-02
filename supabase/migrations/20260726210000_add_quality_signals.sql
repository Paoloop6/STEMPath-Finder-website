-- Adds evidence-backed program-quality signals to candidate records.
--
-- Written by the research-opportunities edge function at extraction time; read
-- by the shared ranking module (supabase/functions/_shared/ranking.ts) to
-- compute the Program Quality dimension. Shape per component:
--   { "<component>": { "level": "strong"|"moderate"|"weak", "evidence": "<verbatim quote>" } }
-- for components: programSubstance, mentorship, studentOutput,
-- organizationCredibility, accessibilityAndValue, safetyAndSupport, transparency.
--
-- Additive and nullable — existing rows are untouched and simply rank with
-- Program Quality = "not yet assessed". Both edge functions tolerate this
-- column being absent, so the deploy order does not matter.
--
-- Apply with:  supabase db push   (or run this statement in the SQL editor)

alter table public.candidate
  add column if not exists quality_signals jsonb;

comment on column public.candidate.quality_signals is
  'Evidence-backed program quality signals extracted from the source page. Levels require a verbatim evidence quote; absent components are unassessed, never guessed.';

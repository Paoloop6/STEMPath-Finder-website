-- Adds evidence-backed grading signals to candidate records, replacing the
-- retired program-quality signals as the source of the course grade.
--
-- Written by the research-opportunities edge function whenever a new source is
-- discovered; read by the shared grading module
-- (supabase/functions/_shared/ranking.ts) to compute the three grade sections:
--   Course Completion (30) + Challenge Performance (40) + Final Project (30) = 100.
-- Shape per criterion:
--   { "<criterion>": { "level": "full"|"partial"|"minimal", "evidence": "<verbatim quote>" } }
-- for criteria: lessonsCompleted, quizzesCompleted, activitiesCompleted,
-- accuracy, followedInstructions, challengeCompleted, evidenceSubmitted,
-- solutionExplained, projectCompleted, requirementsMet, skillsDemonstrated,
-- resultPresented.
--
-- Additive and nullable — existing rows are untouched and simply grade as
-- "not yet graded". Both edge functions tolerate this column being absent, so
-- the deploy order does not matter. The old quality_signals column is no
-- longer read by any code and can be dropped in a later cleanup migration.
--
-- Apply with:  supabase db push   (or run this statement in the SQL editor)

alter table public.candidate
  add column if not exists grading_signals jsonb;

comment on column public.candidate.grading_signals is
  'Evidence-backed course grading signals recorded when a source is discovered. Credit levels require a verbatim evidence quote; absent criteria are ungraded, never guessed. Grade = Course Completion (30) + Challenge Performance (40) + Final Project (30).';

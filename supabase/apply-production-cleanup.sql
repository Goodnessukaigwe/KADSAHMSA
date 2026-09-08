-- Apply in Supabase SQL Editor after Phase 7.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
--
-- Production catalogue cleanup: unpublish seed courses that have enrolments
-- or certificates; delete empty seed/draft leftovers. Does not delete
-- certificate rows, Auth users, or TypeScript DPTC quiz banks.
-- Existing KAD- verification ids keep working via verify_certificate().

-- Seed slugs from the original catalogue insert (including DPTC).
-- Unpublished rows stay so staff can rebuild; certificates keep their course_id.

update public.courses
set status = 'draft'
where slug in (
  'dptc',
  'community-first-response',
  'human-rights-law-enforcement',
  'biological-drivers',
  'family-interventions',
  'advocacy-programmes',
  'special-populations',
  'drug-screening',
  'drug-use-nigeria',
  'demand-harm-reduction',
  'types-of-treatment',
  'law-enforcement-issues',
  'trainer-resource-pack',
  'organisation-cohort'
);

-- Stock marketing photos must not be used as course thumbnails.
update public.courses
set cover_path = ''
where cover_path like '/landing/%';

-- Delete seed courses and leftover verify drafts with no learner data.
-- Enrolments, lessons, assets, and quizzes cascade. Certificates require an
-- enrolment, so this never removes a KAD- row. Org invite course_id is set null.

delete from public.courses c
where not exists (
    select 1 from public.enrolments e where e.course_id = c.id
  )
  and not exists (
    select 1 from public.certificates cert where cert.course_id = c.id
  )
  and (
    c.slug in (
      'dptc',
      'community-first-response',
      'human-rights-law-enforcement',
      'biological-drivers',
      'family-interventions',
      'advocacy-programmes',
      'special-populations',
      'drug-screening',
      'drug-use-nigeria',
      'demand-harm-reduction',
      'types-of-treatment',
      'law-enforcement-issues',
      'trainer-resource-pack',
      'organisation-cohort'
    )
    or c.slug like 'untitled-%'
    or c.slug like 'p4b-verify-%'
  );

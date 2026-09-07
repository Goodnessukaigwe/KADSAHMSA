-- Thin catalogue for FKs. Lesson HTML stays in lib/content (Phases 3–6).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  status text not null default 'published'
    check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create index courses_status_idx on public.courses (status);

insert into public.courses (slug, title, status) values
  ('dptc', 'Sensitization on Drug Use, Dependence & Prevention (DPTC)', 'published'),
  ('community-first-response', 'Community-Based Substance Abuse First Response', 'published'),
  ('human-rights-law-enforcement', 'Human Rights Frameworks in Law Enforcement & Care', 'published'),
  ('biological-drivers', 'Biological Drivers of Substance Dependence', 'published'),
  ('family-interventions', 'Family Interventions in Drug Treatment', 'published'),
  ('advocacy-programmes', 'Advocacy for Drug Prevention Programmes', 'published'),
  ('special-populations', 'Special Populations in Drug Care', 'published'),
  ('drug-screening', 'Drug Screening: Steps to Take', 'published'),
  ('drug-use-nigeria', 'The Drug Use Situation in Nigeria', 'published'),
  ('demand-harm-reduction', 'Demand and Harm Reduction', 'published'),
  ('types-of-treatment', 'Types of Drug Treatment', 'published'),
  ('law-enforcement-issues', 'Specific Issues for Law Enforcement', 'published'),
  ('trainer-resource-pack', 'DPTC Trainer Resource Pack', 'published'),
  ('organisation-cohort', 'Organisation Cohort: Facilitator Certification', 'published')
on conflict (slug) do update
  set title = excluded.title;

alter table public.courses enable row level security;

create policy courses_select_published_or_staff
  on public.courses for select
  to anon, authenticated
  using (status = 'published' or public.is_staff());

create policy courses_write_staff
  on public.courses for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on table public.courses to anon, authenticated;
grant insert, update, delete on table public.courses to authenticated;

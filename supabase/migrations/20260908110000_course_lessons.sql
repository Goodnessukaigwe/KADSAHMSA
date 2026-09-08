-- Apply in Supabase SQL Editor after Phase 3.
-- https://supabase.com/dashboard/project/ujhjdqijrylcwihxpdpa/sql/new
-- Same SQL as supabase/migrations/20260908110000_course_lessons.sql
--
-- Phase 4: course catalogue fields, course_lessons, DPTC lesson seed,
-- and draft empty catalogue slugs. Quizzes and certificate rules stay in TypeScript.

alter table public.courses
  add column if not exists summary text not null default '',
  add column if not exists duration_label text not null default '',
  add column if not exists cover_path text not null default '',
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute procedure public.set_updated_at();

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null check (position > 0),
  slug text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'live')),
  duration_label text not null default '',
  introduction text not null default '',
  main text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists course_lessons_course_id_idx
  on public.course_lessons (course_id, position);

drop trigger if exists course_lessons_set_updated_at on public.course_lessons;
create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute procedure public.set_updated_at();

update public.courses
set
  summary = $dptc$The UNODC/EU-supported DPTC curriculum equips law enforcement, health workers, and public officers to recognise dependence, understand treatment, and respond with dignity. Built from the 236-page trainer resource for use across Nigeria.$dptc$,
  duration_label = '6 hrs',
  cover_path = '/landing/hero-phoenix.webp',
  status = 'published'
where slug = 'dptc';

update public.courses set cover_path = '/landing/hero-cabin.webp' where slug = 'community-first-response';
update public.courses set cover_path = '/landing/hero-crystal.webp' where slug = 'human-rights-law-enforcement';
update public.courses set cover_path = '/landing/about-apple.webp' where slug = 'biological-drivers';
update public.courses set cover_path = '/landing/about-stall.webp' where slug = 'family-interventions';
update public.courses set cover_path = '/landing/team-training.webp' where slug = 'advocacy-programmes';
update public.courses set cover_path = '/landing/course-island.webp' where slug = 'special-populations';
update public.courses set cover_path = '/landing/course-lantern-path.webp' where slug = 'drug-screening';
update public.courses set cover_path = '/landing/course-savannah.webp' where slug = 'drug-use-nigeria';
update public.courses set cover_path = '/landing/course-cave.webp' where slug = 'demand-harm-reduction';
update public.courses set cover_path = '/landing/course-book.webp' where slug = 'types-of-treatment';
update public.courses set cover_path = '/landing/course-city.webp' where slug = 'law-enforcement-issues';
update public.courses set cover_path = '/landing/course-book.webp' where slug = 'trainer-resource-pack';
update public.courses set cover_path = '/landing/team-training.webp' where slug = 'organisation-cohort';

update public.courses
set status = 'draft'
where slug <> 'dptc';

insert into public.course_lessons (
  course_id, position, slug, title, status, duration_label, introduction, main, notes
)
select
  c.id,
  v.position,
  v.slug,
  v.title,
  'live',
  v.duration_label,
  v.introduction,
  v.main,
  v.notes
from public.courses c
cross join (
  values
(1, $dptc$introduction$dptc$, $dptc$Course Introduction and Outline$dptc$, $dptc$28 Min$dptc$, $dptc$This curriculum turns the UNODC/EU trainer resource into a path any Kaduna officer, health worker, or community leader can finish. You will learn to recognise use and dependence, screen with dignity, and know when treatment — not punishment — is the right next step.$dptc$, $dptc$How the 13 modules fit

Modules move from the national picture, through biology and stigma, into supply, demand and harm reduction, screening, treatment, families, special populations, rights, law enforcement, and advocacy. Each module has a short quiz. The certificate assessment needs 70%.

How to use this course

Watch or read at your own pace. Download the trainer PDF if you will facilitate others. Come back from My courses — progress is saved to this account.$dptc$, $dptc$DPTC means Drug Prevention, Treatment and Care — the UNODC package this LMS was built to deliver in Kaduna State.$dptc$),
  (2, $dptc$drug-use-nigeria$dptc$, $dptc$The Drug Use Situation in Nigeria$dptc$, $dptc$32 Min$dptc$, $dptc$Nigeria’s last nationally representative drug-use survey found that about 14.3 million people aged 15–64 had used a psychoactive substance (other than tobacco and alcohol) in the previous year — roughly 14.4% of that age group. Cannabis is the most commonly used substance, followed by opioids, including non-medical use of prescription opioids and cough syrups. These figures sit well above the West African average and are the starting point for every DPTC module that follows.$dptc$, $dptc$Why the numbers likely undercount the problem

Household surveys miss people who are homeless, in custody, in treatment, or who will not disclose use because of stigma and criminalisation. Kaduna State data from treatment and law-enforcement partners consistently show a heavier burden than survey snapshots imply — especially among young men and among women who use in private. Treat published prevalence as a floor, not a ceiling.

What this means for your role

Whether you work in policing, health, social welfare, or community leadership, the scale of use means you will meet people who use drugs. DPTC asks you to replace guesswork with screening, to distinguish use from dependence, and to route people toward treatment rather than punishment wherever the law allows. The next modules turn this national picture into practical steps.$dptc$, $dptc$“Non-medical use” means using a substance without a prescription, in larger amounts than prescribed, or for a purpose other than the one it was prescribed for — including sharing leftover medicines.$dptc$),
  (3, $dptc$drugs-and-effects$dptc$, $dptc$Drugs and Effects: Understanding Drug Dependency$dptc$, $dptc$22 Min$dptc$, $dptc$Many people use a substance without becoming dependent. Dependence is a pattern of compulsion, tolerance, and withdrawal that needs a clinical and social response — not a moral verdict.$dptc$, $dptc$What substances do in the body

Depressants, stimulants, opioids, and cannabis act on different systems. Knowing the class helps you recognise overdose risk, agitation, and when to call medical help.

What this means on duty

Do not assume criminal intent from intoxication. Stabilise, screen, and refer. Stigma at the first contact is why people hide use and present late.$dptc$, $dptc$Dependence is a chronic, relapsing condition — not a one-off choice — and it responds to treatment.$dptc$),
  (4, $dptc$causes-and-stigma$dptc$, $dptc$Causes of Drug Use and Associated Stigma$dptc$, $dptc$26 Min$dptc$, $dptc$Use is driven by availability, poverty, trauma, peer networks, untreated mental illness, and sometimes prescribed medicines that slip into non-medical use. No single cause explains Kaduna’s caseload.$dptc$, $dptc$How stigma blocks care

Shame, police harassment, and family rejection keep people away from screening and treatment. Language such as “addict” or “junkie” in a station or clinic is itself a barrier.

A rights-based first response

Treat the person as a rights-holder. Confidentiality, calm contact, and a clear path to help reduce harm more than public confrontation.$dptc$, $dptc$Stigma is social marking that reduces a person to their drug use and justifies exclusion from health and justice services.$dptc$),
  (5, $dptc$supply-reduction$dptc$, $dptc$Understanding the Concept of Supply Reduction$dptc$, $dptc$28 Min$dptc$, $dptc$Supply reduction targets production, trafficking, and diversion of controlled substances. It is one leg of a balanced approach — alongside demand and harm reduction.$dptc$, $dptc$What seizures cannot do alone

Enforcement without treatment recycles the same people through cells. DPTC asks officers to pair supply work with screening and referral, especially for possession for personal use.

Working in Kaduna

State and federal partners share borders, precursor routes, and pharmaceutical diversion. Coordination with KADSAMHSA and health facilities is part of the job, not an extra.$dptc$, $dptc$A balanced approach uses supply, demand, and harm reduction together rather than enforcement only.$dptc$),
  (6, $dptc$demand-harm-reduction$dptc$, $dptc$Demand and Harm Reduction$dptc$, $dptc$24 Min$dptc$, $dptc$Prevention, education, and treatment reduce the number of people who start or continue harmful use. Schools, families, and workplaces are prevention settings — not only police parades.$dptc$, $dptc$Harm reduction

Harm reduction keeps people alive and in contact with services even if they are not ready to stop. Overdose response, sterile equipment where policy allows, and non-punitive first contact are examples.

Not a contradiction

You can enforce trafficking laws and still treat a dependent person as a patient. DPTC expects both instincts in the same officer.$dptc$, $dptc$Harm reduction means policies and practices that reduce the negative health and social effects of drug use without requiring abstinence first.$dptc$),
  (7, $dptc$drug-screening$dptc$, $dptc$Drug Screening: Steps to Take$dptc$, $dptc$32 Min$dptc$, $dptc$Screen when use is disclosed, suspected after an incident, or when a family or commander asks for help. Screening is a conversation with a purpose — not a trap.$dptc$, $dptc$How to screen

Use short, validated questions, private space, and plain language. Record only what your protocol requires. Do not announce results to a crowd.

After a positive screen

Distinguish hazardous use from dependence, explain options, and refer to treatment. Immediate arrest for personal use is not the DPTC default.$dptc$, $dptc$Screening is a brief, structured check for possible drug use or dependence — it is not a full diagnosis.$dptc$),
  (8, $dptc$types-of-treatment$dptc$, $dptc$Types of Drug Treatment$dptc$, $dptc$25 Min$dptc$, $dptc$Treatment includes counselling, outpatient programmes, inpatient care, medically assisted treatment for opioids, and recovery support. One size does not fit Kaduna’s caseload.$dptc$, $dptc$Matching the person to care

Severity, other illnesses, pregnancy, age, and whether the person is in custody all change the right setting. Refer rather than invent a programme in the station.

Relapse is part of the condition

A return to use is a reason to re-engage, not to close the file. DPTC treats relapse as a clinical event.$dptc$, $dptc$Medically assisted treatment uses prescribed medicines, with psychosocial support, to treat opioid dependence.$dptc$),
  (9, $dptc$family-interventions$dptc$, $dptc$Interventions and Responses to Drug Problems in the Family$dptc$, $dptc$28 Min$dptc$, $dptc$Families notice change first. They can also punish, hide, or enable. DPTC trains you to bring them in without using shame as a tool.$dptc$, $dptc$The first conversation

Approach calmly, in private, and encourage professional help. Public confrontation and threats of immediate arrest make disclosure less likely.

When there is violence or a child at risk

Safety comes first. Follow child-protection and domestic-violence protocols alongside the drug-care path — they are not optional extras.$dptc$, $dptc$Family intervention means structured support so relatives help a person enter and stay in treatment without humiliation.$dptc$),
  (10, $dptc$special-populations$dptc$, $dptc$Special Populations in Drug Care$dptc$, $dptc$30 Min$dptc$, $dptc$Women, pregnant people, young users, and people who inject drugs face extra stigma, extra legal risk, and extra health harm. Generic male-adult protocols miss them.$dptc$, $dptc$Women and girls

Women often use in private, face custody loss, and avoid male-dominated facilities. Offer female staff, confidentiality, and links to reproductive health.

Young users

Age-appropriate language, family involvement where safe, and schooling matter as much as the substance. Do not treat a 16-year-old as a trafficking suspect by default.$dptc$, $dptc$Special populations are groups whose legal, health, or social situation requires adapted DPTC practice — not a lighter version of the same lecture.$dptc$),
  (11, $dptc$human-rights$dptc$, $dptc$Human Rights and Drug Users$dptc$, $dptc$32 Min$dptc$, $dptc$People who use drugs keep the right to health, due process, and freedom from torture. DPTC includes the death-penalty supplement because some drug offences still carry capital risk in law.$dptc$, $dptc$In custody

Withdrawal in a cell is a medical emergency. Denial of treatment, public stripping, or coerced confession is abuse — not investigation.

Rights-based practice

Document, refer, and escalate. A rights-based officer is still an officer — they just refuse shortcuts that destroy evidence and people.$dptc$, $dptc$A rights-based approach treats the person who uses drugs as a rights-holder first, including in arrest and detention.$dptc$),
  (12, $dptc$law-enforcement$dptc$, $dptc$Specific Issues for Law Enforcement$dptc$, $dptc$28 Min$dptc$, $dptc$You interrupt trafficking and you are often the first state face a dependent person meets. DPTC asks you to hold both without collapsing them into one punishment.$dptc$, $dptc$Discretion and referral

Where the law allows diversion or caution for personal use, use it. Record the referral. A quiet path to KADSAMHSA or a clinic is still a professional outcome.

Officer safety

Intoxication, needles, and agitated withdrawal are operational risks. PPE, backup, and medical call-out are part of DPTC, not a sign of softness.$dptc$, $dptc$Diversion sends a person toward treatment or social support instead of — or alongside — a criminal file, where the law allows.$dptc$),
  (13, $dptc$advocacy$dptc$, $dptc$Understanding Advocacy and Steps to Achieve Success$dptc$, $dptc$26 Min$dptc$, $dptc$Advocacy in DPTC is planned work to change a practice, a budget, or a by-law so prevention and treatment can actually run — not a slogan on a banner.$dptc$, $dptc$Steps that work

Name the problem with data, identify who can change it, propose a specific ask, and follow up. Kaduna examples include clinic hours, female-only days, and station referral cards.

Your next ask

Finish the remaining modules, pass the assessment, and take one concrete change back to your unit. The certificate is evidence you completed the curriculum — the work is what you change on Monday.$dptc$, $dptc$Advocacy is organised influence toward a specific policy or practice change, backed by evidence from this curriculum.$dptc$)
) as v(position, slug, title, duration_label, introduction, main, notes)
where c.slug = 'dptc'
on conflict (course_id, slug) do update
  set position = excluded.position,
      title = excluded.title,
      status = excluded.status,
      duration_label = excluded.duration_label,
      introduction = excluded.introduction,
      main = excluded.main,
      notes = excluded.notes;

alter table public.course_lessons enable row level security;

drop policy if exists course_lessons_select_live_or_staff on public.course_lessons;
create policy course_lessons_select_live_or_staff
  on public.course_lessons for select
  to anon, authenticated
  using (
    public.is_staff()
    or (
      status = 'live'
      and exists (
        select 1
        from public.courses c
        where c.id = course_lessons.course_id
          and c.status = 'published'
      )
    )
  );

drop policy if exists course_lessons_write_staff on public.course_lessons;
create policy course_lessons_write_staff
  on public.course_lessons for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant select on table public.course_lessons to anon, authenticated;
grant insert, update, delete on table public.course_lessons to authenticated;

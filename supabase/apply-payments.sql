-- Paid enrolment: course prices, a free-seat limit, and a payments ledger (Paystack).
-- Safe to run more than once.

alter table public.courses
  add column if not exists price_kobo integer not null default 0 check (price_kobo >= 0),
  add column if not exists free_seat_limit integer default 100 check (free_seat_limit is null or free_seat_limit >= 0);

comment on column public.courses.price_kobo is 'Price in kobo (NGN x 100). 0 means no price is set yet.';
comment on column public.courses.free_seat_limit is 'The first N learners enrol free; after that the course must be paid for. NULL means free for everyone, with no limit.';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  reference text not null unique,
  amount_kobo integer not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  paystack_transaction_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments
  add column if not exists channel text,
  add column if not exists fees_kobo integer;

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_course_idx on public.payments (course_id, status);

alter table public.payments enable row level security;

-- Learners read only their own payments. Every write goes through the service role.
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- Live chat: the chat bubble on every page, and the team inbox in /admin/inbox.
-- Visitors hold a private token in their browser; nothing else identifies them. All access goes
-- through server code with the service role (no policies for anon or authenticated users).
-- Apply via supabase/apply-help-chat.sql in the SQL editor if you are not using db push.

create table if not exists public.help_chats (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page text,
  ip_hash text,
  name text,
  email text check (email is null or char_length(email) <= 200),
  user_id uuid,
  topic text,
  summary text,
  client_turns integer not null default 0,
  handoff_at timestamptz,
  staff_joined_at timestamptz,
  status text not null default 'new' check (status in ('new', 'working', 'waiting', 'resolved')),
  priority text not null default 'normal' check (priority in ('urgent', 'high', 'normal')),
  owner_id uuid,
  last_from text,
  last_text text,
  last_at timestamptz,
  visitor_seen_at timestamptz,
  notified_at timestamptz,
  visitor_notified_at timestamptz,
  rating smallint check (rating is null or rating between 1 and 5),
  rating_comment text,
  rated_at timestamptz
);

create index if not exists help_chats_recent_idx on public.help_chats (updated_at desc);
create index if not exists help_chats_ip_idx on public.help_chats (ip_hash, created_at);
create index if not exists help_chats_status_idx on public.help_chats (status);

create table if not exists public.help_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.help_chats (id),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('client', 'assistant', 'team', 'note', 'system')),
  author text,
  author_id uuid,
  body text not null check (char_length(body) between 1 and 4000)
);

create index if not exists help_messages_chat_idx on public.help_messages (chat_id, created_at);

-- Saved replies ("shortcuts") the team can drop into a reply.
create table if not exists public.saved_replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 2000),
  created_by uuid
);

-- Who has the inbox open right now (drives "team online" in the chat header).
create table if not exists public.help_team_presence (
  user_id uuid primary key,
  last_seen_at timestamptz not null default now()
);

alter table public.help_chats enable row level security;
alter table public.help_messages enable row level security;
alter table public.saved_replies enable row level security;
alter table public.help_team_presence enable row level security;

revoke all on table public.help_chats from anon, authenticated;
revoke all on table public.help_messages from anon, authenticated;
revoke all on table public.saved_replies from anon, authenticated;
revoke all on table public.help_team_presence from anon, authenticated;

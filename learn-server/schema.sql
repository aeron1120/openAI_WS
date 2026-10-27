-- SNU 수업·질문 시스템. Supabase 대시보드 → SQL Editor에 붙여 넣고 Run.
-- 모든 테이블은 RLS를 켜고 정책을 만들지 않습니다: 서비스 키를 쓰는 Render 서버만 읽고 씁니다.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null,
  name text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.progress (
  student_id uuid not null references public.students(id) on delete cascade,
  workshop smallint not null,
  step_id text not null,
  completed_at timestamptz not null default now(),
  primary key (student_id, workshop, step_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  workshop smallint not null,
  step_id text not null,
  mode text check (mode in ('example', 'own')),
  status text not null default 'escalated' check (status in ('ai_answered', 'escalated', 'answered', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists questions_status_idx on public.questions (status, updated_at desc);
create index if not exists questions_student_idx on public.questions (student_id, created_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author text not null check (author in ('student', 'ai', 'operator')),
  operator_email text,
  body text not null check (char_length(body) between 1 and 4000),
  error_text text check (error_text is null or char_length(error_text) <= 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_question_idx on public.messages (question_id, created_at);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references public.students(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  path text not null unique,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp')),
  size integer not null check (size between 1 and 5242880),
  created_at timestamptz not null default now()
);
create index if not exists attachments_message_idx on public.attachments (message_id);

alter table public.students enable row level security;
alter table public.progress enable row level security;
alter table public.questions enable row level security;
alter table public.messages enable row level security;
alter table public.attachments enable row level security;

-- 브라우저용 역할(anon·authenticated)에는 권한을 주지 않고, 서버가 쓰는 service_role에만 줍니다.
-- 프로젝트를 만들 때 'Automatically expose new tables'를 꺼도 서버가 동작하도록 직접 적어 둡니다.
revoke all on public.students, public.progress, public.questions, public.messages, public.attachments from anon, authenticated;
grant select, insert, update, delete on public.students, public.progress, public.questions, public.messages, public.attachments to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-images', 'question-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

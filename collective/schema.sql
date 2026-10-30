-- Student Collective 중앙 관리(CMS). 기존 SNU 학습 데이터(students·progress·questions·messages·attachments)와
-- 같은 Supabase 프로젝트를 쓰되, 모든 테이블을 cms_ 접두어로 따로 둡니다. 기존 테이블은 읽거나 바꾸지 않습니다.
-- Supabase 대시보드 → SQL Editor에 붙여 넣고 Run. 여러 번 실행해도 안전합니다(추가만 함).
-- 모든 테이블은 RLS를 켜고 정책을 만들지 않습니다: 서비스 키를 쓰는 CMS 서버만 읽고 씁니다.

-- 편집 중인 콘텐츠(초안). kind별 필드는 collective/server/content.mjs에 정의되어 있습니다.
-- campus_id: 학교에 속한 항목(학기·일정·공지·프로젝트)은 학교 ID, 공통 항목(자료·통합 메인)은 null.
create table if not exists public.cms_items (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  kind text not null check (kind in ('campus', 'term', 'event', 'notice', 'project', 'material', 'material_version', 'home')),
  campus_id text,
  data jsonb not null,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null
);
create index if not exists cms_items_kind_idx on public.cms_items (kind, campus_id);
create unique index if not exists cms_items_campus_slug_idx on public.cms_items ((data->>'slug')) where kind = 'campus';

-- 게시본: 바꾸지 않는 스냅샷. scope는 'global' 또는 'campus:<학교 ID>'.
create table if not exists public.cms_releases (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  number integer not null,
  kind text not null check (kind in ('publish', 'restore')),
  restored_from uuid references public.cms_releases(id),
  snapshot jsonb not null,
  item_revisions jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  request_id text not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  unique (scope, number)
);

-- 지금 서비스하는 게시본 포인터(학교마다 하나, 통합 메인 하나).
create table if not exists public.cms_active (
  scope text primary key,
  release_id uuid not null references public.cms_releases(id),
  updated_at timestamptz not null default now()
);

-- 게시 요청 결과. 같은 request_id로 다시 요청하면 새로 만들지 않고 이 결과를 돌려줍니다.
create table if not exists public.cms_publish_jobs (
  request_id text primary key,
  actor text not null,
  created_at timestamptz not null default now(),
  releases jsonb not null
);

create table if not exists public.cms_audit (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  scope text,
  target text,
  summary jsonb not null default '{}'::jsonb
);
create index if not exists cms_audit_at_idx on public.cms_audit (at desc);

-- 올린 파일 정보. 파일 자체는 비공개 버킷 cms-media에 두고, 서버가 공개 여부를 확인한 뒤 내려줍니다.
create table if not exists public.cms_media (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  path text not null unique,
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
  size integer not null check (size between 1 and 26214400),
  sha256 text not null,
  filename text not null default '',
  created_at timestamptz not null default now(),
  created_by text not null
);

alter table public.cms_items enable row level security;
alter table public.cms_releases enable row level security;
alter table public.cms_active enable row level security;
alter table public.cms_publish_jobs enable row level security;
alter table public.cms_audit enable row level security;
alter table public.cms_media enable row level security;

revoke all on public.cms_items, public.cms_releases, public.cms_active, public.cms_publish_jobs, public.cms_audit, public.cms_media from anon, authenticated;
grant select, insert, update on public.cms_items, public.cms_releases, public.cms_active, public.cms_publish_jobs, public.cms_audit, public.cms_media to service_role;

-- 게시: 모든 대상의 revision을 확인한 뒤 스냅샷 저장·active 전환·기록을 한 트랜잭션으로 처리합니다.
-- 하나라도 바뀌었으면 CMS_CONFLICT 오류로 전부 취소됩니다. 같은 request_id는 처음 결과를 그대로 돌려줍니다.
create or replace function public.cms_publish(p_request_id text, p_actor text, p_entries jsonb, p_now timestamptz)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_job jsonb;
  v_entry jsonb;
  v_key text;
  v_rev integer;
  v_current integer;
  v_number integer;
  v_id uuid;
  v_kind text;
  v_out jsonb := '[]'::jsonb;
begin
  -- 게시를 한 번에 하나씩 처리해 번호가 겹치지 않게 합니다.
  perform pg_advisory_xact_lock(hashtext('cms_publish'));
  select releases into v_job from cms_publish_jobs where request_id = p_request_id;
  if found then
    return jsonb_build_object('duplicate', true, 'releases', v_job);
  end if;

  for v_entry in select value from jsonb_array_elements(p_entries) loop
    for v_key, v_rev in select key, value::integer from jsonb_each_text(coalesce(v_entry->'itemRevisions', '{}'::jsonb)) loop
      select revision into v_current from cms_items where id = v_key for update;
      if v_current is distinct from v_rev then
        raise exception 'CMS_CONFLICT %', v_key;
      end if;
    end loop;
  end loop;

  for v_entry in select value from jsonb_array_elements(p_entries) loop
    v_kind := coalesce(v_entry->>'kind', 'publish');
    select coalesce(max(number), 0) + 1 into v_number from cms_releases where scope = v_entry->>'scope';
    insert into cms_releases (scope, number, kind, restored_from, snapshot, item_revisions, summary, request_id, created_at, created_by)
    values (v_entry->>'scope', v_number, v_kind, nullif(v_entry->>'restoredFrom', '')::uuid, v_entry->'snapshot',
            coalesce(v_entry->'itemRevisions', '{}'::jsonb), coalesce(v_entry->'summary', '{}'::jsonb), p_request_id, p_now, p_actor)
    returning id into v_id;
    insert into cms_active (scope, release_id, updated_at) values (v_entry->>'scope', v_id, p_now)
    on conflict (scope) do update set release_id = excluded.release_id, updated_at = excluded.updated_at;
    insert into cms_audit (at, actor, action, scope, target, summary)
    values (p_now, p_actor, v_kind, v_entry->>'scope', v_id::text, jsonb_build_object('number', v_number) || coalesce(v_entry->'summary', '{}'::jsonb));
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'id', v_id, 'scope', v_entry->>'scope', 'number', v_number, 'kind', v_kind, 'restoredFrom', v_entry->'restoredFrom',
      'summary', coalesce(v_entry->'summary', '{}'::jsonb), 'createdAt', p_now, 'createdBy', p_actor));
  end loop;

  insert into cms_publish_jobs (request_id, actor, created_at, releases) values (p_request_id, p_actor, p_now, v_out);
  return jsonb_build_object('duplicate', false, 'releases', v_out);
end;
$$;

revoke execute on function public.cms_publish(text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.cms_publish(text, text, jsonb, timestamptz) to service_role;

-- 비공개 파일 저장 공간. 기존 질문 첨부 버킷(question-images)과 따로 둡니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cms-media', 'cms-media', false, 26214400, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

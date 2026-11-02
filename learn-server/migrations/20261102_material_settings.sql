-- SNU 수업 서버: 운영진 자료 공개 설정. 기존 테이블과 데이터는 변경하지 않습니다.
create table if not exists public.material_settings (
  workshop smallint primary key check (workshop between 1 and 99),
  mode text not null check (mode in ('scheduled', 'open', 'closed')),
  opens_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  check ((mode = 'scheduled' and opens_at is not null) or (mode <> 'scheduled' and opens_at is null))
);
alter table public.material_settings enable row level security;
revoke all on public.material_settings from anon, authenticated;
grant select, insert, update on public.material_settings to service_role;

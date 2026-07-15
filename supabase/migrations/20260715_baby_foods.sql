create table if not exists public.baby_foods (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  settings jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint baby_foods_one_settings_row unique (baby_id),
  constraint baby_foods_settings_is_array check (jsonb_typeof(settings) = 'array')
);

create index if not exists baby_foods_family_baby_idx on public.baby_foods(family_id, baby_id);
alter table public.baby_foods enable row level security;

create policy "Family members view baby foods" on public.baby_foods for select to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members add baby foods" on public.baby_foods for insert to authenticated
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members update baby foods" on public.baby_foods for update to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id))
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family managers delete baby foods" on public.baby_foods for delete to authenticated
using (private.can_manage_family(family_id) and private.baby_belongs_to_family(baby_id, family_id));

grant select, insert, update, delete on public.baby_foods to authenticated;

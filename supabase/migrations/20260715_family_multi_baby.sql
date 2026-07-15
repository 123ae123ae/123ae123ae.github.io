begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '家人' check (char_length(display_name) between 1 and 60),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists public.babies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 60),
  birth_date date,
  gender text check (gender is null or gender in ('female','male','other','unspecified')),
  avatar_path text,
  notes text check (notes is null or char_length(notes) <= 2000),
  display_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (char_length(invited_email) between 3 and 320)
);

create unique index if not exists family_invitations_pending_email_idx
on public.family_invitations (family_id, lower(invited_email))
where status = 'pending';

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_family_id uuid references public.families(id) on delete set null,
  active_baby_id uuid references public.babies(id) on delete set null,
  locale text not null default 'zh-CN' check (locale in ('zh-CN','fr','en','ug')),
  updated_at timestamptz not null default now()
);

create table if not exists public.baby_reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  baby_id uuid not null references public.babies(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  remind_at timestamptz,
  enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meals add column if not exists family_id uuid;
alter table public.meals add column if not exists baby_id uuid;
alter table public.food_plans add column if not exists family_id uuid;
alter table public.food_plans add column if not exists baby_id uuid;

insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'display_name',''), split_part(u.email,'@',1), '家人')
from auth.users u
on conflict (id) do nothing;

insert into public.families (name, owner_id)
select coalesce(bp.baby_name || ' 的家庭', '我的家庭'), u.id
from auth.users u
left join public.baby_profiles bp on bp.user_id = u.id
where not exists (select 1 from public.families f where f.owner_id = u.id);

insert into public.family_members (family_id, user_id, role)
select f.id, f.owner_id, 'owner'
from public.families f
on conflict (family_id, user_id) do nothing;

insert into public.babies (family_id, nickname, birth_date, avatar_path, created_by, display_order)
select f.id, bp.baby_name, bp.birth_date, bp.avatar_path, bp.user_id, 0
from public.baby_profiles bp
join public.families f on f.owner_id = bp.user_id
where not exists (select 1 from public.babies b where b.family_id = f.id);

update public.meals m
set family_id = f.id,
    baby_id = b.id
from public.families f
join lateral (
  select id from public.babies where family_id = f.id order by display_order, created_at limit 1
) b on true
where f.owner_id = m.user_id and (m.family_id is null or m.baby_id is null);

update public.food_plans p
set family_id = f.id,
    baby_id = b.id
from public.families f
join lateral (
  select id from public.babies where family_id = f.id order by display_order, created_at limit 1
) b on true
where f.owner_id = p.user_id and (p.family_id is null or p.baby_id is null);

insert into public.user_preferences (user_id, active_family_id, active_baby_id)
select f.owner_id, f.id,
  (select id from public.babies b where b.family_id = f.id order by display_order, created_at limit 1)
from public.families f
on conflict (user_id) do update set
  active_family_id = coalesce(public.user_preferences.active_family_id, excluded.active_family_id),
  active_baby_id = coalesce(public.user_preferences.active_baby_id, excluded.active_baby_id),
  updated_at = now();

alter table public.meals drop constraint if exists meals_user_id_fkey;
alter table public.meals alter column user_id drop not null;
alter table public.meals add constraint meals_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.meals alter column family_id set not null;
alter table public.meals alter column baby_id set not null;
alter table public.meals add constraint meals_family_id_fkey foreign key (family_id) references public.families(id) on delete cascade;
alter table public.meals add constraint meals_baby_id_fkey foreign key (baby_id) references public.babies(id) on delete cascade;

alter table public.food_plans drop constraint if exists food_plans_user_id_fkey;
alter table public.food_plans alter column user_id drop not null;
alter table public.food_plans add constraint food_plans_user_id_fkey foreign key (user_id) references auth.users(id) on delete set null;
alter table public.food_plans alter column family_id set not null;
alter table public.food_plans alter column baby_id set not null;
alter table public.food_plans add constraint food_plans_family_id_fkey foreign key (family_id) references public.families(id) on delete cascade;
alter table public.food_plans add constraint food_plans_baby_id_fkey foreign key (baby_id) references public.babies(id) on delete cascade;
alter table public.food_plans drop constraint if exists food_plans_user_id_food_key;
alter table public.food_plans add constraint food_plans_baby_food_key unique (baby_id, food);

create index if not exists family_members_user_idx on public.family_members(user_id, family_id);
create index if not exists babies_family_idx on public.babies(family_id, display_order, created_at);
create index if not exists meals_baby_eaten_idx on public.meals(baby_id, eaten_at);
create index if not exists meals_family_idx on public.meals(family_id);
create index if not exists food_plans_baby_idx on public.food_plans(baby_id, created_at);
create index if not exists baby_reminders_baby_idx on public.baby_reminders(baby_id, remind_at);

create or replace function private.is_family_member(p_family_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_id = p_family_id and fm.user_id = p_user_id
  );
$$;

create or replace function private.family_role(p_family_id uuid, p_user_id uuid default auth.uid())
returns text language sql stable security definer set search_path = '' as $$
  select fm.role from public.family_members fm
  where fm.family_id = p_family_id and fm.user_id = p_user_id;
$$;

create or replace function private.can_manage_family(p_family_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.family_role(p_family_id, p_user_id) in ('owner','admin'), false);
$$;

create or replace function private.baby_belongs_to_family(p_baby_id uuid, p_family_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.babies b where b.id = p_baby_id and b.family_id = p_family_id);
$$;

create or replace function private.current_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u where u.id = auth.uid();
$$;

create or replace function private.users_share_family(p_other_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = auth.uid() and theirs.user_id = p_other_user
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_family_member(uuid,uuid), private.family_role(uuid,uuid),
  private.can_manage_family(uuid,uuid), private.baby_belongs_to_family(uuid,uuid),
  private.current_email(), private.users_share_family(uuid) to authenticated;

create or replace function private.fill_baby_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_family uuid; v_baby uuid;
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  v_baby := new.baby_id;
  if v_baby is null then
    select up.active_baby_id into v_baby from public.user_preferences up where up.user_id = auth.uid();
  end if;
  if v_baby is null then
    select b.id into v_baby
    from public.family_members fm join public.babies b on b.family_id = fm.family_id
    where fm.user_id = auth.uid() order by b.display_order, b.created_at limit 1;
  end if;
  select b.family_id into v_family from public.babies b where b.id = v_baby;
  if v_family is null then raise exception 'baby_scope_required'; end if;
  if new.family_id is not null and new.family_id <> v_family then raise exception 'baby_family_mismatch'; end if;
  new.baby_id := v_baby;
  new.family_id := v_family;
  return new;
end;
$$;

drop trigger if exists meals_fill_baby_scope on public.meals;
create trigger meals_fill_baby_scope before insert or update of baby_id, family_id on public.meals
for each row execute function private.fill_baby_scope();
drop trigger if exists food_plans_fill_baby_scope on public.food_plans;
create trigger food_plans_fill_baby_scope before insert or update of baby_id, family_id on public.food_plans
for each row execute function private.fill_baby_scope();

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.babies enable row level security;
alter table public.family_invitations enable row level security;
alter table public.user_preferences enable row level security;
alter table public.baby_reminders enable row level security;

drop policy if exists "Profiles are visible to family" on public.profiles;
create policy "Profiles are visible to family" on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.users_share_family(id));
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists "Users create own profile" on public.profiles;
create policy "Users create own profile" on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

drop policy if exists "Members view families" on public.families;
create policy "Members view families" on public.families for select to authenticated
using (private.is_family_member(id));
drop policy if exists "Managers update family" on public.families;
create policy "Managers update family" on public.families for update to authenticated
using (private.can_manage_family(id)) with check (private.can_manage_family(id));

drop policy if exists "Members view memberships" on public.family_members;
create policy "Members view memberships" on public.family_members for select to authenticated
using (private.is_family_member(family_id));
drop policy if exists "Owner changes member roles" on public.family_members;
create policy "Owner changes member roles" on public.family_members for update to authenticated
using (private.family_role(family_id) = 'owner' and user_id <> (select f.owner_id from public.families f where f.id = family_id))
with check (private.family_role(family_id) = 'owner' and role in ('admin','member'));
drop policy if exists "Members can leave or managers remove" on public.family_members;
create policy "Members can leave or managers remove" on public.family_members for delete to authenticated
using (
  user_id <> (select f.owner_id from public.families f where f.id = family_id)
  and (user_id = (select auth.uid()) or private.can_manage_family(family_id))
);

drop policy if exists "Members view babies" on public.babies;
create policy "Members view babies" on public.babies for select to authenticated
using (private.is_family_member(family_id));
drop policy if exists "Managers add babies" on public.babies;
create policy "Managers add babies" on public.babies for insert to authenticated
with check (private.can_manage_family(family_id) and created_by = (select auth.uid()));
drop policy if exists "Managers update babies" on public.babies;
create policy "Managers update babies" on public.babies for update to authenticated
using (private.can_manage_family(family_id)) with check (private.can_manage_family(family_id));

drop policy if exists "Managers and invitee view invitations" on public.family_invitations;
create policy "Managers and invitee view invitations" on public.family_invitations for select to authenticated
using (private.can_manage_family(family_id) or lower(invited_email) = private.current_email());
drop policy if exists "Managers create invitations" on public.family_invitations;
create policy "Managers create invitations" on public.family_invitations for insert to authenticated
with check (private.can_manage_family(family_id) and invited_by = (select auth.uid()));
drop policy if exists "Managers cancel invitations" on public.family_invitations;
create policy "Managers cancel invitations" on public.family_invitations for update to authenticated
using (private.can_manage_family(family_id)) with check (private.can_manage_family(family_id));

drop policy if exists "Users view own preferences" on public.user_preferences;
create policy "Users view own preferences" on public.user_preferences for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "Users insert own preferences" on public.user_preferences;
create policy "Users insert own preferences" on public.user_preferences for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (active_family_id is null or private.is_family_member(active_family_id))
  and (active_baby_id is null or private.baby_belongs_to_family(active_baby_id, active_family_id))
);
drop policy if exists "Users update own preferences" on public.user_preferences;
create policy "Users update own preferences" on public.user_preferences for update to authenticated
using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (active_family_id is null or private.is_family_member(active_family_id))
  and (active_baby_id is null or private.baby_belongs_to_family(active_baby_id, active_family_id))
);

drop policy if exists "Members view reminders" on public.baby_reminders;
create policy "Members view reminders" on public.baby_reminders for select to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
drop policy if exists "Members add reminders" on public.baby_reminders;
create policy "Members add reminders" on public.baby_reminders for insert to authenticated
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id) and created_by = (select auth.uid()));
drop policy if exists "Members update reminders" on public.baby_reminders;
create policy "Members update reminders" on public.baby_reminders for update to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id))
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
drop policy if exists "Members delete reminders" on public.baby_reminders;
create policy "Members delete reminders" on public.baby_reminders for delete to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));

drop policy if exists "Users can read own meals" on public.meals;
drop policy if exists "Users can insert own meals" on public.meals;
drop policy if exists "Users can update own meals" on public.meals;
drop policy if exists "Users can delete own meals" on public.meals;
create policy "Family members view baby meals" on public.meals for select to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members add baby meals" on public.meals for insert to authenticated
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id) and user_id = (select auth.uid()));
create policy "Family members update baby meals" on public.meals for update to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id))
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members delete baby meals" on public.meals for delete to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));

drop policy if exists "Families can view their own food plans" on public.food_plans;
drop policy if exists "Families can add their own food plans" on public.food_plans;
drop policy if exists "Families can update their own food plans" on public.food_plans;
drop policy if exists "Families can delete their own food plans" on public.food_plans;
create policy "Family members view baby plans" on public.food_plans for select to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members add baby plans" on public.food_plans for insert to authenticated
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id) and user_id = (select auth.uid()));
create policy "Family members update baby plans" on public.food_plans for update to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id))
with check (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));
create policy "Family members delete baby plans" on public.food_plans for delete to authenticated
using (private.is_family_member(family_id) and private.baby_belongs_to_family(baby_id, family_id));

create or replace function private.create_family_impl(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_family uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'family_name_required'; end if;
  insert into public.profiles(id,display_name)
  values(v_user, coalesce((select split_part(email,'@',1) from auth.users where id=v_user),'家人'))
  on conflict(id) do nothing;
  insert into public.families(name,owner_id) values(trim(p_name),v_user) returning id into v_family;
  insert into public.family_members(family_id,user_id,role) values(v_family,v_user,'owner');
  insert into public.user_preferences(user_id,active_family_id)
  values(v_user,v_family) on conflict(user_id) do update set active_family_id=excluded.active_family_id,active_baby_id=null,updated_at=now();
  return v_family;
end;
$$;

create or replace function public.create_family(p_name text)
returns uuid language sql security invoker set search_path = '' as $$ select private.create_family_impl(p_name); $$;

create or replace function private.accept_invitation_impl(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_email text; v_inv public.family_invitations%rowtype;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select lower(email) into v_email from auth.users where id=v_user;
  select * into v_inv from public.family_invitations where token=p_token for update;
  if v_inv.id is null then raise exception 'invitation_invalid'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_inv.expires_at <= now() then
    update public.family_invitations set status='expired' where id=v_inv.id;
    raise exception 'invitation_expired';
  end if;
  if lower(v_inv.invited_email) <> v_email then raise exception 'invitation_email_mismatch'; end if;
  insert into public.family_members(family_id,user_id,role) values(v_inv.family_id,v_user,'member')
  on conflict(family_id,user_id) do nothing;
  update public.family_invitations set status='accepted',accepted_at=now() where id=v_inv.id;
  insert into public.user_preferences(user_id,active_family_id,active_baby_id)
  values(v_user,v_inv.family_id,(select id from public.babies where family_id=v_inv.family_id order by display_order,created_at limit 1))
  on conflict(user_id) do update set active_family_id=excluded.active_family_id,active_baby_id=excluded.active_baby_id,updated_at=now();
  return v_inv.family_id;
end;
$$;

create or replace function public.accept_family_invitation(p_token text)
returns uuid language sql security invoker set search_path = '' as $$ select private.accept_invitation_impl(p_token); $$;

create or replace function private.leave_family_impl(p_family_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.family_role(p_family_id) = 'owner' then raise exception 'owner_must_transfer_or_delete'; end if;
  delete from public.family_members where family_id=p_family_id and user_id=auth.uid();
  update public.user_preferences set active_family_id=null,active_baby_id=null,updated_at=now()
  where user_id=auth.uid() and active_family_id=p_family_id;
end;
$$;
create or replace function public.leave_family(p_family_id uuid)
returns void language sql security invoker set search_path = '' as $$ select private.leave_family_impl(p_family_id); $$;

create or replace function private.transfer_family_impl(p_family_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old_owner uuid := auth.uid();
begin
  if private.family_role(p_family_id) <> 'owner' then raise exception 'owner_required'; end if;
  if not private.is_family_member(p_family_id,p_new_owner) then raise exception 'new_owner_must_be_member'; end if;
  update public.families set owner_id=p_new_owner,updated_at=now() where id=p_family_id;
  update public.family_members set role='admin' where family_id=p_family_id and user_id=v_old_owner;
  update public.family_members set role='owner' where family_id=p_family_id and user_id=p_new_owner;
end;
$$;
create or replace function public.transfer_family_ownership(p_family_id uuid,p_new_owner uuid)
returns void language sql security invoker set search_path = '' as $$ select private.transfer_family_impl(p_family_id,p_new_owner); $$;

revoke all on function public.create_family(text), public.accept_family_invitation(text),
  public.leave_family(uuid), public.transfer_family_ownership(uuid,uuid) from public, anon;
grant execute on function public.create_family(text), public.accept_family_invitation(text),
  public.leave_family(uuid), public.transfer_family_ownership(uuid,uuid) to authenticated;
grant execute on function private.create_family_impl(text), private.accept_invitation_impl(text),
  private.leave_family_impl(uuid), private.transfer_family_impl(uuid,uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1),'家人'))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function private.handle_new_user();

revoke all on public.profiles, public.families, public.family_members, public.babies,
  public.family_invitations, public.user_preferences, public.baby_reminders from anon, authenticated;
grant select,insert on public.profiles to authenticated;
grant update(display_name,avatar_url,updated_at) on public.profiles to authenticated;
grant select on public.families to authenticated;
grant update(name,updated_at) on public.families to authenticated;
grant select,delete on public.family_members to authenticated;
grant update(role) on public.family_members to authenticated;
grant select,insert on public.babies to authenticated;
grant update(nickname,birth_date,gender,avatar_path,notes,display_order,updated_at) on public.babies to authenticated;
grant select,insert on public.family_invitations to authenticated;
grant update(status,expires_at) on public.family_invitations to authenticated;
grant select,insert,update on public.user_preferences to authenticated;
grant select,insert,update,delete on public.baby_reminders to authenticated;
grant select,insert,update,delete on public.meals, public.food_plans to authenticated;

create or replace function private.storage_can_read(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; v_first uuid; v_second uuid; v_family uuid;
begin
  parts := storage.foldername(p_name);
  v_first := parts[1]::uuid;
  begin
    v_second := parts[2]::uuid;
    return private.is_family_member(v_first) and private.baby_belongs_to_family(v_second,v_first);
  exception when invalid_text_representation then
    select f.id into v_family from public.families f where f.owner_id=v_first limit 1;
    return v_family is not null and private.is_family_member(v_family);
  end;
exception when others then return false;
end;
$$;

create or replace function private.storage_can_write(p_name text, p_manage_baby boolean default false)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; v_family uuid; v_baby uuid;
begin
  parts := storage.foldername(p_name);
  v_family := parts[1]::uuid;
  v_baby := parts[2]::uuid;
  if not private.baby_belongs_to_family(v_baby,v_family) then return false; end if;
  if p_manage_baby then return private.can_manage_family(v_family); end if;
  return private.is_family_member(v_family);
exception when others then return false;
end;
$$;
revoke all on function private.storage_can_read(text), private.storage_can_write(text,boolean) from public,anon;
grant execute on function private.storage_can_read(text), private.storage_can_write(text,boolean) to authenticated;

drop policy if exists "Users can read own meal photos" on storage.objects;
drop policy if exists "Users can upload own meal photos" on storage.objects;
drop policy if exists "Users can update own meal photos" on storage.objects;
drop policy if exists "Users can delete own meal photos" on storage.objects;
drop policy if exists "Users can read own baby avatar" on storage.objects;
drop policy if exists "Users can upload own baby avatar" on storage.objects;
drop policy if exists "Users can update own baby avatar" on storage.objects;
drop policy if exists "Users can delete own baby avatar" on storage.objects;
create policy "Family reads meal photos" on storage.objects for select to authenticated
using (bucket_id='meal-photos' and private.storage_can_read(name));
create policy "Family uploads meal photos" on storage.objects for insert to authenticated
with check (bucket_id='meal-photos' and private.storage_can_write(name,false));
create policy "Family updates meal photos" on storage.objects for update to authenticated
using (bucket_id='meal-photos' and private.storage_can_write(name,false))
with check (bucket_id='meal-photos' and private.storage_can_write(name,false));
create policy "Family deletes meal photos" on storage.objects for delete to authenticated
using (bucket_id='meal-photos' and private.storage_can_write(name,false));
create policy "Family reads baby avatars" on storage.objects for select to authenticated
using (bucket_id='baby-avatars' and private.storage_can_read(name));
create policy "Managers upload baby avatars" on storage.objects for insert to authenticated
with check (bucket_id='baby-avatars' and private.storage_can_write(name,true));
create policy "Managers update baby avatars" on storage.objects for update to authenticated
using (bucket_id='baby-avatars' and private.storage_can_write(name,true))
with check (bucket_id='baby-avatars' and private.storage_can_write(name,true));
create policy "Managers delete baby avatars" on storage.objects for delete to authenticated
using (bucket_id='baby-avatars' and private.storage_can_write(name,true));

commit;

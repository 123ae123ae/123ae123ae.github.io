alter table public.family_members
  add column if not exists relationship text;

alter table public.family_members
  drop constraint if exists family_members_relationship_check;
alter table public.family_members
  add constraint family_members_relationship_check
  check (relationship is null or char_length(trim(relationship)) between 1 and 40);

update public.family_members fm
set relationship = coalesce(
  nullif(trim(u.raw_user_meta_data->>'relationship'), ''),
  case when fm.role = 'owner' then '爸爸/妈妈' else '家庭成员' end
)
from auth.users u
where u.id = fm.user_id and fm.relationship is null;

drop policy if exists "Members update own relationship" on public.family_members;
create policy "Members update own relationship" on public.family_members
for update to authenticated
using (user_id = (select auth.uid()) and private.is_family_member(family_id))
with check (user_id = (select auth.uid()) and private.is_family_member(family_id));

grant update(relationship) on public.family_members to authenticated;

drop function if exists public.list_family_members(uuid);
drop function if exists private.list_family_members_impl(uuid);

create function private.list_family_members_impl(p_family_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, email text, role text, relationship text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_family_member(p_family_id) then raise exception 'permission_denied'; end if;
  return query
  select fm.user_id, p.display_name::text, p.avatar_url::text, u.email::text,
    fm.role::text, fm.relationship::text, fm.joined_at
  from public.family_members fm
  join auth.users u on u.id = fm.user_id
  left join public.profiles p on p.id = fm.user_id
  where fm.family_id = p_family_id
  order by case fm.role when 'owner' then 0 when 'admin' then 1 else 2 end, fm.joined_at;
end;
$$;

create function public.list_family_members(p_family_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, email text, role text, relationship text, joined_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.list_family_members_impl(p_family_id);
$$;

create or replace function private.accept_invitation_with_profile_impl(
  p_token text,
  p_display_name text,
  p_relationship text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_family uuid; v_user uuid := auth.uid(); v_name text := trim(p_display_name); v_relationship text := trim(p_relationship);
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if nullif(v_name, '') is null or char_length(v_name) > 60 then raise exception 'display_name_required'; end if;
  if nullif(v_relationship, '') is null or char_length(v_relationship) > 40 then raise exception 'relationship_required'; end if;
  v_family := private.accept_invitation_impl(p_token);
  insert into public.profiles(id, display_name, updated_at)
  values(v_user, v_name, now())
  on conflict(id) do update set display_name = excluded.display_name, updated_at = now();
  update public.family_members
  set relationship = v_relationship
  where family_id = v_family and user_id = v_user;
  return v_family;
end;
$$;

create or replace function public.accept_family_invitation(
  p_token text,
  p_display_name text,
  p_relationship text
)
returns uuid language sql security invoker set search_path = '' as $$
  select private.accept_invitation_with_profile_impl(p_token, p_display_name, p_relationship);
$$;

revoke all on function private.list_family_members_impl(uuid),
  private.accept_invitation_with_profile_impl(text,text,text),
  public.list_family_members(uuid),
  public.accept_family_invitation(text,text,text)
from public, anon;

grant execute on function private.list_family_members_impl(uuid),
  private.accept_invitation_with_profile_impl(text,text,text),
  public.list_family_members(uuid),
  public.accept_family_invitation(text,text,text)
to authenticated;

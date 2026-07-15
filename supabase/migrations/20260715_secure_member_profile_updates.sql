drop policy if exists "Members update own relationship" on public.family_members;
revoke update(relationship) on public.family_members from authenticated;

create or replace function private.update_my_family_profile_impl(
  p_family_id uuid,
  p_display_name text,
  p_relationship text
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_name text := trim(p_display_name); v_relationship text := trim(p_relationship);
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if not private.is_family_member(p_family_id, v_user) then raise exception 'permission_denied'; end if;
  if nullif(v_name, '') is null or char_length(v_name) > 60 then raise exception 'display_name_required'; end if;
  if nullif(v_relationship, '') is null or char_length(v_relationship) > 40 then raise exception 'relationship_required'; end if;

  insert into public.profiles(id, display_name, updated_at)
  values(v_user, v_name, now())
  on conflict(id) do update set display_name = excluded.display_name, updated_at = now();

  update public.family_members
  set relationship = v_relationship
  where family_id = p_family_id and user_id = v_user;
end;
$$;

create or replace function public.update_my_family_profile(
  p_family_id uuid,
  p_display_name text,
  p_relationship text
)
returns void language sql security invoker set search_path = '' as $$
  select private.update_my_family_profile_impl(p_family_id, p_display_name, p_relationship);
$$;

revoke all on function private.update_my_family_profile_impl(uuid,text,text),
  public.update_my_family_profile(uuid,text,text)
from public, anon;

grant execute on function private.update_my_family_profile_impl(uuid,text,text),
  public.update_my_family_profile(uuid,text,text)
to authenticated;

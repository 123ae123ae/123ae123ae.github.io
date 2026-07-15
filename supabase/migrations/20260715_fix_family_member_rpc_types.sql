create or replace function private.list_family_members_impl(p_family_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, email text, role text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_family_member(p_family_id) then raise exception 'permission_denied'; end if;
  return query
  select fm.user_id, p.display_name::text, p.avatar_url::text, u.email::text, fm.role::text, fm.joined_at
  from public.family_members fm
  join auth.users u on u.id=fm.user_id
  left join public.profiles p on p.id=fm.user_id
  where fm.family_id=p_family_id
  order by case fm.role when 'owner' then 0 when 'admin' then 1 else 2 end, fm.joined_at;
end;
$$;

revoke all on function private.list_family_members_impl(uuid) from public, anon;
grant execute on function private.list_family_members_impl(uuid) to authenticated;

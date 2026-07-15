create or replace function private.create_family_invitation_impl(p_family_id uuid, p_email text)
returns table(id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
  v_token text;
  v_expires timestamptz;
begin
  if not private.can_manage_family(p_family_id) then raise exception 'permission_denied'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;

  if exists (
    select 1
    from public.family_members fm
    join auth.users u on u.id = fm.user_id
    where fm.family_id = p_family_id and lower(u.email) = v_email
  ) then raise exception 'already_family_member'; end if;

  if exists (
    select 1
    from public.family_invitations fi
    where fi.family_id = p_family_id
      and lower(fi.invited_email) = v_email
      and fi.status = 'pending'
      and fi.expires_at > now()
  ) then raise exception 'invitation_exists'; end if;

  update public.family_invitations as fi
  set status = 'expired'
  where fi.family_id = p_family_id
    and lower(fi.invited_email) = v_email
    and fi.status = 'pending'
    and fi.expires_at <= now();

  insert into public.family_invitations(family_id, invited_email, invited_by)
  values(p_family_id, v_email, auth.uid())
  returning family_invitations.id, family_invitations.token, family_invitations.expires_at
  into v_id, v_token, v_expires;

  return query select v_id, v_token, v_expires;
end;
$$;

revoke all on function private.create_family_invitation_impl(uuid,text) from public, anon;
grant execute on function private.create_family_invitation_impl(uuid,text) to authenticated;

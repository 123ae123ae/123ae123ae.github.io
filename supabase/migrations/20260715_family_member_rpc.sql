begin;

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

create or replace function public.list_family_members(p_family_id uuid)
returns table(user_id uuid, display_name text, avatar_url text, email text, role text, joined_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.list_family_members_impl(p_family_id);
$$;

create or replace function private.create_family_invitation_impl(p_family_id uuid,p_email text)
returns table(id uuid,token text,expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_email text:=lower(trim(p_email)); v_id uuid; v_token text; v_expires timestamptz;
begin
  if not private.can_manage_family(p_family_id) then raise exception 'permission_denied'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid_email'; end if;
  if exists (
    select 1 from public.family_members fm join auth.users u on u.id=fm.user_id
    where fm.family_id=p_family_id and lower(u.email)=v_email
  ) then raise exception 'already_family_member'; end if;
  if exists (
    select 1 from public.family_invitations fi
    where fi.family_id=p_family_id and lower(fi.invited_email)=v_email and fi.status='pending' and fi.expires_at>now()
  ) then raise exception 'invitation_exists'; end if;
  update public.family_invitations set status='expired'
  where family_id=p_family_id and lower(invited_email)=v_email and status='pending' and expires_at<=now();
  insert into public.family_invitations(family_id,invited_email,invited_by)
  values(p_family_id,v_email,auth.uid()) returning family_invitations.id,family_invitations.token,family_invitations.expires_at into v_id,v_token,v_expires;
  return query select v_id,v_token,v_expires;
end;
$$;

create or replace function public.create_family_invitation(p_family_id uuid,p_email text)
returns table(id uuid,token text,expires_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.create_family_invitation_impl(p_family_id,p_email);
$$;

revoke all on function private.list_family_members_impl(uuid), private.create_family_invitation_impl(uuid,text),
  public.list_family_members(uuid), public.create_family_invitation(uuid,text) from public,anon;
grant execute on function private.list_family_members_impl(uuid), private.create_family_invitation_impl(uuid,text),
  public.list_family_members(uuid), public.create_family_invitation(uuid,text) to authenticated;

commit;

-- One-time, human-readable family invite codes that survive signup/email confirmation.

alter table public.family_invitations
  alter column invited_email drop not null,
  add column if not exists invite_code text;

update public.family_invitations
set invite_code = upper(substr(md5(id::text || token), 1, 12))
where invite_code is null;

alter table public.family_invitations
  alter column invite_code set not null;

alter table public.family_invitations
  drop constraint if exists family_invitations_invite_code_format;
alter table public.family_invitations
  add constraint family_invitations_invite_code_format
  check (invite_code ~ '^[0-9A-F]{12}$');

create unique index if not exists family_invitations_invite_code_key
  on public.family_invitations(invite_code);

create or replace function private.create_family_invite_code_impl(p_family_id uuid)
returns table(id uuid, invite_code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_expires timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.can_manage_family(p_family_id) then raise exception 'permission_denied'; end if;

  -- Only the newest general-purpose code remains usable, avoiding code confusion.
  update public.family_invitations
  set status = 'cancelled'
  where family_id = p_family_id
    and invited_email is null
    and status = 'pending';

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
    exit when not exists (
      select 1 from public.family_invitations fi where fi.invite_code = v_code
    );
  end loop;

  insert into public.family_invitations(
    family_id, invited_email, invited_by, invite_code
  ) values (
    p_family_id, null, auth.uid(), v_code
  )
  returning family_invitations.id, family_invitations.invite_code, family_invitations.expires_at
  into v_id, v_code, v_expires;

  return query select v_id, v_code, v_expires;
end;
$$;

create or replace function public.create_family_invite_code(p_family_id uuid)
returns table(id uuid, invite_code text, expires_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_family_invite_code_impl(p_family_id);
$$;

create or replace function private.accept_family_invite_code_impl(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g'));
  v_inv public.family_invitations%rowtype;
  v_relationship text;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if char_length(v_code) <> 12 then raise exception 'invitation_code_invalid'; end if;

  select lower(u.email), coalesce(nullif(trim(u.raw_user_meta_data->>'relationship'), ''), '家庭成员')
  into v_email, v_relationship
  from auth.users u
  where u.id = v_user;

  select * into v_inv
  from public.family_invitations
  where invite_code = v_code
  for update;

  if v_inv.id is null then raise exception 'invitation_code_invalid'; end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending'; end if;
  if v_inv.expires_at <= now() then
    update public.family_invitations set status = 'expired' where id = v_inv.id;
    raise exception 'invitation_expired';
  end if;
  if v_inv.invited_email is not null and lower(v_inv.invited_email) <> v_email then
    raise exception 'invitation_email_mismatch';
  end if;
  if exists (
    select 1 from public.family_members fm
    where fm.family_id = v_inv.family_id and fm.user_id = v_user
  ) then raise exception 'already_family_member'; end if;

  insert into public.family_members(family_id, user_id, role, relationship)
  values(v_inv.family_id, v_user, 'member', v_relationship);

  update public.family_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;

  insert into public.user_preferences(user_id, active_family_id, active_baby_id)
  values(
    v_user,
    v_inv.family_id,
    (select b.id from public.babies b where b.family_id = v_inv.family_id order by b.display_order, b.created_at limit 1)
  )
  on conflict(user_id) do update set
    active_family_id = excluded.active_family_id,
    active_baby_id = excluded.active_baby_id,
    updated_at = now();

  return v_inv.family_id;
end;
$$;

create or replace function public.accept_family_invite_code(p_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.accept_family_invite_code_impl(p_code);
$$;

revoke all on function private.create_family_invite_code_impl(uuid),
  private.accept_family_invite_code_impl(text),
  public.create_family_invite_code(uuid),
  public.accept_family_invite_code(text)
from public, anon;

grant execute on function private.create_family_invite_code_impl(uuid),
  private.accept_family_invite_code_impl(text),
  public.create_family_invite_code(uuid),
  public.accept_family_invite_code(text)
to authenticated;


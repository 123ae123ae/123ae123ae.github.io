-- Privacy policy v2026-07-15: versioned consent evidence and retention helpers.

alter table public.profiles
  add column if not exists privacy_policy_version text,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists health_data_consent_at timestamptz,
  add column if not exists health_data_consent_withdrawn_at timestamptz;

comment on column public.profiles.privacy_policy_version is
  'Version of the privacy notice accepted by the user.';
comment on column public.profiles.privacy_accepted_at is
  'Server timestamp at which the current privacy notice was accepted.';
comment on column public.profiles.health_data_consent_at is
  'Server timestamp of explicit parent/legal-guardian consent for processing baby health-related observations.';
comment on column public.profiles.health_data_consent_withdrawn_at is
  'Server timestamp at which health-data consent was withdrawn, if applicable.';

create table if not exists private.privacy_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_version text not null,
  privacy_accepted boolean not null,
  health_data_consent boolean not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'signup'
);

alter table private.privacy_consent_events enable row level security;
revoke all on table private.privacy_consent_events from public, anon, authenticated;
revoke all on sequence private.privacy_consent_events_id_seq from public, anon, authenticated;
grant select, insert, delete on table private.privacy_consent_events to service_role;
grant usage, select on sequence private.privacy_consent_events_id_seq to service_role;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_privacy_accepted boolean := lower(coalesce(new.raw_user_meta_data->>'privacy_accepted', 'false')) in ('true','1','yes');
  v_health_consent boolean := lower(coalesce(new.raw_user_meta_data->>'health_data_consent', 'false')) in ('true','1','yes');
  v_policy_version text := left(nullif(new.raw_user_meta_data->>'privacy_policy_version', ''), 40);
  v_accepted_at timestamptz := now();
begin
  insert into public.profiles(
    id,
    display_name,
    privacy_policy_version,
    privacy_accepted_at,
    health_data_consent_at
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1), '家人'),
    case when v_privacy_accepted then v_policy_version end,
    case when v_privacy_accepted then v_accepted_at end,
    case when v_health_consent then v_accepted_at end
  )
  on conflict(id) do update set
    display_name = excluded.display_name,
    privacy_policy_version = coalesce(excluded.privacy_policy_version, public.profiles.privacy_policy_version),
    privacy_accepted_at = coalesce(excluded.privacy_accepted_at, public.profiles.privacy_accepted_at),
    health_data_consent_at = coalesce(excluded.health_data_consent_at, public.profiles.health_data_consent_at),
    updated_at = now();

  if v_privacy_accepted and v_policy_version is not null then
    insert into private.privacy_consent_events(
      user_id, policy_version, privacy_accepted, health_data_consent, accepted_at, source
    ) values (
      new.id, v_policy_version, true, v_health_consent, v_accepted_at, 'signup'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

-- Run from a trusted maintenance connection. The app roles cannot execute it.
create or replace function private.cleanup_expired_family_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.family_invitations
  where (
    status in ('accepted', 'cancelled')
    and coalesce(accepted_at, expires_at, created_at) < now() - interval '30 days'
  ) or (
    status = 'pending'
    and expires_at < now() - interval '30 days'
  );
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function private.cleanup_expired_family_invitations() from public, anon, authenticated;
grant execute on function private.cleanup_expired_family_invitations() to service_role;


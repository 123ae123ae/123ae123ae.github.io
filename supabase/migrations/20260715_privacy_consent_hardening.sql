-- Keep consent evidence private while satisfying defense-in-depth checks.

create index if not exists privacy_consent_events_user_idx
  on private.privacy_consent_events(user_id);

drop policy if exists "Authenticated clients cannot access consent events"
  on private.privacy_consent_events;
create policy "Authenticated clients cannot access consent events"
  on private.privacy_consent_events
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);


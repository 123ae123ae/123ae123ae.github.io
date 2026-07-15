-- Least-privilege table grants. RLS controls rows; grants control allowed operations.

revoke all privileges on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

revoke all privileges on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;

revoke all privileges on table public.families from authenticated;
grant select, update on table public.families to authenticated;

revoke all privileges on table public.family_members from authenticated;
grant select, update, delete on table public.family_members to authenticated;

revoke all privileges on table public.family_invitations from authenticated;
grant select, insert, update on table public.family_invitations to authenticated;

revoke all privileges on table public.babies from authenticated;
grant select, insert, update, delete on table public.babies to authenticated;

revoke all privileges on table public.meals from authenticated;
grant select, insert, update, delete on table public.meals to authenticated;

revoke all privileges on table public.food_plans from authenticated;
grant select, insert, update, delete on table public.food_plans to authenticated;

revoke all privileges on table public.baby_foods from authenticated;
grant select, insert, update, delete on table public.baby_foods to authenticated;

revoke all privileges on table public.baby_reminders from authenticated;
grant select, insert, update, delete on table public.baby_reminders to authenticated;

revoke all privileges on table public.user_preferences from authenticated;
grant select, insert, update on table public.user_preferences to authenticated;

-- Legacy table retained during the migration window; it remains user_id-scoped by RLS.
revoke all privileges on table public.baby_profiles from authenticated;
grant select, insert, update, delete on table public.baby_profiles to authenticated;


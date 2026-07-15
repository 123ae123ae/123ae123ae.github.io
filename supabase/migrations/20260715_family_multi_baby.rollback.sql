-- Emergency rollback for the 2026-07-15 family/multi-baby release.
-- Maintenance window only: stop application writes and verify the backup counts first.
begin;

lock table public.meals, public.food_plans, public.baby_profiles in access exclusive mode;

drop trigger if exists meals_fill_baby_scope on public.meals;
drop trigger if exists food_plans_fill_baby_scope on public.food_plans;
drop trigger if exists on_auth_user_created_profile on auth.users;

truncate public.meals, public.food_plans, public.baby_profiles;
insert into public.meals (id,user_id,food,amount_grams,eaten_at,reaction,note,emoji,created_at,food_source,remarks,photo_path,foods)
select id,user_id,food,amount_grams,eaten_at,reaction,note,emoji,created_at,food_source,remarks,photo_path,foods from migration_backup_20260715.meals;
insert into public.food_plans (id,user_id,food,amount,created_at)
select id,user_id,food,amount,created_at from migration_backup_20260715.food_plans;
insert into public.baby_profiles (user_id,baby_name,avatar_path,updated_at,birth_date)
select user_id,baby_name,avatar_path,updated_at,birth_date from migration_backup_20260715.baby_profiles;

drop policy if exists "Family members view baby meals" on public.meals;
drop policy if exists "Family members add baby meals" on public.meals;
drop policy if exists "Family members update baby meals" on public.meals;
drop policy if exists "Family members delete baby meals" on public.meals;
drop policy if exists "Family members view baby plans" on public.food_plans;
drop policy if exists "Family members add baby plans" on public.food_plans;
drop policy if exists "Family members update baby plans" on public.food_plans;
drop policy if exists "Family members delete baby plans" on public.food_plans;

alter table public.meals drop constraint if exists meals_family_id_fkey;
alter table public.meals drop constraint if exists meals_baby_id_fkey;
alter table public.meals drop column if exists family_id;
alter table public.meals drop column if exists baby_id;
alter table public.meals drop constraint if exists meals_user_id_fkey;
alter table public.meals alter column user_id set not null;
alter table public.meals add constraint meals_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.food_plans drop constraint if exists food_plans_family_id_fkey;
alter table public.food_plans drop constraint if exists food_plans_baby_id_fkey;
alter table public.food_plans drop constraint if exists food_plans_baby_food_key;
alter table public.food_plans drop column if exists family_id;
alter table public.food_plans drop column if exists baby_id;
alter table public.food_plans drop constraint if exists food_plans_user_id_fkey;
alter table public.food_plans alter column user_id set not null;
alter table public.food_plans add constraint food_plans_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.food_plans add constraint food_plans_user_id_food_key unique (user_id,food);

create policy "Users can read own meals" on public.meals for select to authenticated using (user_id = (select auth.uid()));
create policy "Users can insert own meals" on public.meals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users can update own meals" on public.meals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users can delete own meals" on public.meals for delete to authenticated using (user_id = (select auth.uid()));
create policy "Families can view their own food plans" on public.food_plans for select to authenticated using (user_id = (select auth.uid()));
create policy "Families can add their own food plans" on public.food_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Families can update their own food plans" on public.food_plans for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Families can delete their own food plans" on public.food_plans for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Family reads meal photos" on storage.objects;
drop policy if exists "Family uploads meal photos" on storage.objects;
drop policy if exists "Family updates meal photos" on storage.objects;
drop policy if exists "Family deletes meal photos" on storage.objects;
drop policy if exists "Family reads baby avatars" on storage.objects;
drop policy if exists "Managers upload baby avatars" on storage.objects;
drop policy if exists "Managers update baby avatars" on storage.objects;
drop policy if exists "Managers delete baby avatars" on storage.objects;
create policy "Users can read own meal photos" on storage.objects for select to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can upload own meal photos" on storage.objects for insert to authenticated with check (bucket_id='meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can update own meal photos" on storage.objects for update to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id='meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can delete own meal photos" on storage.objects for delete to authenticated using (bucket_id='meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can read own baby avatar" on storage.objects for select to authenticated using (bucket_id='baby-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can upload own baby avatar" on storage.objects for insert to authenticated with check (bucket_id='baby-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can update own baby avatar" on storage.objects for update to authenticated using (bucket_id='baby-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id='baby-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users can delete own baby avatar" on storage.objects for delete to authenticated using (bucket_id='baby-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop table if exists public.baby_foods cascade;
drop table if exists public.baby_reminders cascade;
drop table if exists public.user_preferences cascade;
drop table if exists public.family_invitations cascade;
drop table if exists public.babies cascade;
drop table if exists public.family_members cascade;
drop table if exists public.families cascade;
drop table if exists public.profiles cascade;
drop schema if exists private cascade;

commit;

-- After COMMIT: deploy the previous frontend, then compare row and Storage object counts.

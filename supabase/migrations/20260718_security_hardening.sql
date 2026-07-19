-- Security hardening 2026-07-18（对应发布前审计的 4+1 个阻断项）
-- 1) 恢复被 least_privilege_grants.sql 覆盖掉的列级 UPDATE 权限：
--    · 防止 admin 直接改写 families.owner_id（所有权转让只能走 transfer_family_ownership RPC）
--    · 防止用户改写 profiles 中由服务端写入的隐私同意证据字段
-- 2) user_preferences.locale 允许保存「跟随系统」(system)
-- 3) 修复旧版两段式头像路径：parts[2] 缺失时得到 NULL 不会抛
--    invalid_text_representation，旧路径兼容分支永远走不到 → 读取 400
-- 4) meals.client_key：客户端幂等键，弱网重试不再产生重复餐食
-- 5) pg_cron 定时清理过期邀请（兑现隐私政策 30 天保留承诺）

-- 1. families：API 只能改名称；owner_id 仅 security definer RPC 可写
revoke update on table public.families from authenticated;
grant update(name, updated_at) on table public.families to authenticated;

-- profiles：隐私同意字段只允许服务端（handle_new_user 触发器）写入
revoke update on table public.profiles from authenticated;
grant update(display_name, avatar_url, updated_at) on table public.profiles to authenticated;

-- 2. locale 约束加入 'system'
alter table public.user_preferences drop constraint if exists user_preferences_locale_check;
alter table public.user_preferences
  add constraint user_preferences_locale_check check (locale in ('zh-CN','fr','en','ug','system'));

-- 3. 存储读取：兼容旧版 {user_id}/avatar.webp 两段路径
create or replace function private.storage_can_read(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[]; v_first uuid; v_second uuid; v_family uuid;
begin
  parts := storage.foldername(p_name);
  v_first := parts[1]::uuid;
  if coalesce(array_length(parts, 1), 0) >= 2 then
    begin
      v_second := parts[2]::uuid;
      if v_second is not null then
        return private.is_family_member(v_first) and private.baby_belongs_to_family(v_second, v_first);
      end if;
    exception when invalid_text_representation then
      v_second := null; -- 第二段不是 UUID，按旧路径处理
    end;
  end if;
  -- 旧路径：第一段是用户 id，读取权按该用户拥有的家庭判断
  select f.id into v_family from public.families f where f.owner_id = v_first limit 1;
  return v_family is not null and private.is_family_member(v_family);
exception when others then return false;
end;
$$;

-- 4. meals.client_key：幂等插入键（唯一约束允许多个 NULL，存量数据不受影响）
alter table public.meals add column if not exists client_key text;
do $$ begin
  alter table public.meals add constraint meals_client_key_unique unique (client_key);
exception when duplicate_table then null; when duplicate_object then null; end $$;

-- 5. 过期邀请定时清理（每天 03:23 UTC）
do $$ begin
  create extension if not exists pg_cron;
exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end $$;
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and not exists (select 1 from cron.job where jobname = 'cleanup-expired-family-invitations') then
    perform cron.schedule(
      'cleanup-expired-family-invitations',
      '23 3 * * *',
      $cron$select private.cleanup_expired_family_invitations()$cron$
    );
  end if;
end $$;

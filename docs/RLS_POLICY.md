# Supabase RLS 权限说明

版本：2026-07-15  
项目：`vqxzrydqnlpxyjafjdoh`

本文记录生产数据库的实际权限模型。核心原则是：表级 `GRANT` 决定允许执行哪类操作，Row Level Security（RLS）决定用户能操作哪些行。两者必须同时通过。

## 1. 身份和信任边界

- `anon`：未登录请求。业务表没有表级权限，也没有 RLS 访问路径。
- `authenticated`：Supabase Auth 已登录用户。仅获得每张表实际需要的操作权限，并且每次读写继续受 RLS 限制。
- `service_role`：只允许后端 Edge Function 或可信维护连接使用，可绕过 RLS。不得放入前端、GitHub Pages、日志或截图。
- 浏览器只使用 `sb_publishable_...` key；它不是管理密钥，最终权限由用户 JWT、表级授权和 RLS 共同决定。

## 2. 权限辅助函数

辅助函数位于不暴露给 Data API 的 `private` schema，使用固定空 `search_path`。`SECURITY DEFINER` 函数默认撤销 `PUBLIC/anon` 执行权，只按需要授予 `authenticated`。

| 函数 | 作用 |
| --- | --- |
| `private.is_family_member(family_id, user_id := auth.uid())` | 判断当前用户是否是家庭成员 |
| `private.family_role(family_id, user_id := auth.uid())` | 返回 `owner/admin/member` |
| `private.can_manage_family(family_id, user_id := auth.uid())` | 仅 owner/admin 为真 |
| `private.baby_belongs_to_family(baby_id, family_id)` | 验证宝宝和家庭的服务端归属 |
| `private.users_share_family(other_user)` | 两人至少共享一个家庭时为真 |
| `private.current_email()` | 从 `auth.users` 读取当前登录邮箱，供邀请校验；不信任用户可编辑 metadata |
| `private.storage_can_read(path)` | 从文件路径解析 family/baby，并验证家庭成员身份 |
| `private.storage_can_write(path, manage_baby)` | 餐食照片允许家庭成员；宝宝头像要求 owner/admin |

授权决策不使用 `raw_user_meta_data`。注册 metadata 只作为显示名称和同意事实的输入，不决定 owner/admin/member 权限。

## 3. 业务表矩阵

### `profiles`

- SELECT：本人或与本人共享家庭的成员资料。
- INSERT：只能创建 `id = auth.uid()` 的本人资料。
- UPDATE：只能修改本人资料，且更新后仍必须是本人行。
- DELETE：前端不授予；账户删除由受保护的服务端流程执行。
- 隐私同意字段与显示资料位于同一本人行；家庭成员可看到显示名称/头像，但应用的成员 RPC 不返回同意时间。

### `families`

- SELECT：家庭成员可见。
- UPDATE：owner/admin 可修改，更新前后都必须保持管理权限。
- INSERT/DELETE：前端不直接授权；创建、删除通过受保护 RPC/Edge Function 完成。

### `family_members`

- SELECT：家庭成员可查看同一家庭成员列表。
- UPDATE：仅 owner 能修改非 owner 成员，目标角色只能是 `admin` 或 `member`。
- DELETE：成员可退出自己；owner/admin 可移除非 owner；owner 不能通过普通 DELETE 把自己移除。
- INSERT：前端无直接授权；接受邀请的私有实现负责插入。

### `family_invitations`

- SELECT：owner/admin 或被邀请邮箱与当前 Auth 邮箱一致的用户。
- INSERT：owner/admin，且 `invited_by = auth.uid()`。
- UPDATE：owner/admin 用于取消邀请。
- 接受邀请：通过公开的 invoker RPC 调用私有实现；服务端再次核对 token、邮箱、状态和到期时间。
- 通用家庭邀请码：`create_family_invite_code` 仅允许 owner/admin 生成；编码为 12 位随机十六进制、一次使用、7 天有效。新码生成时，旧的未使用通用码自动取消。
- 输入邀请码：`accept_family_invite_code` 只允许已登录用户调用；私有实现规范化编码、锁定邀请行、检查状态和期限，再服务端写入 `family_members` 与 `user_preferences`。通用码不依赖注册跳转参数；旧的邮箱邀请仍继续校验邮箱。
- 邀请默认 7 天失效；到期/完成后最多再保留 30 天。

### `babies`

- SELECT：家庭成员。
- INSERT/UPDATE：owner/admin；插入时 `created_by = auth.uid()`。
- DELETE：表级允许 owner/admin，但正式删除流程使用服务端动作，以同时清理关联表和 Storage。
- 相同出生日期不是唯一键，双胞胎不会被合并；身份只由 UUID `baby_id` 决定。

### `meals`

- 所有 SELECT/INSERT/UPDATE/DELETE 都同时要求：当前用户属于 `family_id`，且 `baby_id` 确实属于该家庭。
- INSERT 额外要求 `user_id = auth.uid()`。
- 食物数组、分量、反应、备注、来源和照片路径都属于该 meal 行；不会先返回家庭全部宝宝再由前端过滤。

### `food_plans`

- CRUD 均同时校验家庭成员和 `baby_id ↔ family_id` 归属。
- INSERT 额外要求 `user_id = auth.uid()`。

### `baby_foods`

- SELECT/INSERT/UPDATE：家庭成员，并验证 `baby_id ↔ family_id`。
- DELETE：owner/admin，并验证宝宝归属。
- 自定义食物、隐藏/编辑设置保存在该宝宝独立的 `settings` 中。

### `baby_reminders`

- CRUD 均要求家庭成员和宝宝归属。
- INSERT 额外要求 `created_by = auth.uid()`。

### `user_preferences`

- SELECT/INSERT/UPDATE：只能访问 `user_id = auth.uid()` 的本人行。
- `active_family_id` 必须为空或属于本人；`active_baby_id` 必须为空或属于该 active family。
- 这保证重新登录后恢复的宝宝不会指向另一个家庭。

### `baby_profiles`（迁移期旧表）

- 仅本人 `user_id = auth.uid()` 可读写。
- 新的家庭/多宝宝功能不再把它作为权限或数据主来源。
- 迁移验证结束后应另行制定移除旧表的迁移，不与 30 天快照 schema 混淆。

## 4. Storage RLS

两个 bucket 均为私有路径模型，文件路径为 `family_id/baby_id/...`。

| Bucket | SELECT | INSERT/UPDATE/DELETE |
| --- | --- | --- |
| `meal-photos` | 同一家庭成员且 baby 属于该家庭 | 同一家庭成员且 baby 属于该家庭 |
| `baby-avatars` | 同一家庭成员且 baby 属于该家庭 | owner/admin 且 baby 属于该家庭 |

上传覆盖（upsert）需要 SELECT、INSERT 和 UPDATE 三项策略，当前三项均存在。删除宝宝/家庭时，Storage 清理由携带服务端密钥的 Edge Function 完成。

## 5. RPC 与服务端动作

公开 RPC 是 `SECURITY INVOKER` 的薄包装，实际有特权实现位于 `private` schema。公开 RPC 只授予 `authenticated`/`service_role`，不授予 `anon`：

- `create_family`
- `create_family_invitation`
- `create_family_invite_code`
- `accept_family_invitation`（含带个人资料参数的版本）
- `accept_family_invite_code`
- `list_family_members`
- `update_my_family_profile`
- `leave_family`
- `transfer_family_ownership`

删除账户、家庭和宝宝属于跨表/跨 Storage 操作，必须走 `family-account-actions` Edge Function。函数要求有效 JWT，并在服务端核验 family role 和 baby ownership；前端不能直接获得 `service_role`。

## 6. 同意凭证表

`private.privacy_consent_events`：

- 不在 `public` schema，不通过 Data API 暴露。
- RLS 已开启作为纵深防御。
- `anon/authenticated/PUBLIC` 没有表或 sequence 权限。
- Auth 注册触发器在服务端记录政策版本、隐私政策阅读确认和服务器时间。旧版健康数据同意字段仅为数据库兼容保留，新注册不再收集，也不参与任何权限判断。
- 账户删除时通过 `auth.users` 外键 `ON DELETE CASCADE` 删除。

## 7. 迁移快照

`migration_backup_20260715` 不在 Data API 暴露 schema，`anon/authenticated` 无表授权，应用不得访问。它不依赖面向普通用户的 RLS，而依靠 schema 隔离和无授权；最迟在 2026-08-14 按 `DATA_RETENTION.md` 销毁。

## 8. 最小权限修正

迁移 `20260715_least_privilege_grants.sql` 已：

- 撤销 `anon` 对所有 public 业务表的权限。
- 撤销 `authenticated` 的 `TRUNCATE`、`REFERENCES`、`TRIGGER`。
- 逐表重新授予产品实际需要的 SELECT/INSERT/UPDATE/DELETE。

RLS 不保护 `TRUNCATE`，因此这一步不能只靠现有行策略替代。

## 9. 必测负向场景

每次更改 RLS、RPC、Edge Function 或 Storage 路径后至少验证：

1. 未登录用户读取任意业务表返回无权限。
2. 家庭 A 成员无法读取/修改家庭 B 的 family、baby、meal、plan、photo。
3. 把家庭 A 的 `family_id` 与家庭 B 的 `baby_id` 混合写入会失败。
4. member 不能添加、修改或删除宝宝，也不能修改角色。
5. admin 不能转让 owner；owner 不能用普通成员删除逻辑移除自己。
6. 邀请 token 与当前登录邮箱不一致时不能接受。
7. 相同生日的两个宝宝数据保持独立。
8. Storage 路径中的 family/baby 任一不匹配时读写失败。
9. publishable key 中不存在 service role 能力。
10. Supabase security advisor 无新增 RLS/definer 警告。

## 10. 维护规则

- 新建任何 `public` 表：同一 migration 内启用 RLS、写策略、收紧 GRANT、添加负向测试。
- 新增 `SECURITY DEFINER`：必须放 `private`，固定 `search_path`，显式检查 `auth.uid()`，并撤销 `PUBLIC/anon`。
- 不把 `user_metadata` 用于授权。
- UPDATE 策略同时写 `USING` 和 `WITH CHECK`，并保留对应 SELECT 策略。
- 每次生产迁移后运行 Supabase security/performance advisors，并把结果记录在发布说明中。

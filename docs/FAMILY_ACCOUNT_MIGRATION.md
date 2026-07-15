# 家庭账户与多宝宝迁移报告

日期：2026-07-15  
Supabase 项目：`vqxzrydqnlpxyjafjdoh`（eu-west-3）

## 迁移结果

- 原有 `baby_profiles` 1 行、`meals` 11 行、`food_plans` 11 行均已备份并迁移。
- 迁移后所有餐食与计划都有非空且匹配的 `family_id`、`baby_id`。
- 原账号成为默认家庭的 owner，Elnaz 成为该家庭的第一个宝宝。
- 新增独立家长账号、家庭成员角色、邮箱邀请、用户偏好、多宝宝、提醒和宝宝食物设置。
- 餐食照片与宝宝头像的新路径为 `family_id/baby_id/file`；旧用户路径只保留兼容读取。

## 新数据模型

- `profiles`：个人账号资料。
- `families`：家庭及 owner。
- `family_members`：owner / admin / member。
- `family_invitations`：一次性、限邮箱、可过期邀请。
- `babies`：昵称、可选出生日期/性别/头像/备注、显示顺序。
- `user_preferences`：上次家庭、上次宝宝、语言。
- `baby_reminders`：按宝宝隔离的提醒。
- `baby_foods`：按宝宝隔离的食物库自定义设置。
- `meals`、`food_plans`：增加并强制 `family_id` 与 `baby_id`。

静态内置的 107 种食材是应用字典，不属于任何家庭；用户的编辑、隐藏和自定义存入 `baby_foods`。

## 权限与服务端删除

- 所有业务表启用 RLS；查询在数据库中按当前用户的家庭成员身份和宝宝归属过滤。
- owner/admin 可添加和修改宝宝；当前产品选择仅 owner 可永久删除宝宝。
- member 可查看宝宝资料并记录餐食，但不能管理或删除宝宝。
- `family-account-actions` Edge Function 使用登录 JWT 重新验证调用者；service role 仅在服务端使用。
- 删除宝宝/家庭/账号前，服务端先读取数据库中的精确 Storage 清单并删除文件，再级联删除数据库数据。

## 验证

- 迁移前备份：`migration_backup_20260715`。
- 行数验证：1 个家庭、1 个成员、1 个宝宝、11 餐、11 个计划；0 个未分配或跨家庭记录。
- RLS：owner 可见本人家庭数据；伪造外部用户对家庭、宝宝、餐食、计划、食物设置均返回 0，越权插入被拒绝。
- 双胞胎事务测试：相同出生日期的两个宝宝保持不同 ID；A 的 11 餐与 B 的 1 餐完全隔离，事务随后回滚。
- 前端：10/10 多宝宝单元测试通过；Vite 生产构建通过；390×844 浏览器检查无 JavaScript 错误。

## 回滚

1. 停止前端写入并进入维护窗口。
2. 对比 `migration_backup_20260715` 中的行数和 Storage 清单。
3. 审核并执行 `supabase/migrations/20260715_family_multi_baby.rollback.sql`。
4. 部署迁移前前端，核对餐食、计划、资料和 Storage 对象数量。

回滚脚本会显式列出旧列，不使用危险的 `select *`，并恢复旧的按 `user_id` RLS 与 Storage 策略。

## 已知运维事项

- Supabase Security Advisor 仅剩 Auth “Leaked Password Protection Disabled” 警告；正式邀请第二个家长前建议在 Auth 设置启用泄露密码保护。
- 备份 schema 的只读快照表没有主键，这是备份用途，不暴露给 Data API。
- 新索引刚创建时会被 Performance Advisor 标记 unused，需在真实流量后再评估，不能现在删除。

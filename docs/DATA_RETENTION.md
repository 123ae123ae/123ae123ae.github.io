# 数据保存与删除政策

版本：2026-07-15  
适用范围：宝贝食光生产环境（Supabase 项目 `vqxzrydqnlpxyjafjdoh`）、浏览器离线副本和迁移快照。

## 1. 保存期限总表

| 数据类别 | 保存期限 | 到期动作 |
| --- | --- | --- |
| 账户资料、家庭、成员关系 | 账户/家庭有效期间 | 用户删除账户或家庭后，从在线业务库删除；唯一 owner 必须先转让或确认删除家庭 |
| 宝宝资料 | 宝宝存在期间 | owner/admin 删除宝宝时，服务端级联删除该宝宝的记录、计划、提醒和文件，不影响其他宝宝 |
| 餐食、反应、备注、计划、提醒、统计所需数据 | 对应宝宝存在期间 | 删除单条记录、宝宝、家庭或账户时按对应范围删除 |
| 餐食照片与宝宝头像 | 对应记录/宝宝存在期间 | 删除记录、宝宝或家庭时同步清理 Supabase Storage 对象 |
| 待接受家庭邀请 | 7 天 | 到期后不可接受 |
| 已接受、取消、或已过期邀请行 | 状态变化/到期后最多 30 天 | 由可信维护连接执行 `private.cleanup_expired_family_invitations()` |
| 隐私政策与健康数据同意凭证 | 账户有效期间 | 删除账户时通过外键级联删除；如发生争议需另行法律保全，必须记录原因和期限 |
| 设备离线副本和待同步队列 | 直到同步/覆盖、删除账户或清除站点数据 | 账户删除流程清理本机数据；用户也可在浏览器或主屏幕 App 设置中清除 |
| `migration_backup_20260715` | 最长 30 天 | 2026-08-14 核验后销毁整个 schema，不得继续滚动保留 |

## 2. 迁移备份的特别规则

`migration_backup_20260715` 只用于 2026-07-15 家庭与多宝宝迁移的完整性核验。它包含 `auth_users_summary`、`baby_profiles`、`meals`、`food_plans` 和 `storage_objects` 的迁移时快照。

- 不在 Supabase Data API 的公开 schema 中。
- `anon` 和 `authenticated` 没有该 schema 内表的授权。
- 应用代码不得读取它。
- 仅项目管理员可以在迁移核验中使用。
- 最迟销毁日期：2026-08-14。
- 到期前只核对行数、外键归属、照片路径和抽样一致性，不新增业务用途。

到期操作必须由管理员执行，并在执行前再次确认生产业务表和 Storage 正常：

```sql
-- 1. 只读核验：业务表仍有数据，所有 meals/food_plans 都有 family_id 和 baby_id。
select count(*) from public.meals;
select count(*) from public.meals where family_id is null or baby_id is null;
select count(*) from public.food_plans where family_id is null or baby_id is null;

-- 2. 经人工确认后，销毁迁移快照。
drop schema migration_backup_20260715 cascade;
```

第二步不可自动提前执行；执行记录应包含日期、操作者和核验结果。

## 3. 普通数据删除语义

- 删除一餐：删除该餐数据库行和关联餐食照片。
- 删除宝宝：删除该 `baby_id` 的餐食、食物配置、计划、提醒、统计来源数据和 Storage 文件；同一家庭其他宝宝不受影响。
- 删除家庭：删除家庭成员关系、所有宝宝及其全部内容和文件。
- 删除账户：撤销当前用户；若用户是多人家庭 owner，必须先转让所有权；若确认删除仅由该用户拥有的家庭，则同时删除该家庭数据。
- 退出登录不是删除。退出后，设备上的离线副本仍可能保留，以便用户再次登录和同步。

## 4. 托管备份与安全日志

Supabase 平台为灾难恢复和安全运行维护受限的基础设施备份/日志。应用不把这些副本作为日常数据源，也不承诺可从中恢复某一条被用户删除的记录。平台级副本按所购方案和供应商的轮换机制到期。上线前应保存当前 Supabase 数据处理协议和区域配置的审阅记录；如方案或区域改变，必须同步更新三语隐私政策。

## 5. 运维检查

每月执行：

1. 运行 `select private.cleanup_expired_family_invitations();`。
2. 检查是否存在超过期限的临时 schema、导出文件或本地下载。
3. 检查孤立 Storage 对象是否仍对应有效的 `family_id/baby_id`。
4. 运行 Supabase security/performance advisors。
5. 记录检查日期和异常处理结果。


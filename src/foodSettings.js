// 家庭共享食物库设置的逐条合并（防止两台设备整数组互相覆盖丢数据）
// 条目形态：自定义 {name, custom:true, ...}；内置编辑 {baseName, name, custom:false, ...}；
// 隐藏 {hidden:true}；删除墓碑 {deleted:true}；恢复默认墓碑 {reset:true}。均带 updatedAt。
const timeOf = entry => {
  const time = entry?.updatedAt ? Date.parse(entry.updatedAt) : 0;
  return Number.isFinite(time) ? time : 0;
};

export const foodEntryKey = entry =>
  entry?.custom ? `c:${entry.name}` : `b:${entry.baseName || entry.name}`;

// 同名条目取较新的一条；旧数据没有时间戳视为最旧，云端平手时优先
export function mergeFoodSettings(cloud, local) {
  const merged = new Map();
  for (const entry of cloud || []) {
    if (entry?.name || entry?.baseName) merged.set(foodEntryKey(entry), entry);
  }
  for (const entry of local || []) {
    if (!entry?.name && !entry?.baseName) continue;
    const key = foodEntryKey(entry);
    const existing = merged.get(key);
    if (!existing || timeOf(entry) > timeOf(existing)) merged.set(key, entry);
  }
  return [...merged.values()];
}

export const sameSettings = (a, b) => {
  const left = a || [], right = b || [];
  if (left.length !== right.length) return false;
  const signature = list => [...list]
    .map(entry => JSON.stringify(entry))
    .sort()
    .join("|");
  return signature(left) === signature(right);
};

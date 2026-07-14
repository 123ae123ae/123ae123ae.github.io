import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, AlertTriangle, ArrowUp, Baby, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, ImagePlus, Images, Library, LogOut, Mail, Pencil, Plus, RefreshCw, ShieldCheck, Sparkles, Sprout, Trash2, X,
} from "lucide-react";

const supabase = createClient("https://vqxzrydqnlpxyjafjdoh.supabase.co", "sb_publishable_Pn-dEaqu0oWYJ8eK8OgUAg_PPORfQFF");

/* ---------- 存储 ---------- */
const mealsKey = "baby-meals-all-v3";
const pendingKey = "baby-meals-pending-v2";
const legacyCacheKey = "baby-meals-cache-v2";
const planKey = "baby-plan-v1";
const customFoodsKey = "baby-custom-foods-v1";
const avatarKey = "elnaz-avatar-local-v1";
const birthKey = "elnaz-birthdate-v1";

const readLocal = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));

/* ---------- 日期 ---------- */
const dayKeyOf = date => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayKey = () => dayKeyOf(new Date());
const fmtTime = iso => new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDateCN = key => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const week = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
  return `${m}月${d}日 · 星期${week}`;
};
const nowHHMM = () => new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
const isoFor = (dayKey, hhmm) => {
  const [y, m, d] = dayKey.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, h, min).toISOString();
};
const ageParts = birth => {
  const [year, month, day] = birth.split("-").map(Number);
  const now = new Date();
  const today = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  const birthSerial = Date.UTC(year, month - 1, day);
  const todaySerial = Date.UTC(today.year, today.month, today.day);
  if (!year || todaySerial < birthSerial) return { months: 0, days: 0 };

  const anniversaryFor = totalMonths => {
    const targetMonth = month - 1 + totalMonths;
    const targetYear = year + Math.floor(targetMonth / 12);
    const monthIndex = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(targetYear, monthIndex + 1, 0).getDate();
    return { year: targetYear, month: monthIndex, day: Math.min(day, lastDay) };
  };

  let months = (today.year - year) * 12 + today.month - (month - 1);
  let anniversary = anniversaryFor(months);
  let anniversarySerial = Date.UTC(anniversary.year, anniversary.month, anniversary.day);
  if (anniversarySerial > todaySerial) {
    months -= 1;
    anniversary = anniversaryFor(months);
    anniversarySerial = Date.UTC(anniversary.year, anniversary.month, anniversary.day);
  }
  return { months: Math.max(months, 0), days: Math.max(Math.round((todaySerial - anniversarySerial) / 86400000), 0) };
};
const ageMonths = birth => ageParts(birth).months;
const ageLabel = birth => {
  const { months, days } = ageParts(birth);
  return `${months}个月${days}天`;
};

/* ---------- 食物库（数据来自法国辅食添加对照表，见 foodLibrary.js） ---------- */
import { FOOD_LIBRARY, FOOD_CATS } from "./foodLibrary.js";
const stageForMonths = m => m >= 12 ? "12个月+" : m >= 8 ? "8–12个月" : m >= 6 ? "6–8个月" : "4–6个月";
// 翻译修正后的兼容表：保留旧版本里用户已经编辑过的文字和照片。
const LEGACY_BASE_NAMES = {
  南瓜: "红皮南瓜", 大南瓜: "万圣节南瓜", 莙荙菜: "瑞士甜菜（莙荙菜）", 根芹: "块根芹",
  菊苣: "比利时菊苣", 欧防风: "欧洲防风", 芜菁甘蓝: "瑞典芜菁", 菊芋: "菊芋（洋姜）",
  飞碟瓜: "飞碟南瓜", 樱桃萝卜: "小红萝卜", 婆罗门参: "西洋牛蒡（婆罗门参）",
  花菜: "花椰菜", 抱子甘蓝: "球芽甘蓝", 苤蓝: "球茎甘蓝（苤蓝）", 小柑橘: "克莱门氏小柑橘",
  西柚: "葡萄柚（西柚）", 榅桲: "榅桲（欧洲木瓜）", 大黄: "食用大黄", 栗子: "板栗",
  婴儿米粉: "婴儿谷物粉", 小麦面粉: "小麦粉", 白米饭: "白米", 粗麦粉: "粗麦粉、布格麦",
  木薯粉: "木薯淀粉（西米）", 白身鱼: "低脂鱼（白身鱼）", 油性鱼: "高脂鱼（油性鱼）",
  加工肉制品: "熟食肉制品", 奶酪: "巴氏杀菌奶酪", 香草香料: "香草与香料",
};
const aliasesForBase = baseName => Object.entries(LEGACY_BASE_NAMES).filter(([, current]) => current === baseName).map(([legacy]) => legacy);
// 内置食物库 + 用户自定义/编辑过的食物，合并后的结果（App 渲染时刷新）
let mergedLibrary = FOOD_LIBRARY.map(f => ({ ...f, stage: stageForMonths(f.months) }));
const mergeLibrary = customs => {
  const merged = FOOD_LIBRARY.map(f => {
    // 新版用 baseName 识别内置条目，因此中文改名后也不会复制出第二条。
    // 同时兼容旧版按 name 保存的编辑数据。
    const aliases = aliasesForBase(f.name);
    const edit = customs.find(c => c.baseName === f.name || (!c.custom && !c.baseName && (c.name === f.name || aliases.includes(c.name))));
    if (edit?.hidden) return null;
    return edit
      ? { ...f, ...edit, baseName: f.name, custom: false, stage: stageForMonths(edit.months ?? f.months), edited: true }
      : { ...f, baseName: f.name, custom: false, stage: stageForMonths(f.months) };
  }).filter(Boolean);
  customs
    .filter(c => c.custom || (!c.baseName && !FOOD_LIBRARY.some(f => f.name === c.name) && !LEGACY_BASE_NAMES[c.name]))
    .filter(c => !c.hidden)
    .forEach(c => merged.push({ emoji: "🍽️", cat: "其他", ...c, stage: stageForMonths(c.months ?? 6), custom: true }));
  merged.sort((a, b) => (a.months ?? 6) - (b.months ?? 6));
  mergedLibrary = merged;
  return merged;
};
const libFor = food => mergedLibrary.find(f => f.name === food)
  || mergedLibrary.find(f => food.includes(f.name) || f.name.includes(food.replace(/[泥糊碎段条块]/g, "")))
  || (food.length >= 2 ? mergedLibrary.find(f => f.name.startsWith(food.slice(0, 2))) : null);
const emojiFor = food => libFor(food)?.emoji || "🥄";

/* ---------- 头像 ---------- */
const prepareAvatar = file => new Promise((resolve, reject) => {
  const img = new Image(), reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    img.onload = () => {
      const size = 512, canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d"), side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      canvas.toBlob(blob => blob ? resolve({ blob, dataUrl: canvas.toDataURL("image/webp", .84) }) : reject(new Error("图片处理失败")), "image/webp", .84);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* ---------- 小组件 ---------- */
function FoodPhoto({ food, size = 56 }) {
  const lib = libFor(food);
  const src = lib?.photo || lib?.asset;
  return src
    ? <img src={src} alt="" style={{ width: size, height: size }} className="food-photo" />
    : <span className="food-emoji" style={{ width: size, height: size, fontSize: size * .52 }}>{emojiFor(food)}</span>;
}

// 压缩食物照片为 256px 方形 webp（存 localStorage，体积小）
const prepareFoodPhoto = file => new Promise((resolve, reject) => {
  const img = new Image(), reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    img.onload = () => {
      const size = 256, canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d"), side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/webp", .8));
    };
    img.onerror = () => reject(new Error("图片处理失败"));
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

// 餐食照片压缩成适合手机同步与离线保存的正方形 WebP。
const prepareMealPhoto = file => new Promise((resolve, reject) => {
  const img = new Image(), reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    img.onload = () => {
      const size = 640, canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d"), side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/webp", .74));
    };
    img.onerror = () => reject(new Error("图片处理失败"));
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
const dataUrlToBlob = async dataUrl => (await fetch(dataUrl)).blob();
const blobToDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(blob);
});
const uploadMealPhoto = async (userId, meal) => {
  if (!meal.photo_preview) return meal.photo_path || null;
  const safeId = String(meal.id || `meal-${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, "");
  const path = meal.photo_path || `${userId}/${safeId}.webp`;
  const blob = await dataUrlToBlob(meal.photo_preview);
  const { error } = await supabase.storage.from("meal-photos").upload(path, blob, {
    contentType: "image/webp", cacheControl: "3600", upsert: true,
  });
  if (error) throw error;
  return path;
};

function Header({ online, status, signedIn, avatar, onAvatar, onCalendar, birth, onBirthChange, onSyncTap, onTopTap }) {
  const preciseAge = ageLabel(birth);
  return (
    <header className="baby-header" onClick={e => {
      if (!e.target.closest("button,input,label,[role='button']")) onTopTap?.();
    }}>
      <label className="avatar-editor" aria-label="更换 Elnaz 的头像">
        <img className="baby-avatar" src={avatar} alt="Elnaz 的头像" />
        <span><Camera size={13} /></span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatar} />
      </label>
      <div className="baby-identity">
        <div>
          <strong>Elnaz</strong>
          <label className="age-editor" title="点击修改出生日期">
            <span>{preciseAge}</span>
            <input type="date" value={birth} max={todayKey()} onChange={e => e.target.value && onBirthChange(e.target.value)} />
          </label>
        </div>
        <p>{fmtDateCN(todayKey())}</p>
      </div>
      <button className="calendar-button" onClick={onCalendar} aria-label="查看日历"><CalendarDays size={20} /></button>
      <div className={`family-sync ${signedIn ? "signed-in" : ""}`} role="button" tabIndex={0} onClick={onSyncTap} onKeyDown={e => e.key === "Enter" && onSyncTap()} aria-label={signedIn ? "已登录，查看家庭账号" : "未登录，点击登录同步"}>
        <span><Baby size={16} /></span><i /><span className="parent-two"><Baby size={16} /></span>
        <small>{signedIn ? (online ? status || "已登录 · 查看账号" : "已登录 · 当前离线") : (online ? "未登录 · 点此登录" : "未登录 · 离线记录")}</small>
      </div>
    </header>
  );
}

function HealthStrip({ todayMeals }) {
  const reactions = todayMeals.map(m => m.note);
  const skin = reactions.includes("皮肤反应");
  const digest = reactions.includes("消化不适");
  const watch = reactions.includes("需要观察");
  const items = [
    [ShieldCheck, skin || digest ? "有反应，注意观察" : watch ? "需要观察" : "无异常", skin || digest],
    [Sparkles, skin ? "皮肤有反应" : "皮肤正常", skin],
    [Activity, digest ? "消化不适" : "消化正常", digest],
  ];
  return (
    <section className="health-block">
      <h2>身体反应 / 过敏状态</h2>
      <div className="health-strip">
        {items.map(([Icon, label, warn]) => (
          <div key={label} className={warn ? "warn" : ""}><Icon /><span>{label}</span></div>
        ))}
      </div>
    </section>
  );
}

function MealTimeline({ meals, sortBy, onToggleSort, onOpenMeal, onViewAll }) {
  return (
    <section className="meal-section">
      <div className="section-title">
        <h2>今日记录</h2>
        <button onClick={onToggleSort}>{sortBy === "time" ? "按时间" : "按分量"} <ChevronRight size={16} /></button>
      </div>
      <div className="timeline">
        {meals.length === 0 && <p className="empty-hint">今天还没有记录，点上面的「记录一餐」开始吧 🍼</p>}
        {meals.map((meal, index) => (
          <motion.article
            className="meal-row" key={meal.id} role="button" tabIndex={0}
            onClick={() => onOpenMeal(meal)} onKeyDown={e => e.key === "Enter" && onOpenMeal(meal)}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .06 }}
          >
            <time>{fmtTime(meal.eaten_at)}</time>
            <span className="timeline-dot" />
            {meal.photo_preview
              ? <div className="meal-photo-thumb"><img src={meal.photo_preview} alt={`${meal.food}的餐食照片`} /><Sparkles size={12} /></div>
              : <FoodPhoto food={meal.food} />}
            <div className="meal-copy">
              <h3>{meal.food}</h3>
              <p><b>{meal.amount_grams}克</b><span>{meal.reaction}</span></p>
              {meal.remarks && <p className="meal-remarks" title={meal.remarks}>{meal.remarks}</p>}
            </div>
            <div className="meal-safe"><Check size={15} /><span>{meal.note || "无异常"}</span></div>
            <ChevronRight className="meal-chevron" size={20} />
          </motion.article>
        ))}
      </div>
      <button className="view-all" onClick={onViewAll}>查看全部记录 <ChevronRight size={17} /></button>
    </section>
  );
}

function Choices({ title, value, setValue, items }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="choice-row">
        {items.map(x => <button type="button" className={value === x ? "selected" : ""} onClick={() => setValue(x)} key={x}>{x}</button>)}
      </div>
    </fieldset>
  );
}

function AddMealDialog({ open, prefill, onOpenChange, onSave }) {
  const [food, setFood] = useState("");
  const [foodPickerOpen, setFoodPickerOpen] = useState(false);
  const [amount, setAmount] = useState(30);
  const [date, setDate] = useState(todayKey);
  const [time, setTime] = useState(nowHHMM);
  const [reaction, setReaction] = useState("很喜欢");
  const [body, setBody] = useState("无异常");
  const [source, setSource] = useState("自己制作");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setFood(prefill?.food || "");
      setFoodPickerOpen(false);
      setAmount(prefill?.amount || 30);
      setDate(prefill?.date || todayKey());
      setTime(nowHHMM());
      setReaction("很喜欢");
      setBody("无异常");
      setSource("自己制作");
      setRemarks("");
      setPhoto(null);
      setPhotoBusy(false);
    }
  }, [open, prefill]);
  const foodOptions = useMemo(() => {
    const query = food.trim().toLocaleLowerCase();
    if (!query) return mergedLibrary.slice(0, 60);
    return mergedLibrary.filter(item => `${item.name} ${item.fr || ""}`.toLocaleLowerCase().includes(query)).slice(0, 60);
  }, [food, open]);
  const chooseMealPhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try { setPhoto(await prepareMealPhoto(file)); }
    catch { alert("照片处理失败，请换一张照片重试"); }
    finally { setPhotoBusy(false); event.target.value = ""; }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet add-meal-sheet" onPointerDown={e => {
          if (!e.target.closest("input,textarea,button,select,label")) document.activeElement?.blur();
          if (!e.target.closest(".food-field")) setFoodPickerOpen(false);
        }}>
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <Dialog.Title>记录一餐</Dialog.Title>
              <Dialog.Description>几步就能记好，常用选项已为你准备。</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          <form onSubmit={e => { e.preventDefault(); if (food.trim() && !photoBusy) onSave({ food: food.trim(), amount_grams: Number(amount) || 0, date, time, reaction, note: body, food_source: source, remarks: remarks.trim(), photo_preview: photo }); }}>
            <div className="food-field">
              <label htmlFor="meal-food">吃了什么</label>
              <div className="food-input-wrap">
                <input
                  id="meal-food"
                  value={food}
                  onChange={e => { setFood(e.target.value); setFoodPickerOpen(true); }}
                  onFocus={() => !food && setFoodPickerOpen(true)}
                  placeholder="选择或输入食物名"
                  autoComplete="off"
                  required
                />
                <button
                  className="food-picker-toggle"
                  type="button"
                  aria-label="打开食物选择列表"
                  aria-expanded={foodPickerOpen}
                  onClick={() => setFoodPickerOpen(value => !value)}
                ><ChevronDown size={18} /></button>
                {foodPickerOpen && (
                  <div className="food-picker-menu" role="listbox" aria-label="选择食物">
                    {foodOptions.length ? foodOptions.map(item => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={food === item.name}
                        key={`${item.baseName || item.name}-${item.name}`}
                        onClick={() => { setFood(item.name); setFoodPickerOpen(false); }}
                      >
                        <span>{item.emoji || "🥣"}</span>
                        <b>{item.name}</b>
                        {item.fr && <small>{item.fr}</small>}
                      </button>
                    )) : <p>没有找到，可以直接使用输入的名称</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="form-grid">
              <label>日期（可补记过去）<input type="date" value={date} max={todayKey()} onChange={e => setDate(e.target.value)} /></label>
              <label>时间<input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
            </div>
            <label>分量（克）<input type="number" min="1" max="1000" value={amount} onChange={e => setAmount(e.target.value)} /></label>
            <div className={`meal-photo-picker ${photo ? "has-photo" : ""}`}>
              <div className="meal-photo-label"><span>餐食照片</span><small>可选</small></div>
              <label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseMealPhoto} />
                {photo
                  ? <><img src={photo} alt="准备上传的餐食照片" /><span className="photo-change"><Camera size={17} />点击更换照片</span></>
                  : <span className="meal-photo-empty"><i><ImagePlus size={24} /></i><b>{photoBusy ? "正在准备照片…" : "添加一张餐食照片"}</b><small>拍照或从手机相册选择</small></span>}
              </label>
              {photo && <button type="button" className="remove-meal-photo" onClick={() => setPhoto(null)}><X size={14} />移除</button>}
            </div>
            <Choices title="喜欢程度" value={reaction} setValue={setReaction} items={["很喜欢", "愿意尝试", "一般般", "不太喜欢"]} />
            <Choices title="身体反应" value={body} setValue={setBody} items={["无异常", "皮肤反应", "消化不适", "需要观察"]} />
            <Choices title="食物来源" value={source} setValue={setSource} items={["自己制作", "超市购买", "其他"]} />
            <label>备注
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                onFocus={e => {
                  const textarea = e.currentTarget;
                  setTimeout(() => {
                    if (!textarea.isConnected) return;
                    textarea.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                  }, 180);
                }}
                maxLength={2000}
                rows={4}
                placeholder="例如：自己制作的苹果泥，加入少量温水；或购买自 Carrefour 的宝宝辅食。"
              />
            </label>
            <button className="save-button" type="submit" disabled={photoBusy}><Check size={19} />{photoBusy ? "正在准备照片…" : "保存这餐"}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MealDetailDialog({ meal, onClose, onDelete }) {
  return (
    <Dialog.Root open={!!meal} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet">
          <div className="sheet-grabber" />
          {meal && <>
            <div className="sheet-head detail-sheet-head">
              <div className="detail-title-wrap">
                <FoodPhoto food={meal.food} size={38} />
                <div>
                  <Dialog.Title>{meal.food}</Dialog.Title>
                  <Dialog.Description>{fmtDateCN(dayKeyOf(meal.eaten_at))} {fmtTime(meal.eaten_at)}</Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
            </div>
            <div className={`detail-body ${meal.photo_preview ? "has-meal-photo" : "no-meal-photo"}`}>
              {!meal.photo_preview && <FoodPhoto food={meal.food} size={72} />}
              {meal.photo_preview && <img className="meal-detail-photo" src={meal.photo_preview} alt={`${meal.food}的餐食照片`} />}
              <ul>
                <li><span>分量</span><b>{meal.amount_grams} 克</b></li>
                <li><span>喜欢程度</span><b>{meal.reaction}</b></li>
                <li><span>身体反应</span><b>{meal.note || "无异常"}</b></li>
                {meal.food_source && <li><span>食物来源</span><b>{meal.food_source}</b></li>}
              </ul>
              {meal.remarks && <div className="detail-remarks"><span>备注</span><p>{meal.remarks}</p></div>}
            </div>
            <button className="danger-button" onClick={() => { if (confirm(`删除这条「${meal.food}」记录？`)) onDelete(meal); }}>
              <Trash2 size={17} />删除这条记录
            </button>
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CalendarDialog({ open, onOpenChange, meals, onAddFor }) {
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(todayKey());
  useEffect(() => { if (open) { const n = new Date(); setMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(todayKey()); } }, [open]);
  const byDay = useMemo(() => {
    const map = {};
    meals.forEach(m => { const k = dayKeyOf(m.eaten_at); (map[k] = map[k] || []).push(m); });
    return map;
  }, [meals]);
  const cells = useMemo(() => {
    const first = month.getDay(), days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);
  const keyOfDay = d => dayKeyOf(new Date(month.getFullYear(), month.getMonth(), d));
  const dayMeals = (byDay[selected] || []).slice().sort((a, b) => new Date(a.eaten_at) - new Date(b.eaten_at));
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet calendar-sheet">
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <Dialog.Title>记录日历</Dialog.Title>
              <Dialog.Description>点日期查看那天吃了什么。</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          <div className="calendar-nav">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="上个月"><ChevronLeft size={18} /></button>
            <strong>{month.getFullYear()}年{month.getMonth() + 1}月</strong>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="下个月"><ChevronRight size={18} /></button>
          </div>
          <div className="calendar-grid">
            {["日", "一", "二", "三", "四", "五", "六"].map(w => <span key={w} className="week-head">{w}</span>)}
            {cells.map((d, i) => d === null
              ? <span key={`e${i}`} />
              : <button
                  key={d}
                  className={`day-cell ${keyOfDay(d) === selected ? "selected" : ""} ${keyOfDay(d) === todayKey() ? "today" : ""}`}
                  onClick={() => setSelected(keyOfDay(d))}
                >
                  {d}{byDay[keyOfDay(d)] && <i />}
                </button>
            )}
          </div>
          <div className="calendar-day-list">
            <div className="calendar-day-head">
              <h3>{fmtDateCN(selected)}</h3>
              {selected <= todayKey() && (
                <button className="calendar-add-button" onClick={() => { onOpenChange(false); onAddFor(selected); }}>
                  <Plus size={15} />补记这一天
                </button>
              )}
            </div>
            {dayMeals.length === 0
              ? <p className="empty-hint">这一天没有记录</p>
              : dayMeals.map(m => (
                <div className="mini-meal" key={m.id}>
                  <time>{fmtTime(m.eaten_at)}</time>
                  <FoodPhoto food={m.food} size={36} />
                  <span>{m.food}</span>
                  <b>{m.amount_grams}克</b>
                  <small>{m.reaction}</small>
                </div>
              ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InfoDialog({ info, onClose }) {
  return (
    <Dialog.Root open={!!info} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet">
          <div className="sheet-grabber" />
          {info && <>
            <div className="sheet-head">
              <div>
                <Dialog.Title>{info.title}</Dialog.Title>
                <Dialog.Description>{info.subtitle || ""}</Dialog.Description>
              </div>
              <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
            </div>
            <div className="info-body">
              {info.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- 食物编辑 ---------- */
function FoodEditDialog({ editing, onClose, onSave, onDelete }) {
  // editing: null=关闭, {mode:"add"} 或 {mode:"edit", food}
  const isEdit = editing?.mode === "edit";
  const food = editing?.food;
  const [name, setName] = useState("");
  const [fr, setFr] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [cat, setCat] = useState("其他");
  const [monthsFrom, setMonthsFrom] = useState(6);
  const [amount, setAmount] = useState("15–30克");
  const [tip, setTip] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!editing) return;
    setName(food?.name || "");
    setFr(food?.fr || "");
    setEmoji(food?.emoji || "🍽️");
    setCat(food?.cat || "其他");
    setMonthsFrom(food?.months ?? 6);
    setAmount(food?.amount || "15–30克");
    setTip(food?.tip || "");
    setPhoto(food?.photo || null);
    setBusy(false);
  }, [editing]);
  const pickPhoto = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { setPhoto(await prepareFoodPhoto(file)); } catch { alert("图片处理失败，请换一张试试"); }
    setBusy(false);
  };
  return (
    <Dialog.Root open={!!editing} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet food-edit-sheet">
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <Dialog.Title>{isEdit ? `编辑「${food?.name}」` : "添加新食物"}</Dialog.Title>
              <Dialog.Description>可以上传照片，让记录更好认。</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave({ name: name.trim(), fr: fr.trim(), emoji: emoji.trim() || "🍽️", cat, months: Number(monthsFrom) || 6, amount: amount.trim() || "适量", tip: tip.trim(), photo }, food);
          }}>
            <div className="photo-picker">
              <label aria-label="上传食物照片">
                {photo
                  ? <img src={photo} alt="" />
                  : (food && !food.custom && (food.asset || food.emoji))
                    ? <FoodPhoto food={food.name} size={84} />
                    : <span className="photo-placeholder">{emoji}</span>}
                <b><Camera size={13} /></b>
                <input type="file" accept="image/*" onChange={pickPhoto} />
              </label>
              <div>
                <p>{busy ? "正在处理图片…" : photo ? "已选好照片，点击可更换" : "点击圆圈上传照片（可选）"}</p>
                {photo && <button type="button" className="text-link" onClick={() => setPhoto(null)}>移除照片</button>}
              </div>
            </div>
            <label>食物名称
              <input value={name} onChange={e => setName(e.target.value)} placeholder="比如：小米粥" required />
            </label>
            <label>法语名称
              <input value={fr} onChange={e => setFr(e.target.value)} placeholder="比如：bouillie de millet" />
            </label>
            <div className="form-grid">
              <label>图标（emoji）<input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength="4" /></label>
              <label>几个月起
                <select value={monthsFrom} onChange={e => setMonthsFrom(e.target.value)}>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>{m} 个月</option>)}
                </select>
              </label>
            </div>
            <label>分类
              <select value={cat} onChange={e => setCat(e.target.value)}>
                {FOOD_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>建议分量<input value={amount} onChange={e => setAmount(e.target.value)} placeholder="比如：15–30克" /></label>
            <label>小贴士<input value={tip} onChange={e => setTip(e.target.value)} placeholder="做法或注意事项（可选）" /></label>
            <button className="save-button" type="submit" disabled={busy}><Check size={19} />保存</button>
            {isEdit && <>
              <button type="button" className="danger-button slim" onClick={() => {
                const message = food?.custom ? `删除「${food.name}」？` : `从食物库隐藏「${food.name}」？以后仍可通过“恢复内置食物”找回来。`;
                if (confirm(message)) onDelete(food, "delete");
              }}><Trash2 size={16} />{food?.custom ? "删除这个食物" : "从食物库隐藏"}</button>
              {!food?.custom && food?.edited && (
                <button type="button" className="secondary-button slim" onClick={() => onDelete(food, "restore")}>恢复默认名称和设置</button>
              )}
            </>}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ---------- 页面 ---------- */
function LibraryView({ library, months, tried, onRecord, onPlan, onEdit, onAdd, hiddenCount, onRestoreHidden }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("全部");
  const stages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = library.filter(f =>
      (cat === "全部" || (f.cat || "其他") === cat)
      && (!q || f.name.toLowerCase().includes(q) || (f.fr || "").toLowerCase().includes(q)));
    const groups = [];
    filtered.forEach(f => {
      let g = groups.find(x => x.stage === f.stage);
      if (!g) { g = { stage: f.stage, foods: [] }; groups.push(g); }
      g.foods.push(f);
    });
    return groups;
  }, [library, query, cat]);
  return (
    <div className="page">
      <h1 className="page-title">食物库</h1>
      <p className="page-sub">按法国辅食添加对照表整理，Elnaz 现在 {months} 个月。</p>
      <div className="lib-toolbar">
        <input className="search-input" placeholder="搜索食物（中文或法语）…" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="add-food-button" onClick={onAdd}><Plus size={17} />添加食物</button>
      </div>
      {hiddenCount > 0 && (
        <button className="restore-hidden-button" onClick={onRestoreHidden}>恢复隐藏的内置食物（{hiddenCount}）</button>
      )}
      <div className="cat-chips">
        {["全部", ...FOOD_CATS].map(c => (
          <button key={c} className={cat === c ? "selected" : ""} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      {stages.map(group => (
        <section key={group.stage} className="lib-stage">
          <h2>{group.stage}</h2>
          {group.foods.map(f => {
            const state = f.months <= months ? "ok" : f.tryMonths && f.tryMonths <= months ? "try" : "wait";
            return (
              <div className={`lib-row ${state === "wait" ? "not-yet" : ""}`} key={f.name}>
                <FoodPhoto food={f.name} size={46} />
                <div>
                  <h3>
                    {f.name} {f.fr && <i className="fr-name">{f.fr}</i>}
                    {tried.has(f.name) && <em className="tried-tag">已尝试</em>}
                    {f.custom && <em className="custom-tag">自己加的</em>}
                    {state === "try" && <em className="try-tag">可少量尝试</em>}
                    {state === "wait" && <em className="wait-tag">{f.months >= 24 ? `${Math.round(f.months / 12)}岁前不要` : "再等等"}</em>}
                  </h3>
                  <p>{f.tip}</p>
                  <small>建议 {f.amount}{f.season ? ` · 应季 ${f.season}` : ""}</small>
                </div>
                <div className="lib-actions">
                  <button onClick={() => onRecord(f)} aria-label={`记录${f.name}`}><Plus size={16} /></button>
                  <button className="ghost" onClick={() => onPlan(f)}>计划</button>
                  <button className="ghost" onClick={() => onEdit(f)} aria-label={`编辑${f.name}`}><Pencil size={12} /> 编辑</button>
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {stages.length === 0 && <p className="empty-hint">没有找到「{query}」，点上面的「添加食物」加进来吧。</p>}
    </div>
  );
}

function PlanView({ plan, onRecord, onRemove }) {
  return (
    <div className="page">
      <h1 className="page-title">尝试计划</h1>
      <p className="page-sub">想给 Elnaz 试的新食物，都放在这里。</p>
      {plan.length === 0 && <p className="empty-hint">计划还是空的。去「食物库」挑一样，或在首页把推荐加进来。</p>}
      {plan.map(item => (
        <div className="plan-row" key={item.id}>
          <FoodPhoto food={item.food} size={46} />
          <div>
            <h3>{item.food}</h3>
            <small>建议 {item.amount || "适量"}</small>
          </div>
          <button className="plan-go" onClick={() => onRecord(item)}>去记录</button>
          <button className="icon-button small" onClick={() => onRemove(item)} aria-label="移除"><X size={15} /></button>
        </div>
      ))}
      <div className="plan-tip">
        <AlertTriangle size={16} />
        <span>新食物一次只加一种，观察 2–3 天没有不适，再试下一种。</span>
      </div>
    </div>
  );
}

function BigCalendar({ meals, onOpenMeal, onAddFor }) {
  const [month, setMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selected, setSelected] = useState(todayKey());
  const byDay = useMemo(() => {
    const map = {};
    meals.forEach(m => { const k = dayKeyOf(m.eaten_at); (map[k] = map[k] || []).push(m); });
    Object.values(map).forEach(list => list.sort((a, b) => new Date(a.eaten_at) - new Date(b.eaten_at)));
    return map;
  }, [meals]);
  const cells = useMemo(() => {
    const first = month.getDay(), days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [month]);
  const keyOfDay = d => dayKeyOf(new Date(month.getFullYear(), month.getMonth(), d));
  const dayMeals = byDay[selected] || [];
  return (
    <section className="big-cal">
      <div className="calendar-nav">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="上个月"><ChevronLeft size={18} /></button>
        <strong>{month.getFullYear()}年{month.getMonth() + 1}月</strong>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="下个月"><ChevronRight size={18} /></button>
      </div>
      <div className="big-cal-grid">
        {["日", "一", "二", "三", "四", "五", "六"].map(w => <span key={w} className="week-head">{w}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const k = keyOfDay(d), list = byDay[k] || [];
          return (
            <button
              key={d}
              className={`big-day ${k === selected ? "selected" : ""} ${k === todayKey() ? "today" : ""}`}
              onClick={() => {
                setSelected(k);
                if (list.length === 1) onOpenMeal(list[0]);
              }}
              aria-label={`${month.getMonth() + 1}月${d}日，${list.length} 餐`}
            >
              <b>{d}</b>
              <span className="day-foods">
                {list.slice(0, 4).map(m => m.photo_preview
                  ? <img className="day-meal-photo" key={m.id} src={m.photo_preview} alt="" />
                  : <FoodPhoto key={m.id} food={m.food} size={17} />)}
                {list.length > 4 && <i>+{list.length - 4}</i>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="calendar-day-list">
        <div className="day-list-head">
          <h3>{fmtDateCN(selected)} · {dayMeals.length} 餐{dayMeals.length > 0 && ` · 共 ${dayMeals.reduce((s, m) => s + Number(m.amount_grams || 0), 0)} 克`}</h3>
          {selected <= todayKey() && <button className="add-past-button" onClick={() => onAddFor(selected)}><Plus size={13} />补记一餐</button>}
        </div>
        {dayMeals.length === 0
          ? <p className="empty-hint">这一天没有记录</p>
          : dayMeals.map(m => (
            <button className={`mini-meal calendar-meal-card as-button ${m.photo_preview ? "has-photo" : ""}`} key={m.id} onClick={() => onOpenMeal(m)}>
              <time>{fmtTime(m.eaten_at)}</time>
              {m.photo_preview
                ? <img className="calendar-meal-photo" src={m.photo_preview} alt={`${m.food}的餐食照片`} />
                : <FoodPhoto food={m.food} size={42} />}
              <span className="calendar-meal-copy"><b>{m.food}</b><small><em>{m.amount_grams}克</em>{m.reaction}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
      </div>
    </section>
  );
}

function PhotoWallDialog({ open, onOpenChange, meals, onOpenMeal }) {
  const photos = useMemo(
    () => meals.filter(meal => meal.photo_preview).sort((a, b) => new Date(b.eaten_at) - new Date(a.eaten_at)),
    [meals],
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet photo-wall-sheet">
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <Dialog.Title>Elnaz 的餐食照片</Dialog.Title>
              <Dialog.Description>{photos.length ? `珍藏了 ${photos.length} 个可爱的吃饭瞬间` : "以后记录的餐食照片会收藏在这里"}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          {photos.length ? (
            <div className="photo-wall-grid">
              {photos.map(meal => (
                <button key={meal.id} onClick={() => { onOpenChange(false); onOpenMeal(meal); }}>
                  <img src={meal.photo_preview} alt={`${meal.food}的餐食照片`} />
                  <span><b>{meal.food}</b><small>{fmtDateCN(dayKeyOf(meal.eaten_at)).replace(" · ", " ")} · {fmtTime(meal.eaten_at)}</small></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="photo-wall-empty"><span><Images size={28} /></span><b>照片墙还是空的</b><p>记录一餐时添加照片，就能慢慢收集 Elnaz 的辅食回忆。</p></div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GrowthView({ meals, onOpenMeal, onAddFor }) {
  const [photoWallOpen, setPhotoWallOpen] = useState(false);
  const stats = useMemo(() => {
    const days = new Set(meals.map(m => dayKeyOf(m.eaten_at)));
    const foods = new Map();
    meals.forEach(m => foods.set(m.food, (foods.get(m.food) || 0) + 1));
    return { total: meals.length, days: days.size, photos: meals.filter(m => m.photo_preview).length, foods: [...foods.entries()].sort((a, b) => b[1] - a[1]) };
  }, [meals]);
  return (
    <div className="page">
      <h1 className="page-title">成长记录</h1>
      <div className="stat-grid">
        <div><b>{stats.total}</b><span>累计记录</span></div>
        <div><b>{stats.foods.length}</b><span>尝试过的食物</span></div>
        <div><b>{stats.days}</b><span>记录天数</span></div>
        <button className="photo-wall-stat" onClick={() => setPhotoWallOpen(true)}>
          <i><Images size={18} /></i><b>{stats.photos}</b><span>照片墙</span>
        </button>
      </div>
      {stats.foods.length > 0 && (
        <section className="food-tags-block">
          <h2>已尝试的食物</h2>
          <div className="food-tags">
            {stats.foods.map(([name, count]) => <span key={name}>{emojiFor(name)} {name} ×{count}</span>)}
          </div>
        </section>
      )}
      <h2 className="history-title">每日饮食日历</h2>
      <BigCalendar meals={meals} onOpenMeal={onOpenMeal} onAddFor={onAddFor} />
      <PhotoWallDialog open={photoWallOpen} onOpenChange={setPhotoWallOpen} meals={meals} onOpenMeal={onOpenMeal} />
    </div>
  );
}

/* ---------- 主应用 ---------- */
function App() {
  const contentRef = useRef(null);
  const [meals, setMeals] = useState(() => {
    const all = readLocal(mealsKey, null);
    if (all) return all;
    // 迁移旧版本只存当天的缓存（过滤掉演示数据）
    const legacy = readLocal(legacyCacheKey, []).filter(m => !String(m.id).startsWith("demo-"));
    if (legacy.length) writeLocal(mealsKey, legacy);
    return legacy;
  });
  const [plan, setPlan] = useState(() => readLocal(planKey, []));
  const [customFoods, setCustomFoods] = useState(() => readLocal(customFoodsKey, []));
  const [editingFood, setEditingFood] = useState(null);
  const [birth, setBirth] = useState(() => localStorage.getItem(birthKey) || "2026-02-13");
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey) || "/assets/baby-avatar.png");
  const [tab, setTab] = useState("today");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailMeal, setDetailMeal] = useState(null);
  const [info, setInfo] = useState(null);
  const [sortBy, setSortBy] = useState("time");
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const months = ageMonths(birth);
  const library = useMemo(() => mergeLibrary(customFoods), [customFoods]);
  const tried = useMemo(() => new Set(meals.map(m => m.food)), [meals]);
  const todayMeals = useMemo(() => {
    const list = meals.filter(m => dayKeyOf(m.eaten_at) === todayKey());
    return list.sort((a, b) => sortBy === "time"
      ? new Date(a.eaten_at) - new Date(b.eaten_at)
      : b.amount_grams - a.amount_grams);
  }, [meals, sortBy]);
  const total = useMemo(() => todayMeals.reduce((sum, m) => sum + Number(m.amount_grams || 0), 0), [todayMeals]);
  const recommend = useMemo(
    () => library.find(f => f.months <= months && !tried.has(f.name)) || library.find(f => !tried.has(f.name)) || library[0],
    [library, months, tried],
  );

  const saveMeals = next => { setMeals(next); writeLocal(mealsKey, next); };
  const savePlan = next => { setPlan(next); writeLocal(planKey, next); };
  const saveCustomFoods = next => {
    setCustomFoods(next);
    try { writeLocal(customFoodsKey, next); } catch { setNotice("手机存储空间不够了，照片没能保存"); }
  };

  const saveFood = (data, original) => {
    const finalName = data.name.trim();
    const baseName = original && !original.custom ? (original.baseName || original.name) : null;
    const duplicate = mergedLibrary.some(f => f.name === finalName && (!baseName || f.baseName !== baseName));
    if (duplicate) { setNotice(`「${finalName}」已经在食物库里了`); return; }
    const aliases = baseName ? aliasesForBase(baseName) : [];
    const rest = customFoods.filter(c => baseName
      ? c.baseName !== baseName && !(c.name === baseName && !c.custom) && !(aliases.includes(c.name) && !c.custom)
      : c.name !== original?.name);
    const saved = baseName
      ? { ...data, name: finalName, baseName, custom: false }
      : { ...data, name: finalName, custom: true };
    saveCustomFoods([...rest, saved]);
    setEditingFood(null);
    setNotice(original ? `「${finalName}」已更新` : `「${finalName}」已加入食物库`);
  };
  const deleteFood = (food, action = "delete") => {
    const baseName = food.baseName || food.name;
    const aliases = aliasesForBase(baseName);
    const rest = customFoods.filter(c => food.custom
      ? !(c.custom && c.name === food.name)
      : c.baseName !== baseName && !(c.name === baseName && !c.custom) && !(aliases.includes(c.name) && !c.custom));
    if (!food.custom && action === "delete") {
      saveCustomFoods([...rest, { baseName, name: food.name, hidden: true, custom: false }]);
    } else {
      saveCustomFoods(rest);
    }
    setEditingFood(null);
    setNotice(food.custom ? `已删除「${food.name}」` : action === "restore" ? `「${baseName}」已恢复默认` : `已隐藏「${food.name}」`);
  };
  const restoreHiddenFoods = () => {
    const count = customFoods.filter(c => c.hidden).length;
    saveCustomFoods(customFoods.filter(c => !c.hidden));
    setNotice(`已恢复 ${count} 个内置食物`);
  };

  /* --- 云同步 --- */
  const sync = async () => {
    if (!navigator.onLine) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("baby_profiles").select("avatar_path").eq("user_id", user.id).maybeSingle();
      if (profile?.avatar_path) {
        const { data: blob } = await supabase.storage.from("baby-avatars").download(profile.avatar_path);
        if (blob) setAvatar(URL.createObjectURL(blob));
      }
      const pending = readLocal(pendingKey, []);
      if (pending.length) {
        const rows = [];
        for (const pendingMeal of pending) {
          const photoPath = await uploadMealPhoto(user.id, pendingMeal);
          const { id, localId, time, asset, photo_preview, ...m } = pendingMeal;
          rows.push({ ...m, photo_path: photoPath, user_id: user.id, emoji: emojiFor(m.food) });
        }
        const { error } = await supabase.from("meals").insert(rows);
        if (!error) localStorage.removeItem(pendingKey);
      }
      const { data } = await supabase.from("meals").select("*").order("eaten_at");
      if (data) {
        const cachedMeals = new Map(readLocal(mealsKey, []).map(meal => [meal.id, meal]));
        const hydrated = await Promise.all(data.map(async meal => {
          if (!meal.photo_path) return meal;
          const cached = cachedMeals.get(meal.id)?.photo_preview;
          if (cached) return { ...meal, photo_preview: cached };
          const { data: photoBlob } = await supabase.storage.from("meal-photos").download(meal.photo_path);
          if (!photoBlob) return meal;
          try { return { ...meal, photo_preview: await blobToDataUrl(photoBlob) }; }
          catch { return meal; }
        }));
        const stillPending = readLocal(pendingKey, []);
        const merged = [...hydrated, ...stillPending];
        saveMeals(merged);
        setSyncStatus("爸妈已同步");
      }
    } catch { /* 网络异常时保持本地数据 */ }
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setCurrentUser(data.session?.user || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setCurrentUser(session?.user || null);
      if (event === "SIGNED_OUT") setSyncStatus("");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    sync();
    const on = () => { setOnline(true); sync(); setNotice("已恢复网络，记录已同步"); };
    const off = () => { setOnline(false); setNotice("已进入离线模式，记录会稍后同步"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  /* --- 记一餐 --- */
  const addMeal = async record => {
    const local = {
      food: record.food, amount_grams: record.amount_grams, reaction: record.reaction, note: record.note,
      food_source: record.food_source, remarks: record.remarks, photo_preview: record.photo_preview || null,
      id: `local-${Date.now()}`, eaten_at: isoFor(record.date || todayKey(), record.time),
    };
    saveMeals([...meals, local]);
    setSheetOpen(false);
    setPlan(prev => {
      const next = prev.filter(p => p.food !== record.food);
      if (next.length !== prev.length) writeLocal(planKey, next);
      return next;
    });
    const queue = () => writeLocal(pendingKey, [...readLocal(pendingKey, []), local]);
    if (!navigator.onLine) { queue(); setNotice("已离线保存，联网后自动同步"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { queue(); setNotice("已保存在本机，登录后可与家人同步"); return; }
    try { local.photo_path = await uploadMealPhoto(user.id, local); }
    catch { queue(); setNotice("记录已保存在手机，照片会稍后自动同步"); return; }
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, food: local.food, amount_grams: local.amount_grams,
      eaten_at: local.eaten_at, reaction: local.reaction, note: local.note,
      food_source: local.food_source, remarks: local.remarks, photo_path: local.photo_path, emoji: emojiFor(local.food),
    });
    if (error) { queue(); setNotice("已保存在本机，稍后自动重试"); } else { setNotice("这一餐已同步给家人"); sync(); }
  };

  const deleteMeal = async meal => {
    saveMeals(meals.filter(m => m.id !== meal.id));
    writeLocal(pendingKey, readLocal(pendingKey, []).filter(m => m.id !== meal.id));
    setDetailMeal(null);
    if (!String(meal.id).startsWith("local-") && navigator.onLine) {
      await supabase.from("meals").delete().eq("id", meal.id);
      if (meal.photo_path) await supabase.storage.from("meal-photos").remove([meal.photo_path]);
    } else if (meal.photo_path && navigator.onLine) {
      await supabase.storage.from("meal-photos").remove([meal.photo_path]);
    }
    setNotice("已删除这条记录");
  };

  /* --- 计划 --- */
  const addToPlan = food => {
    if (plan.some(p => p.food === food.name)) { setNotice(`「${food.name}」已经在计划里了`); return; }
    savePlan([...plan, { id: `plan-${Date.now()}`, food: food.name, amount: food.amount }]);
    setNotice(`已把「${food.name}」加入计划`);
  };

  const syncTap = async () => {
    setAuthOpen(true);
  };

  const syncFromAccount = async () => {
    if (!navigator.onLine) { setNotice("现在离线，联网后会自动同步"); return; }
    setNotice("正在同步…");
    await sync();
    setNotice("已和家人同步");
  };

  const openRecord = item => {
    setPrefill({ food: item.food || item.name, amount: parseInt(item.amount) || 30 });
    setSheetOpen(true);
  };

  const changeAvatar = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { blob, dataUrl } = await prepareAvatar(file);
      setAvatar(dataUrl);
      localStorage.setItem(avatarKey, dataUrl);
      if (!navigator.onLine) { setNotice("头像已保存在手机，联网登录后可同步"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotice("头像已保存在手机，登录后可同步"); return; }
      const path = `${user.id}/elnaz-avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("baby-avatars").upload(path, blob, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;
      const { error: profileError } = await supabase.from("baby_profiles").upsert({ user_id: user.id, baby_name: "Elnaz", avatar_path: path, updated_at: new Date().toISOString() });
      if (profileError) throw profileError;
      setNotice("Elnaz 的头像已同步给家人");
    } catch { setNotice("头像保存失败，请换一张图片重试"); }
  };

  const allergyInfo = {
    title: "关注宝宝反应",
    subtitle: "新食物怎么加才安心",
    paragraphs: [
      "每次只添加一种新食物，连续观察 2–3 天，确认没有不适再引入下一种。",
      "常见的过敏信号：皮肤出红疹或风团、呕吐或腹泻、口周红肿。轻微反应先暂停这种食物，记录下来；如出现呼吸急促、面部肿胀等严重反应，请立即就医。",
      "鸡蛋、花生、鱼虾、小麦、大豆、牛奶是常见易过敏食物，第一次尝试时选上午，分量从一小勺开始。",
      "这里的内容只是常识提醒，具体请以儿科医生的建议为准。",
    ],
  };
  const recommendInfo = recommend && {
    title: `为什么推荐${recommend.name}？`,
    subtitle: `适合 ${recommend.stage} 的宝宝`,
    paragraphs: [
      recommend.tip,
      `Elnaz 现在 ${months} 个月，还没有记录过${recommend.name}，正适合尝试。建议分量 ${recommend.amount}，第一次选在上午，方便白天观察反应。`,
    ],
  };

  return (
    <div className="app-shell">
      <div className="mobile-prototype">
        <button className="top-scroll-tap" onClick={scrollToTop} aria-label="滚动回顶部" />
        <main
          className="content"
          ref={contentRef}
          onScroll={e => setShowScrollTop(e.currentTarget.scrollTop > 280)}
          onPointerDown={e => {
            if (!e.target.closest("input,textarea,select,button,label,[role='button']")) document.activeElement?.blur();
          }}
        >
          {tab === "today" && <>
            <Header
              online={online} status={syncStatus} signedIn={!!currentUser} avatar={avatar} onAvatar={changeAvatar}
              onCalendar={() => setCalendarOpen(true)} birth={birth} onSyncTap={syncTap}
              onTopTap={scrollToTop}
              onBirthChange={v => { setBirth(v); localStorage.setItem(birthKey, v); setNotice("出生日期已更新"); }}
            />
            <button className="primary-action" onClick={() => { setPrefill(null); setSheetOpen(true); }}><Plus size={25} />记录一餐</button>
            <HealthStrip todayMeals={todayMeals} />
            <div className="daily-summary">
              <Check />
              <span>今天已吃 {todayMeals.length} 餐 · 共 {total} 克{todayMeals.some(m => m.note && m.note !== "无异常") ? " · 有反应需观察" : " · 暂无异常"}</span>
            </div>
            <MealTimeline
              meals={todayMeals} sortBy={sortBy}
              onToggleSort={() => setSortBy(s => s === "time" ? "amount" : "time")}
              onOpenMeal={setDetailMeal} onViewAll={() => setTab("growth")}
            />
            <section className="next-food">
              <div className="next-title">
                <span><Sparkles />下一种可以尝试</span>
                <button onClick={() => setInfo(recommendInfo)}>为什么推荐 <ChevronRight size={15} /></button>
              </div>
              <div className="next-body">
                <FoodPhoto food={recommend.name} size={70} />
                <div>
                  <h2>{recommend.name}</h2>
                  <p>{recommend.tip}</p>
                  <small>建议 {recommend.amount} · 上午尝试</small>
                </div>
                <button aria-label="加入计划" onClick={() => addToPlan(recommend)}><Plus /></button>
              </div>
            </section>
            <section className="allergy-note">
              <AlertTriangle />
              <div>
                <h2>关注宝宝反应</h2>
                <p>首次尝试新食物，建议观察 2–3 天；如出现不适，请暂停并咨询医生。</p>
              </div>
              <button onClick={() => setInfo(allergyInfo)}>了解更多 <ChevronRight /></button>
            </section>
          </>}
          {tab === "library" && <LibraryView library={library} months={months} tried={tried} onRecord={openRecord} onPlan={addToPlan} onEdit={f => setEditingFood({ mode: "edit", food: f })} onAdd={() => setEditingFood({ mode: "add" })} hiddenCount={customFoods.filter(c => c.hidden).length} onRestoreHidden={restoreHiddenFoods} />}
          {tab === "plan" && <PlanView plan={plan} onRecord={openRecord} onRemove={item => savePlan(plan.filter(p => p.id !== item.id))} />}
          {tab === "growth" && <GrowthView meals={meals} onOpenMeal={setDetailMeal} onAddFor={d => { setPrefill({ date: d }); setSheetOpen(true); }} />}
        </main>
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              className="scroll-top-button"
              onClick={scrollToTop}
              aria-label="返回顶部"
              initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .92 }}
            ><ArrowUp size={18} /></motion.button>
          )}
        </AnimatePresence>
        <nav className="bottom-nav">
          {[["today", CalendarDays, "今天"], ["library", Library, "食物库"], ["plan", ClipboardList, "计划"], ["growth", Sprout, "成长"]].map(([key, Icon, label]) => (
            <button className={tab === key ? "active" : ""} key={key} onClick={() => setTab(key)}>
              <Icon /><span>{label}</span>
              {key === "plan" && plan.length > 0 && <em className="nav-badge">{plan.length}</em>}
            </button>
          ))}
        </nav>
        <AnimatePresence>
          {notice && (
            <motion.div
              className="toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onAnimationComplete={() => setTimeout(() => setNotice(""), 2200)}
            >{notice}</motion.div>
          )}
        </AnimatePresence>
      </div>
      <aside className="desktop-companion">
        <span>宝贝食光</span>
        <h1>把每一口成长，<br />安心地记在一起。</h1>
        <p>专为父母共同使用的宝宝辅食日记。</p>
        <div><ShieldCheck />云端同步与离线记录</div>
      </aside>
      <AddMealDialog open={sheetOpen} prefill={prefill} onOpenChange={setSheetOpen} onSave={addMeal} />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        user={currentUser}
        online={online}
        pendingCount={readLocal(pendingKey, []).length}
        onSync={syncFromAccount}
        onSignedIn={user => { setCurrentUser(user); setAuthOpen(false); sync(); setNotice("登录成功，正在同步记录"); }}
        onSignedOut={() => { setCurrentUser(null); setAuthOpen(false); setSyncStatus(""); setNotice("已退出这台设备，手机里的记录仍然保留"); }}
      />
      <CalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} meals={meals} onAddFor={d => { setPrefill({ date: d }); setSheetOpen(true); }} />
      <MealDetailDialog meal={detailMeal} onClose={() => setDetailMeal(null)} onDelete={deleteMeal} />
      <FoodEditDialog editing={editingFood} onClose={() => setEditingFood(null)} onSave={saveFood} onDelete={deleteFood} />
      <InfoDialog info={info} onClose={() => setInfo(null)} />
    </div>
  );
}

function AuthDialog({ open, onOpenChange, onSignedIn, onSignedOut, onSync, user, online, pendingCount }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => { if (open) setMessage(""); }, [open, user]);
  const logout = async () => {
    setSigningOut(true);
    setMessage("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setSigningOut(false);
    if (error) { setMessage(`退出失败：${error.message}`); return; }
    onSignedOut();
  };
  const login = async e => {
    e.preventDefault();
    setMessage("正在登录…");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message || "";
      if (/email not confirmed/i.test(msg)) setMessage("邮箱还没验证，请先打开邮箱里的确认链接");
      else if (/invalid login/i.test(msg)) setMessage("邮箱或密码不对，再检查一下");
      else setMessage(`登录失败：${msg}`);
    } else { setMessage(""); onSignedIn(data.user); }
  };
  const signup = async () => {
    if (!/.+@.+\..+/.test(email)) { setMessage("请先填写正确的邮箱地址"); return; }
    if (password.length < 6) { setMessage("密码至少要 6 位"); return; }
    setMessage("正在创建家庭账号…");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const msg = error.message || "";
      if (/already registered|already been registered/i.test(msg)) setMessage("这个邮箱已经注册过了，直接登录即可");
      else if (/anonymous/i.test(msg)) setMessage("请先填写邮箱和密码再注册");
      else if (/signups? not allowed|disabled/i.test(msg)) setMessage("注册暂时未开放，请联系管理员");
      else if (/rate limit|too many/i.test(msg)) setMessage("操作太频繁了，请过几分钟再试");
      else setMessage(`注册失败：${msg}`);
      return;
    }
    // 有些配置下重复注册不报错，但返回的用户没有身份信息
    if (data?.user && data.user.identities?.length === 0) { setMessage("这个邮箱已经注册过了，直接登录即可"); return; }
    setMessage(data?.session ? "注册成功，已自动登录" : "注册成功！请打开邮箱里的确认链接，然后回来登录。");
    if (data?.session) onSignedIn(data.session.user);
  };
  if (user) return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="auth-card account-card">
          <Dialog.Close className="icon-button auth-close" aria-label="关闭"><X size={18} /></Dialog.Close>
          <div className="account-mark"><Baby size={25} /></div>
          <div className="account-status"><i />家庭账号已登录</div>
          <Dialog.Title>账号与同步</Dialog.Title>
          <Dialog.Description>你和家人使用同一账号，就能看到 Elnaz 的相同记录。</Dialog.Description>
          <div className="account-details">
            <div><Mail size={17} /><span><small>当前账号</small><b>{user.email || "家庭账号"}</b></span></div>
            <div><RefreshCw size={17} /><span><small>同步状态</small><b>{online ? (pendingCount ? `${pendingCount} 条记录等待同步` : "已联网，会自动同步") : "当前离线，联网后自动同步"}</b></span></div>
          </div>
          <button className="save-button" type="button" onClick={onSync} disabled={!online}><RefreshCw size={17} />{online ? "立即同步" : "当前处于离线状态"}</button>
          <button className="logout-button" type="button" onClick={logout} disabled={signingOut}><LogOut size={17} />{signingOut ? "正在退出…" : "退出这台设备"}</button>
          <p className="account-hint">只会退出当前设备，不会让家人的手机退出；本机已有记录也不会删除。</p>
          <p className="auth-message">{message}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="auth-card">
          <Dialog.Close className="icon-button auth-close" aria-label="关闭"><X size={18} /></Dialog.Close>
          <img src="/assets/baby-avatar.png" alt="" />
          <Dialog.Title>欢迎来到宝贝食光</Dialog.Title>
          <Dialog.Description>登录后，你和家人可以随时同步 Elnaz 的辅食记录。</Dialog.Description>
          <form onSubmit={login}>
            <label>邮箱<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>密码<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
            <button className="save-button" type="submit">登录</button>
            <button className="signup-link" type="button" onClick={signup}>第一次使用？创建家庭账号</button>
            <p className="auth-message">{message}</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { App };

import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { chooseActiveBaby, chooseActiveFamily, formatInviteCode, normalizeInviteCode, recordScope, scopedStorageKey } from "./familyScope.js";
import { languages, normalizeLocale, translate } from "./i18n.js";
import { policyLocale, privacyPolicies, PRIVACY_EFFECTIVE_DATE, PRIVACY_VERSION } from "./privacy.js";
import {
  Activity, AlertTriangle, ArrowUp, Baby, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight,
  ClipboardList, Copy, Download, Home, ImagePlus, Images, KeyRound, Languages, Library, LogOut, Mail, Pencil, Plus, RefreshCw, Settings, Share2, ShieldCheck, Sparkles, Sprout, Trash2, UserPlus, UserRound, Users, X,
} from "lucide-react";

const supabase = createClient("https://vqxzrydqnlpxyjafjdoh.supabase.co", "sb_publishable_Pn-dEaqu0oWYJ8eK8OgUAg_PPORfQFF");

/* ---------- 存储 ---------- */
const mealsKey = "baby-meals-all-v3";
const pendingKey = "baby-meals-pending-v2";
const pendingUpdatesKey = "baby-meals-updates-v1";
const legacyCacheKey = "baby-meals-cache-v2";
const planKey = "baby-plan-v1";
const planDeletesKey = "baby-plan-deletes-v1";
const customFoodsKey = "baby-custom-foods-v1";
const avatarKey = "elnaz-avatar-local-v1";
const birthKey = "elnaz-birthdate-v1";
const babyNameKey = "baby-name-v1";

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
const foodsForMeal = meal => {
  if (!meal) return [];
  if (Array.isArray(meal.foods) && meal.foods.length) return [...new Set(meal.foods.map(String).map(x => x.trim()).filter(Boolean))];
  const single = typeof meal === "string" ? meal : meal.food;
  return single ? [String(single).trim()].filter(Boolean) : [];
};
const mealFoodLabel = meal => foodsForMeal(meal).join("、") || meal?.food || "餐食";

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

function FoodIllustrations({ meal, foods, size = 56, className = "" }) {
  const items = (foods?.length ? foods : foodsForMeal(meal)).slice(0, 4);
  if (items.length <= 1) return <FoodPhoto food={items[0] || meal?.food || "餐食"} size={size} />;
  return (
    <span className={`food-illustrations food-count-${items.length} ${className}`} aria-label={items.join("、")}>
      {items.map(food => <FoodPhoto key={food} food={food} size={size} />)}
      {(foods?.length || foodsForMeal(meal).length) > 4 && <i>+{(foods?.length || foodsForMeal(meal).length) - 4}</i>}
    </span>
  );
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
const uploadMealPhoto = async (familyId, babyId, meal) => {
  if (!meal.photo_preview) return meal.photo_path || null;
  const safeId = String(meal.id || `meal-${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, "");
  const path = meal.photo_path || `${familyId}/${babyId}/${safeId}.webp`;
  const blob = await dataUrlToBlob(meal.photo_preview);
  const { error } = await supabase.storage.from("meal-photos").upload(path, blob, {
    contentType: "image/webp", cacheControl: "3600", upsert: true,
  });
  if (error) throw error;
  return path;
};

function Header({ online, status, signedIn, avatar, babyName, onAvatar, onCalendar, birth, onProfileEdit, onSyncTap, onTopTap }) {
  const preciseAge = ageLabel(birth);
  return (
    <header className="baby-header" onClick={e => {
      if (!e.target.closest("button,input,label,[role='button']")) onTopTap?.();
    }}>
      <label className="avatar-editor" aria-label={`更换 ${babyName} 的头像`}>
        <img className="baby-avatar" src={avatar} alt={`${babyName} 的头像`} />
        <span><Camera size={13} /></span>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatar} />
      </label>
      <div className="baby-identity" role="button" tabIndex={0} onClick={onProfileEdit} onKeyDown={e => e.key === "Enter" && onProfileEdit()} aria-label="编辑宝宝姓名和出生日期">
        <div>
          <strong>{babyName}</strong>
          <span>{preciseAge}</span>
          <i className="profile-edit-mark"><Pencil size={11} /></i>
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

function BabyProfileDialog({ open, onOpenChange, babyName, birth, onSave }) {
  const [name, setName] = useState(babyName);
  const [birthDate, setBirthDate] = useState(birth);
  useEffect(() => {
    if (open) { setName(babyName); setBirthDate(birth); }
  }, [open, babyName, birth]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="auth-card baby-profile-card">
          <Dialog.Close className="icon-button auth-close" aria-label="关闭"><X size={18} /></Dialog.Close>
          <div className="account-mark"><Baby size={25} /></div>
          <Dialog.Title>宝宝资料</Dialog.Title>
          <Dialog.Description>姓名和出生日期会用于月龄计算，并同步给家人。</Dialog.Description>
          <form onSubmit={e => { e.preventDefault(); if (name.trim() && birthDate) onSave({ name: name.trim(), birth: birthDate }); }}>
            <label>宝宝姓名<input value={name} onChange={e => setName(e.target.value)} maxLength={40} autoComplete="off" required /></label>
            <label>出生日期<input type="date" value={birthDate} max={todayKey()} onChange={e => setBirthDate(e.target.value)} required /></label>
            <button className="save-button" type="submit"><Check size={18} />保存宝宝资料</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
              ? <div className="meal-photo-thumb"><img src={meal.photo_preview} alt={`${mealFoodLabel(meal)}的餐食照片`} /><Sparkles size={12} /></div>
              : <FoodIllustrations meal={meal} />}
            <div className="meal-copy">
              <h3>{mealFoodLabel(meal)}</h3>
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

function AddMealDialog({ open, prefill, onOpenChange, onSave, babyName }) {
  const editingMeal = prefill?.meal || null;
  const [foods, setFoods] = useState([]);
  const [foodQuery, setFoodQuery] = useState("");
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
      setFoods(foodsForMeal(editingMeal || prefill));
      setFoodQuery("");
      setFoodPickerOpen(false);
      setAmount(editingMeal?.amount_grams ?? prefill?.amount ?? 30);
      setDate(editingMeal ? dayKeyOf(editingMeal.eaten_at) : (prefill?.date || todayKey()));
      setTime(editingMeal ? fmtTime(editingMeal.eaten_at) : nowHHMM());
      setReaction(editingMeal?.reaction || "很喜欢");
      setBody(editingMeal?.note || "无异常");
      setSource(editingMeal?.food_source || "自己制作");
      setRemarks(editingMeal?.remarks || "");
      setPhoto(editingMeal?.photo_preview || null);
      setPhotoBusy(false);
    }
  }, [open, prefill]);
  const foodOptions = useMemo(() => {
    const query = foodQuery.trim().toLocaleLowerCase();
    if (!query) return mergedLibrary.slice(0, 60);
    return mergedLibrary.filter(item => `${item.name} ${item.fr || ""}`.toLocaleLowerCase().includes(query)).slice(0, 60);
  }, [foodQuery, open]);
  const toggleFood = name => {
    setFoods(current => current.includes(name) ? current.filter(food => food !== name) : [...current, name]);
    setFoodQuery("");
    setFoodPickerOpen(true);
  };
  const addTypedFood = () => {
    const name = foodQuery.trim();
    if (!name) return;
    setFoods(current => current.includes(name) ? current : [...current, name]);
    setFoodQuery("");
    setFoodPickerOpen(true);
  };
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
              <Dialog.Title>{editingMeal ? "编辑这餐" : "记录一餐"}</Dialog.Title>
              <Dialog.Description>{editingMeal ? "修改后会同步更新这条餐食记录。" : "几步就能记好，常用选项已为你准备。"}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          <form onSubmit={e => {
            e.preventDefault();
            const typed = foodQuery.trim();
            const finalFoods = typed && !foods.includes(typed) ? [...foods, typed] : foods;
            if (!finalFoods.length || photoBusy) return;
            onSave({ food: finalFoods.join("、"), foods: finalFoods, amount_grams: Number(amount) || 0, date, time, reaction, note: body, food_source: source, remarks: remarks.trim(), photo_preview: photo }, editingMeal);
          }}>
            {babyName && <div className="record-baby-banner"><Baby size={17} /><span>这条记录属于</span><b>{babyName}</b></div>}
            <div className="food-field">
              <label htmlFor="meal-food">吃了什么 <small>可多选</small></label>
              {foods.length > 0 && (
                <div className="selected-foods" aria-label={`已选择 ${foods.length} 种食物`}>
                  {foods.map(food => (
                    <button type="button" key={food} onClick={() => setFoods(current => current.filter(item => item !== food))} aria-label={`移除${food}`}>
                      <span>{emojiFor(food)}</span>{food}<X size={13} />
                    </button>
                  ))}
                </div>
              )}
              <div className="food-input-wrap">
                <input
                  id="meal-food"
                  value={foodQuery}
                  onChange={e => { setFoodQuery(e.target.value); setFoodPickerOpen(true); }}
                  onFocus={() => setFoodPickerOpen(true)}
                  onKeyDown={e => { if (e.key === "Enter" && foodQuery.trim()) { e.preventDefault(); addTypedFood(); } }}
                  placeholder={foods.length ? "继续搜索并添加食物" : "搜索或输入食物名"}
                  autoComplete="off"
                />
                <button
                  className="food-picker-toggle"
                  type="button"
                  aria-label="打开食物选择列表"
                  aria-expanded={foodPickerOpen}
                  onClick={() => setFoodPickerOpen(value => !value)}
                ><ChevronDown size={18} /></button>
                {foodPickerOpen && (
                  <div className="food-picker-menu" role="listbox" aria-multiselectable="true" aria-label="选择一种或多种食物">
                    {foodOptions.length ? foodOptions.map(item => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={foods.includes(item.name)}
                        key={`${item.baseName || item.name}-${item.name}`}
                        onClick={() => toggleFood(item.name)}
                      >
                        <span>{item.emoji || "🥣"}</span>
                        <b>{item.name}</b>
                        <small>{foods.includes(item.name) ? "已选择 ✓" : item.fr || "点击添加"}</small>
                      </button>
                    )) : <p>没有找到，可以把输入内容作为新食物添加</p>}
                    {foodQuery.trim() && !foods.includes(foodQuery.trim()) && (
                      <button type="button" className="add-typed-food" onClick={addTypedFood}>
                        <span>＋</span><b>添加“{foodQuery.trim()}”</b><small>自定义食物</small>
                      </button>
                    )}
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
            <button className="save-button" type="submit" disabled={photoBusy}><Check size={19} />{photoBusy ? "正在准备照片…" : editingMeal ? "保存修改" : "保存这餐"}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MealDetailDialog({ meal, onClose, onDelete, onEdit, babyName }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <>
      <Dialog.Root open={!!meal} onOpenChange={v => !v && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="meal-sheet">
          <div className="sheet-grabber" />
          {meal && <>
            <div className="sheet-head detail-sheet-head">
              <div className="detail-title-wrap">
                <FoodIllustrations meal={meal} size={34} className="detail-food-stack" />
                <div>
                  <Dialog.Title>{mealFoodLabel(meal)}</Dialog.Title>
                  <Dialog.Description>{fmtDateCN(dayKeyOf(meal.eaten_at))} {fmtTime(meal.eaten_at)}</Dialog.Description>
                </div>
              </div>
              <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
            </div>
            <div className={`detail-body ${meal.photo_preview ? "has-meal-photo" : "no-meal-photo"}`}>
              {!meal.photo_preview && <FoodIllustrations meal={meal} size={58} className="detail-food-illustrations" />}
              {meal.photo_preview && (
                <button className="meal-detail-photo-button" onClick={() => setViewerOpen(true)} aria-label={`打开${meal.food}的照片`}>
                  <img className="meal-detail-photo" src={meal.photo_preview} alt={`${meal.food}的餐食照片`} />
                  <span>查看大图</span>
                </button>
              )}
              <ul>
                <li><span>分量</span><b>{meal.amount_grams} 克</b></li>
                <li><span>喜欢程度</span><b>{meal.reaction}</b></li>
                <li><span>身体反应</span><b>{meal.note || "无异常"}</b></li>
                {meal.food_source && <li><span>食物来源</span><b>{meal.food_source}</b></li>}
              </ul>
              {meal.remarks && <div className="detail-remarks"><span>备注</span><p>{meal.remarks}</p></div>}
            </div>
            <button className="edit-meal-button" onClick={() => onEdit(meal)}><Pencil size={17} />编辑这条记录</button>
            <button className="danger-button" onClick={() => { if (confirm(`删除这条「${meal.food}」记录？`)) onDelete(meal); }}>
              <Trash2 size={17} />删除这条记录
            </button>
          </>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <PhotoViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} meal={meal} babyName={babyName} />
    </>
  );
}

const photoFilename = (meal, babyName) => {
  const date = meal?.eaten_at ? dayKeyOf(meal.eaten_at) : todayKey();
  const food = String(meal?.food || "餐食").replace(/[\\/:*?"<>|]/g, "-");
  return `${babyName}-${date}-${food}.webp`;
};

async function saveMealPhoto(meal, babyName) {
  const blob = await dataUrlToBlob(meal.photo_preview);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = photoFilename(meal, babyName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PhotoViewerDialog({ open, onOpenChange, meal, babyName }) {
  const [message, setMessage] = useState("");
  useEffect(() => { if (open) setMessage(""); }, [open]);
  if (!meal?.photo_preview) return null;

  const sharePhoto = async () => {
    try {
      const blob = await dataUrlToBlob(meal.photo_preview);
      const file = new File([blob], photoFilename(meal, babyName), { type: blob.type || "image/webp" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${meal.food} · ${babyName} 的辅食记录`,
          text: `${fmtDateCN(dayKeyOf(meal.eaten_at))} ${fmtTime(meal.eaten_at)}`,
        });
      } else {
        await saveMealPhoto(meal, babyName);
        setMessage("当前浏览器不支持图片分享，已改为保存照片");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setMessage("暂时无法分享，请使用保存照片");
    }
  };

  const savePhoto = async () => {
    try {
      await saveMealPhoto(meal, babyName);
      setMessage("照片已开始保存");
    } catch {
      setMessage("保存失败，请长按照片保存");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="photo-viewer-overlay" />
        <Dialog.Content className="photo-viewer">
          <Dialog.Title className="sr-only">{meal.food}的餐食照片</Dialog.Title>
          <Dialog.Description className="sr-only">查看、分享或保存这张餐食照片</Dialog.Description>
          <div className="photo-viewer-head">
            <div><b>{meal.food}</b><small>{fmtDateCN(dayKeyOf(meal.eaten_at))} · {fmtTime(meal.eaten_at)}</small></div>
            <Dialog.Close aria-label="关闭照片"><X size={22} /></Dialog.Close>
          </div>
          <div className="photo-viewer-stage">
            <img src={meal.photo_preview} alt={`${meal.food}的原始餐食照片`} />
          </div>
          <div className="photo-viewer-actions">
            <button onClick={sharePhoto}><Share2 size={19} /><span>分享照片</span></button>
            <button onClick={savePhoto}><Download size={19} /><span>保存照片</span></button>
          </div>
          <p className="photo-viewer-message" aria-live="polite">{message || "也可以长按照片使用手机菜单"}</p>
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
                  <FoodIllustrations meal={m} size={30} className="calendar-card-foods" />
                  <span>{mealFoodLabel(m)}</span>
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
function LibraryView({ library, months, tried, onRecord, onPlan, onEdit, onAdd, hiddenCount, onRestoreHidden, babyName }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("全部");
  const [ageFilter, setAgeFilter] = useState("fit");
  const ageFilters = [
    { value: "fit", label: `适合 ${babyName}` },
    { value: "4–6个月", label: "4–6月" },
    { value: "6–8个月", label: "6–8月" },
    { value: "8–12个月", label: "8–12月" },
    { value: "12个月+", label: "12月+" },
    { value: "all", label: "全部月龄" },
  ];
  const stages = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = library.filter(f =>
      (cat === "全部" || (f.cat || "其他") === cat)
      && (ageFilter === "all"
        || (ageFilter === "fit" ? f.months <= months || Boolean(f.tryMonths && f.tryMonths <= months) : f.stage === ageFilter))
      && (!q || f.name.toLowerCase().includes(q) || (f.fr || "").toLowerCase().includes(q)));
    const groups = [];
    filtered.forEach(f => {
      let g = groups.find(x => x.stage === f.stage);
      if (!g) { g = { stage: f.stage, foods: [] }; groups.push(g); }
      g.foods.push(f);
    });
    return groups;
  }, [library, query, cat, ageFilter, months]);
  return (
    <div className="page">
      <h1 className="page-title">食物库</h1>
      <p className="page-sub">按法国辅食添加对照表整理，{babyName} 现在 {months} 个月。</p>
      <div className="lib-toolbar">
        <input className="search-input" placeholder="搜索食物（中文或法语）…" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="add-food-button" onClick={onAdd}><Plus size={17} />添加食物</button>
      </div>
      {hiddenCount > 0 && (
        <button className="restore-hidden-button" onClick={onRestoreHidden}>恢复隐藏的内置食物（{hiddenCount}）</button>
      )}
      <div className="cat-chips">
        {["全部", ...FOOD_CATS].map(c => (
          <button key={c} className={cat === c ? "selected" : ""} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <div className="age-filter-row">
        <span className="age-filter-label">推荐月龄</span>
        <div className="age-chips" role="group" aria-label="按推荐月龄筛选">
          {ageFilters.map(option => (
            <button key={option.value} className={ageFilter === option.value ? "selected" : ""} aria-pressed={ageFilter === option.value} onClick={() => setAgeFilter(option.value)}>{option.label}</button>
          ))}
        </div>
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
      {stages.length === 0 && <p className="empty-hint">{query.trim() ? `当前筛选下没有找到「${query.trim()}」` : "当前分类和月龄下没有食物"}，试试“全部月龄”或其他分类。</p>}
    </div>
  );
}

function PlanView({ plan, onRecord, onRemove, babyName }) {
  return (
    <div className="page">
      <h1 className="page-title">尝试计划</h1>
      <p className="page-sub">想给 {babyName} 试的新食物，都放在这里。</p>
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
                  : <FoodIllustrations key={m.id} meal={m} size={17} className="calendar-food-stack" />)}
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
                : <FoodIllustrations meal={m} size={36} className="calendar-card-foods" />}
              <span className="calendar-meal-copy"><b>{mealFoodLabel(m)}</b><small><em>{m.amount_grams}克</em>{m.reaction}</small></span>
              <ChevronRight size={16} />
            </button>
          ))}
      </div>
    </section>
  );
}

function PhotoWallDialog({ open, onOpenChange, meals, onOpenMeal, babyName }) {
  const [viewerMeal, setViewerMeal] = useState(null);
  const photos = useMemo(
    () => meals.filter(meal => meal.photo_preview).sort((a, b) => new Date(b.eaten_at) - new Date(a.eaten_at)),
    [meals],
  );
  return (
    <>
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet photo-wall-sheet">
          <div className="sheet-grabber" />
          <div className="sheet-head">
            <div>
              <Dialog.Title>{babyName} 的餐食照片</Dialog.Title>
              <Dialog.Description>{photos.length ? `共 ${photos.length} 张 · 上下滑动查看全部照片` : "以后记录的餐食照片会收藏在这里"}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button"><X size={20} /></Dialog.Close>
          </div>
          <div className="photo-wall-scroll">
            {photos.length ? (
              <div className="photo-wall-grid">
                {photos.map(meal => (
                  <button key={meal.id} onClick={() => setViewerMeal(meal)} aria-label={`打开${meal.food}的照片`}>
                    <img src={meal.photo_preview} alt={`${meal.food}的餐食照片`} />
                    <span><b>{meal.food}</b><small>{fmtDateCN(dayKeyOf(meal.eaten_at)).replace(" · ", " ")} · {fmtTime(meal.eaten_at)}</small></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="photo-wall-empty"><span><Images size={28} /></span><b>照片墙还是空的</b><p>记录一餐时添加照片，就能慢慢收集 {babyName} 的辅食回忆。</p></div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <PhotoViewerDialog open={!!viewerMeal} onOpenChange={value => !value && setViewerMeal(null)} meal={viewerMeal} babyName={babyName} />
    </>
  );
}

function GrowthView({ meals, onOpenMeal, onAddFor, babyName }) {
  const [photoWallOpen, setPhotoWallOpen] = useState(false);
  const stats = useMemo(() => {
    const days = new Set(meals.map(m => dayKeyOf(m.eaten_at)));
    const foods = new Map();
    meals.forEach(m => foodsForMeal(m).forEach(food => foods.set(food, (foods.get(food) || 0) + 1)));
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
      <PhotoWallDialog open={photoWallOpen} onOpenChange={setPhotoWallOpen} meals={meals} onOpenMeal={onOpenMeal} babyName={babyName} />
    </div>
  );
}

const friendlyFamilyError = error => {
  const message = String(error?.message || error || "");
  const code = String(error?.code || "");
  if (message.includes("already_family_member")) return "这个邮箱已经是家庭成员了";
  if (message.includes("invitation_exists")) return "这个邮箱已经有一份待接受的邀请";
  if (message.includes("invitation_code_invalid")) return "邀请码不正确，请检查后重新输入";
  if (message.includes("invitation_not_pending")) return "这个邀请码已经使用或已被新的邀请码替换";
  if (message.includes("invitation_expired")) return "邀请已经过期，请让家人重新生成";
  if (message.includes("invitation_email_mismatch")) return "请使用收到邀请的邮箱登录";
  if (message.includes("owner_must_transfer")) return "所有者需要先转让家庭，或删除家庭";
  if (message.includes("permission") || message.includes("owner_required")) return "你没有执行这个操作的权限";
  if (code === "42804") return "家庭成员资料格式不兼容，请关闭页面后重新打开";
  if (code.startsWith("PGRST")) return `家庭服务正在更新，请稍后重试（${code}）`;
  return code ? `操作没有完成（错误代码 ${code}），请稍后重试` : "操作没有完成，请检查网络后重试";
};

function FamilyOnboarding({ user, inviteToken, onCreate, onAcceptInvite, onAcceptCode, onOpenAuth, onOpenPrivacy, busy, message, locale }) {
  const [familyName, setFamilyName] = useState("我们的家庭");
  const [inviteName, setInviteName] = useState("");
  const [inviteRelationship, setInviteRelationship] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const t = key => translate(locale, key);
  useEffect(() => {
    if (!inviteToken || !user) return;
    setInviteName(user.user_metadata?.display_name || "");
    setInviteRelationship(user.user_metadata?.relationship || "");
  }, [inviteToken, user?.id]);
  return (
    <div className="family-gate">
      <div className="family-gate-card">
        <div className="account-mark"><Home size={27} /></div>
        <h1>宝贝食光</h1>
        <p>{t("createOrJoin")}</p>
        {!user ? (
          <button className="save-button" onClick={onOpenAuth}><Mail size={17} />登录或注册</button>
        ) : <>
          <section className="join-code-card">
            <div className="invite-gate-title"><KeyRound size={20} /><span><b>用邀请码加入家庭</b><small>输入家人发给你的 12 位邀请码，加入后会直接看到家庭和宝宝。</small></span></div>
            <input aria-label="家庭邀请码" inputMode="text" autoCapitalize="characters" autoCorrect="off" value={joinCode} onChange={e => setJoinCode(formatInviteCode(e.target.value))} placeholder="例如：A1B2-C3D4-E5F6" maxLength={14} />
            <button onClick={() => onAcceptCode(joinCode)} disabled={busy || normalizeInviteCode(joinCode).length !== 12}>{busy ? "正在加入…" : "加入这个家庭"}</button>
          </section>
          {inviteToken && (
            <section className="invite-gate-card">
              <div className="invite-gate-title"><UserPlus size={20} /><span><b>{t("joinFamily")}</b><small>加入前确认你在家庭中显示的资料。</small></span></div>
              <div className="invite-profile-grid">
                <label>你的称呼<input value={inviteName} onChange={e => setInviteName(e.target.value)} maxLength={60} placeholder="例如：Sara" required /></label>
                <label>家庭身份<input value={inviteRelationship} onChange={e => setInviteRelationship(e.target.value)} maxLength={40} placeholder="例如：妈妈" required /></label>
              </div>
              <button onClick={() => onAcceptInvite({ displayName: inviteName.trim(), relationship: inviteRelationship.trim() })} disabled={busy || !inviteName.trim() || !inviteRelationship.trim()}>{busy ? "正在加入…" : "确认并加入家庭"}</button>
            </section>
          )}
          <form onSubmit={e => { e.preventDefault(); onCreate(familyName); }}>
            <label>家庭名称<input value={familyName} onChange={e => setFamilyName(e.target.value)} maxLength={80} required /></label>
            <button className="save-button" disabled={busy}><Home size={17} />{busy ? "正在创建…" : t("createFamily")}</button>
          </form>
          <button className="secondary-button" onClick={onOpenAuth}><Settings size={16} />查看账号</button>
        </>}
        <button className="gate-privacy-link" type="button" onClick={onOpenPrivacy}>隐私政策 · Politique de confidentialité · Privacy Policy</button>
        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
}

function BabyManagerDialog({ open, onOpenChange, family, role, babies, activeBaby, locale, onSwitch, onSave, onDelete, onMove }) {
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmName, setConfirmName] = useState("");
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("unspecified");
  const [notes, setNotes] = useState("");
  const [copyPlan, setCopyPlan] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const canManage = role === "owner" || role === "admin";
  const t = key => translate(locale, key);
  useEffect(() => {
    if (!editing) return;
    const baby = editing === "new" ? null : editing;
    setNickname(baby?.nickname || ""); setBirthDate(baby?.birth_date || "");
    setGender(baby?.gender || "unspecified"); setNotes(baby?.notes || ""); setCopyPlan(false); setAvatarFile(null);
  }, [editing]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="meal-sheet baby-manager-sheet">
          <div className="sheet-grabber" />
          <div className="sheet-head"><div><Dialog.Title>{t("manageBabies")}</Dialog.Title><Dialog.Description>{family?.name || "家庭"} · 每个宝宝的数据完全独立</Dialog.Description></div><Dialog.Close className="icon-button"><X size={20} /></Dialog.Close></div>
          {!editing && !deleteTarget && <>
            <div className="baby-manager-list">
              {babies.map((baby, index) => (
                <article className={baby.id === activeBaby?.id ? "active" : ""} key={baby.id}>
                  <button className="baby-switch-main" onClick={() => onSwitch(baby)}>
                    <img src={baby.avatar_url || "/assets/baby-avatar.png"} alt="" />
                    <span><b>{baby.nickname}</b><small>{baby.birth_date ? ageLabel(baby.birth_date) : "未填写出生日期"}{baby.id === activeBaby?.id ? " · 当前宝宝" : ""}</small></span>
                    {baby.id === activeBaby?.id && <Check size={18} />}
                  </button>
                  <div className="baby-row-actions">
                    {canManage && <button onClick={() => setEditing(baby)}><Pencil size={14} />编辑</button>}
                    {canManage && <button disabled={index === 0} onClick={() => onMove(baby, -1)}>↑</button>}
                    {canManage && <button disabled={index === babies.length - 1} onClick={() => onMove(baby, 1)}>↓</button>}
                    {role === "owner" && <button className="danger-text" onClick={() => { setDeleteTarget(baby); setConfirmName(""); }}><Trash2 size={14} />删除</button>}
                  </div>
                </article>
              ))}
              {!babies.length && <div className="empty-babies"><Baby size={30} /><b>{t("noBaby")}</b><p>添加第一个宝宝后即可开始记录。</p></div>}
            </div>
            {canManage && <button className="save-button" onClick={() => setEditing("new")}><Plus size={18} />{t("addBaby")}</button>}
          </>}
          {editing && (
            <form className="baby-form" onSubmit={e => { e.preventDefault(); onSave({ id: editing === "new" ? null : editing.id, nickname: nickname.trim(), birth_date: birthDate || null, gender: gender === "unspecified" ? null : gender, notes: notes.trim() || null, copyPlan, avatarFile }); setEditing(null); }}>
              <p className="form-guidance">{t("useNickname")}</p>
              <label>{t("babyNickname")}<input value={nickname} onChange={e => setNickname(e.target.value)} maxLength={60} required /></label>
              <label>出生日期（可选）<input type="date" value={birthDate} max={todayKey()} onChange={e => setBirthDate(e.target.value)} /></label>
              <label>性别（可选）<select value={gender} onChange={e => setGender(e.target.value)}><option value="unspecified">不填写</option><option value="female">女宝宝</option><option value="male">男宝宝</option><option value="other">其他</option></select></label>
              <label>备注（可选）<textarea rows="3" maxLength="2000" value={notes} onChange={e => setNotes(e.target.value)} placeholder="例如：双胞胎中的姐姐、特别注意事项等" /></label>
              <label>头像（可选）<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setAvatarFile(e.target.files?.[0] || null)} /></label>
              {editing === "new" && babies.length > 0 && <label className="copy-plan-option"><input type="checkbox" checked={copyPlan} onChange={e => setCopyPlan(e.target.checked)} /><Copy size={16} /><span>复制上一位宝宝的基础计划<small>只复制食材计划，不复制实际餐食记录。</small></span></label>}
              <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>取消</button><button className="save-button">保存宝宝资料</button></div>
            </form>
          )}
          {deleteTarget && (
            <div className="destructive-confirm">
              <AlertTriangle size={28} />
              <h3>永久删除“{deleteTarget.nickname}”</h3>
              <p>将删除：餐食记录、身体反应、备注、照片、食材计划和提醒。此操作不可恢复，但不会影响家庭中的其他宝宝。</p>
              <label>请输入宝宝昵称确认<input value={confirmName} onChange={e => setConfirmName(e.target.value)} placeholder={deleteTarget.nickname} /></label>
              <div className="dialog-actions"><button className="secondary-button" onClick={() => setDeleteTarget(null)}>取消</button><button className="danger-button" disabled={confirmName !== deleteTarget.nickname} onClick={() => { onDelete(deleteTarget); setDeleteTarget(null); }}>永久删除</button></div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PrivacyPolicyDialog({ open, onOpenChange, locale }) {
  const [language, setLanguage] = useState(() => policyLocale(locale));
  useEffect(() => { if (open) setLanguage(policyLocale(locale)); }, [open, locale]);
  const policy = privacyPolicies[language];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay privacy-overlay" />
        <Dialog.Content className="privacy-sheet">
          <header className="privacy-head">
            <div><Dialog.Title>{policy.title}</Dialog.Title><Dialog.Description>{policy.effective}：{PRIVACY_EFFECTIVE_DATE} · {policy.version} {PRIVACY_VERSION}</Dialog.Description></div>
            <Dialog.Close className="icon-button" aria-label="关闭"><X size={20} /></Dialog.Close>
          </header>
          <div className="privacy-language" role="group" aria-label="Privacy policy language">
            {Object.entries(privacyPolicies).map(([code, item]) => <button key={code} className={language === code ? "active" : ""} onClick={() => setLanguage(code)}>{item.language}</button>)}
          </div>
          <div className="privacy-scroll">
            <p className="privacy-summary"><ShieldCheck size={20} />{policy.summary}</p>
            {policy.sections.map(section => <section key={section.title}>
              <h3>{section.title}</h3>
              {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
              {section.title.startsWith("6.") && <a href={policy.cnilUrl} target="_blank" rel="noreferrer">CNIL</a>}
            </section>)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FamilySettingsDialog({ open, onOpenChange, user, family, membership, memberships = [], locale, onLocale, onSwitchFamily, onReload, onSignedOut, onOpenPrivacy, onJoinByCode }) {
  const [members, setMembers] = useState([]);
  const [profileName, setProfileName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteExpires, setInviteExpires] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const role = membership?.role;
  const canManage = role === "owner" || role === "admin";
  const t = key => translate(locale, key);
  const loadMembers = async () => {
    if (!family?.id) return;
    const { data, error } = await supabase.rpc("list_family_members", { p_family_id: family.id });
    if (error) { setMessage(friendlyFamilyError(error)); return; }
    const nextMembers = data || [];
    setMembers(nextMembers);
    const mine = nextMembers.find(member => member.user_id === user?.id);
    setProfileName(mine?.display_name || user?.user_metadata?.display_name || "");
    setRelationship(mine?.relationship || user?.user_metadata?.relationship || "");
  };
  useEffect(() => { if (open) { setMessage(""); setInviteCode(""); setInviteExpires(""); setJoinCode(""); setFamilyName(family?.name || ""); loadMembers(); } }, [open, family?.id]);
  const saveProfile = async e => {
    e.preventDefault();
    const nextName = profileName.trim();
    const nextRelationship = relationship.trim();
    if (!nextName || !nextRelationship) { setMessage("请填写你的称呼和家庭身份"); return; }
    setBusy(true); setMessage("");
    const [{ error: profileError }, { error: authError }] = await Promise.all([
      supabase.rpc("update_my_family_profile", { p_family_id: family.id, p_display_name: nextName, p_relationship: nextRelationship }),
      supabase.auth.updateUser({ data: { display_name: nextName, relationship: nextRelationship } }),
    ]);
    setBusy(false);
    const error = profileError || authError;
    if (error) { setMessage(friendlyFamilyError(error)); return; }
    setMessage("个人资料已保存，家人会看到新的称呼和身份");
    await loadMembers();
  };
  const saveFamilyName = async e => {
    e.preventDefault();
    const nextName = familyName.trim();
    if (!nextName) { setMessage("请填写家庭名称"); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.from("families").update({ name: nextName, updated_at: new Date().toISOString() }).eq("id", family.id);
    setBusy(false);
    if (error) { setMessage(friendlyFamilyError(error)); return; }
    setMessage("家庭名称已修改");
    await onReload();
  };
  const invite = async () => {
    setBusy(true); setMessage("");
    const { data, error } = await supabase.rpc("create_family_invite_code", { p_family_id: family.id });
    setBusy(false);
    if (error) { setMessage(friendlyFamilyError(error)); return; }
    const created = data?.[0];
    setInviteCode(formatInviteCode(created?.invite_code));
    setInviteExpires(created?.expires_at || "");
    setMessage("新的家庭邀请码已生成；之前未使用的通用邀请码已自动失效");
  };
  const shareInviteCode = async () => {
    const text = `加入“${family.name}”的宝贝食光家庭\n邀请码：${inviteCode}\n打开：${location.origin}${location.pathname}\n登录自己的账号后，在“用邀请码加入家庭”中输入。`;
    if (navigator.share) {
      try { await navigator.share({ title: `${family.name} · 家庭邀请`, text }); return; } catch (error) { if (error?.name === "AbortError") return; }
    }
    await navigator.clipboard.writeText(text);
    setMessage("邀请文字已复制，可以发给家人了");
  };
  const joinByCode = async e => {
    e.preventDefault();
    if (normalizeInviteCode(joinCode).length !== 12) { setMessage("请输入完整的 12 位邀请码"); return; }
    setBusy(true); setMessage("");
    const result = await onJoinByCode(joinCode);
    setBusy(false);
    if (result?.error) setMessage(result.error);
    else onOpenChange(false);
  };
  const changeRole = async (member, nextRole) => {
    const { error } = await supabase.from("family_members").update({ role: nextRole }).eq("family_id", family.id).eq("user_id", member.user_id);
    if (error) setMessage(friendlyFamilyError(error)); else loadMembers();
  };
  const removeMember = async member => {
    if (!confirm(`从家庭移除 ${member.display_name || member.email}？`)) return;
    const { error } = await supabase.from("family_members").delete().eq("family_id", family.id).eq("user_id", member.user_id);
    if (error) setMessage(friendlyFamilyError(error)); else loadMembers();
  };
  const transfer = async member => {
    if (!confirm(`将“${family.name}”的所有权转让给 ${member.display_name || member.email}？`)) return;
    const { error } = await supabase.rpc("transfer_family_ownership", { p_family_id: family.id, p_new_owner: member.user_id });
    if (error) setMessage(friendlyFamilyError(error)); else { setMessage("所有权已转让"); onReload(); loadMembers(); }
  };
  const leave = async () => {
    if (!confirm(`退出“${family.name}”？家庭数据不会被删除。`)) return;
    const { error } = await supabase.rpc("leave_family", { p_family_id: family.id });
    if (error) setMessage(friendlyFamilyError(error)); else { onOpenChange(false); onReload(); }
  };
  const invokeAction = async body => {
    const { data, error } = await supabase.functions.invoke("family-account-actions", { body });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data;
  };
  const deleteFamily = async () => {
    const typed = prompt(`此操作不可恢复。请输入家庭名称“${family.name}”确认：`);
    if (typed !== family.name || !confirm("最后确认：删除全部宝宝、记录、计划、提醒和照片？")) return;
    try { setBusy(true); await invokeAction({ action: "delete_family", family_id: family.id }); onOpenChange(false); onReload(); }
    catch (error) { setMessage(friendlyFamilyError(error)); } finally { setBusy(false); }
  };
  const deleteAccount = async () => {
    const typed = prompt(`删除账号不可恢复。请输入当前邮箱“${user.email}”确认：`);
    if (typed !== user.email || !confirm("最后确认删除账号？如果你是唯一所有者，也会删除该家庭全部数据。")) return;
    try { setBusy(true); await invokeAction({ action: "delete_account", delete_solo_families: true }); localStorage.clear(); onSignedOut(); }
    catch (error) {
      const raw = String(error.message || error);
      setMessage(raw.includes("transfer_required") ? "请先把家庭所有权转让给其他成员" : friendlyFamilyError(error));
    } finally { setBusy(false); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="meal-sheet family-settings-sheet">
        <div className="sheet-grabber" /><div className="sheet-head"><div><Dialog.Title>{t("familySettings")}</Dialog.Title><Dialog.Description>{family?.name} · 你的权限：{t(role || "member")}</Dialog.Description></div><Dialog.Close className="icon-button"><X size={20} /></Dialog.Close></div>
        {memberships.length > 1 && <section className="settings-section"><h3><Home size={17} />当前家庭</h3><select value={family.id} onChange={e => onSwitchFamily(e.target.value)}>{memberships.map(item => <option key={item.family_id} value={item.family_id}>{item.family?.name || "家庭"}</option>)}</select></section>}
        <section className="settings-section"><h3><UserRound size={17} />我的家庭资料</h3>
          <form className="settings-profile-form" onSubmit={saveProfile}>
            <label>我的称呼<input value={profileName} onChange={e => setProfileName(e.target.value)} maxLength={60} placeholder="例如：Wayo" required /></label>
            <label>家庭身份<input value={relationship} onChange={e => setRelationship(e.target.value)} maxLength={40} placeholder="例如：爸爸" required /></label>
            <button className="compact-save" disabled={busy}>保存我的资料</button>
          </form>
          <p className="settings-help">“爸爸/妈妈”是家庭身份；“所有者/管理员/成员”是操作权限，两者互不影响。</p>
        </section>
        <section className="settings-section"><h3><Home size={17} />家庭名称</h3>
          {canManage ? <form className="settings-inline-form" onSubmit={saveFamilyName}><input value={familyName} onChange={e => setFamilyName(e.target.value)} maxLength={80} required /><button disabled={busy}>修改</button></form> : <p className="settings-account-email">{family?.name}</p>}
          <p className="settings-help">这是全家共同看到的标题，例如“Elnaz 的家庭”，不是成员姓名。</p>
        </section>
        <section className="settings-section"><h3><Users size={17} />{t("familyMembers")}</h3>
          <div className="member-list">{members.map(member => <article key={member.user_id}><span className="member-avatar">{(member.display_name || member.email || "家")[0]}</span><div><b>{member.display_name || member.email}{member.user_id === user.id && <em className="you-tag">你</em>}</b><small>{member.relationship || "家庭成员"} · {t(member.role)}</small><small>{member.email}</small></div>{role === "owner" && member.role !== "owner" && <div className="member-actions"><select value={member.role} onChange={e => changeRole(member,e.target.value)}><option value="admin">{t("admin")}</option><option value="member">{t("member")}</option></select><button onClick={() => transfer(member)}>转让</button><button onClick={() => removeMember(member)}>移除</button></div>}</article>)}</div>
          {!members.length && <p className="settings-help">家庭成员资料正在加载；已加入的家人会显示在这里。</p>}
          {canManage && <div className="invite-code-create">
            <p>生成一个一次性家庭邀请码，只发给你信任的家人。邀请码 7 天有效，使用一次后失效。</p>
            {!inviteCode ? <button className="save-button" type="button" onClick={invite} disabled={busy}><KeyRound size={17} />{busy ? "正在生成…" : "生成家庭邀请码"}</button> : <div className="generated-code">
              <small>家庭邀请码</small><strong>{inviteCode}</strong><span>{inviteExpires ? `有效至 ${new Date(inviteExpires).toLocaleDateString("zh-CN")}` : "7 天内有效"}</span>
              <div><button type="button" onClick={async () => { await navigator.clipboard.writeText(inviteCode); setMessage("邀请码已复制"); }}><Copy size={15} />复制邀请码</button><button type="button" onClick={shareInviteCode}><Share2 size={15} />分享</button></div>
            </div>}
          </div>}
        </section>
        <section className="settings-section join-family-section"><h3><KeyRound size={17} />用邀请码加入另一个家庭</h3><p>如果家人已经建立了家庭，在这里输入对方发来的邀请码。成功后会自动切换过去，不会删除你现在的家庭。</p><form onSubmit={joinByCode}><input aria-label="家庭邀请码" inputMode="text" autoCapitalize="characters" autoCorrect="off" value={joinCode} onChange={e => setJoinCode(formatInviteCode(e.target.value))} placeholder="A1B2-C3D4-E5F6" maxLength={14} /><button disabled={busy || normalizeInviteCode(joinCode).length !== 12}>加入家庭</button></form></section>
        <section className="settings-section"><h3><Languages size={17} />语言</h3><select value={locale} onChange={e => onLocale(e.target.value)}>{languages.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}</select></section>
        <section className="settings-section"><h3><Mail size={17} />登录状态</h3><p className="settings-account-email">{user.email}</p><button className="logout-button" onClick={async () => { await supabase.auth.signOut({ scope: "local" }); onOpenChange(false); onSignedOut(); }}><LogOut size={16} />退出这台设备</button></section>
        <section className="settings-section privacy-settings"><h3><ShieldCheck size={17} />账户与隐私</h3><button type="button" onClick={onOpenPrivacy}><ShieldCheck size={16} />查看隐私政策</button><p>提供中文、法语和英语版本，包含数据用途、保存期限、家庭访问权限与用户权利。</p></section>
        <section className="settings-section danger-zone"><h3>删除与退出</h3>{role !== "owner" && <button onClick={leave}><LogOut size={16} />{t("leaveFamily")}</button>}{role === "owner" && <button onClick={deleteFamily} disabled={busy}><Trash2 size={16} />{t("deleteFamily")}</button>}<button onClick={deleteAccount} disabled={busy}><Trash2 size={16} />{t("deleteAccount")}</button><p>删除操作不可恢复。共享家庭数据是否保留，取决于你的家庭角色和所有权状态。</p></section>
        {message && <p className="auth-message">{message}</p>}
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
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
  const [babyName, setBabyName] = useState(() => localStorage.getItem(babyNameKey) || "Elnaz");
  const [birth, setBirth] = useState(() => localStorage.getItem(birthKey) || "2026-02-13");
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey) || "/assets/baby-avatar.png");
  const [tab, setTab] = useState("today");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailMeal, setDetailMeal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [sortBy, setSortBy] = useState("time");
  const [online, setOnline] = useState(navigator.onLine);
  const [notice, setNotice] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(true);
  const [memberships, setMemberships] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [activeFamily, setActiveFamily] = useState(null);
  const [babies, setBabies] = useState([]);
  const [activeBaby, setActiveBaby] = useState(null);
  const [babyManagerOpen, setBabyManagerOpen] = useState(false);
  const [familySettingsOpen, setFamilySettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(() => location.hash === "#privacy");
  const [familyGateMessage, setFamilyGateMessage] = useState("");
  const [familyBusy, setFamilyBusy] = useState(false);
  const [locale, setLocale] = useState(() => normalizeLocale(localStorage.getItem("baby-journal-locale")));
  const [showScrollTop, setShowScrollTop] = useState(false);
  const inviteToken = useMemo(() => new URLSearchParams(location.search).get("invite") || "", []);
  const openPrivacy = () => {
    history.replaceState(null, "", `${location.pathname}${location.search}#privacy`);
    setPrivacyOpen(true);
  };
  const changePrivacyOpen = value => {
    setPrivacyOpen(value);
    if (!value && location.hash === "#privacy") history.replaceState(null, "", `${location.pathname}${location.search}`);
  };

  useEffect(() => {
    const onHashChange = () => setPrivacyOpen(location.hash === "#privacy");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const scrollToTop = () => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const months = ageMonths(birth);
  const library = useMemo(() => mergeLibrary(customFoods), [customFoods]);
  const tried = useMemo(() => new Set(meals.flatMap(foodsForMeal)), [meals]);
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

  const cacheKey = (base, babyId = activeBaby?.id) => scopedStorageKey(base, babyId);
  const saveMeals = (next, babyId = activeBaby?.id) => { setMeals(next); writeLocal(cacheKey(mealsKey, babyId), next); };
  const savePlan = (next, babyId = activeBaby?.id) => { setPlan(next); writeLocal(cacheKey(planKey, babyId), next); };
  const saveCustomFoods = next => {
    setCustomFoods(next);
    try { writeLocal(cacheKey(customFoodsKey), next); } catch { setNotice("手机存储空间不够了，照片没能保存"); }
    if (navigator.onLine && currentUser?.id && activeFamily?.id && activeBaby?.id) {
      supabase.from("baby_foods").upsert({ family_id: activeFamily.id, baby_id: activeBaby.id, settings: next, updated_by: currentUser.id, updated_at: new Date().toISOString() }, { onConflict: "baby_id" })
        .then(({ error }) => { if (error) setNotice("食物库修改已保存在手机，稍后同步"); });
    }
  };
  const storeBabyProfile = ({ name, birth: birthDate }) => {
    setBabyName(name);
    setBirth(birthDate);
    localStorage.setItem(babyNameKey, name);
    localStorage.setItem(birthKey, birthDate);
  };
  const saveBabyProfile = async profile => {
    storeBabyProfile(profile);
    setProfileOpen(false);
    if (!navigator.onLine) { setNotice("宝宝资料已保存在手机，联网后同步"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setNotice("宝宝资料已保存在手机，登录后同步"); return; }
    if (!activeBaby?.id) return;
    const { data, error } = await supabase.from("babies").update({
      nickname: profile.name,
      birth_date: profile.birth || null,
      updated_at: new Date().toISOString(),
    }).eq("id", activeBaby.id).eq("family_id", activeFamily.id).select().single();
    if (data) {
      setBabies(current => current.map(baby => baby.id === data.id ? data : baby));
      setActiveBaby(data);
    }
    setNotice(error ? "宝宝资料已保存在手机，稍后自动同步" : "宝宝资料已同步给家人");
  };

  const activateBaby = async (baby, family = activeFamily, user = currentUser) => {
    if (!baby || !family) return;
    setActiveBaby(baby); setBabyName(baby.nickname); setBirth(baby.birth_date || "");
    localStorage.setItem(`active-baby-${user?.id || "local"}`, baby.id);
    const scopedMeals = readLocal(scopedStorageKey(mealsKey, baby.id), null);
    const scopedPlans = readLocal(scopedStorageKey(planKey, baby.id), null);
    const legacyMigrated = localStorage.getItem("baby-cache-scoped-v1") === "yes";
    const nextMeals = scopedMeals ?? (!legacyMigrated ? readLocal(mealsKey, []) : []);
    const nextPlan = scopedPlans ?? (!legacyMigrated ? readLocal(planKey, []) : []);
    if (!legacyMigrated) {
      writeLocal(scopedStorageKey(mealsKey, baby.id), nextMeals);
      writeLocal(scopedStorageKey(planKey, baby.id), nextPlan);
      localStorage.setItem("baby-cache-scoped-v1", "yes");
    }
    setMeals(nextMeals); setPlan(nextPlan);
    setCustomFoods(readLocal(scopedStorageKey(customFoodsKey, baby.id), readLocal(customFoodsKey, [])));
    setAvatar("/assets/baby-avatar.png");
    if (baby.avatar_path && navigator.onLine) {
      const { data: blob } = await supabase.storage.from("baby-avatars").download(baby.avatar_path);
      if (blob) setAvatar(URL.createObjectURL(blob));
    }
    if (user) await supabase.from("user_preferences").upsert({ user_id: user.id, active_family_id: family.id, active_baby_id: baby.id, locale, updated_at: new Date().toISOString() });
  };

  const loadFamilyContext = async (user = currentUser) => {
    setFamilyLoading(true);
    if (!user) {
      setMemberships([]); setActiveMembership(null); setActiveFamily(null); setBabies([]); setActiveBaby(null); setFamilyLoading(false); return null;
    }
    const [{ data: membershipRows, error: membershipError }, { data: preference }] = await Promise.all([
      supabase.from("family_members").select("family_id,role,relationship,joined_at,families!inner(id,name,owner_id,created_at,updated_at)").eq("user_id", user.id).order("joined_at"),
      supabase.from("user_preferences").select("active_family_id,active_baby_id,locale").eq("user_id", user.id).maybeSingle(),
    ]);
    if (membershipError) { setFamilyGateMessage("家庭资料暂时无法加载，请检查网络"); setFamilyLoading(false); return null; }
    const rows = (membershipRows || []).map(row => ({ ...row, family: Array.isArray(row.families) ? row.families[0] : row.families }));
    setMemberships(rows);
    if (preference?.locale) {
      const safeLocale = normalizeLocale(preference.locale);
      setLocale(safeLocale); localStorage.setItem("baby-journal-locale", safeLocale);
      if (safeLocale !== preference.locale) await supabase.from("user_preferences").update({ locale: safeLocale, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    }
    const chosenMembership = chooseActiveFamily(rows, preference?.active_family_id, localStorage.getItem(`active-family-${user.id}`));
    if (!chosenMembership) {
      setActiveMembership(null); setActiveFamily(null); setBabies([]); setActiveBaby(null); setFamilyLoading(false); return null;
    }
    const family = chosenMembership.family;
    setActiveMembership(chosenMembership); setActiveFamily(family); localStorage.setItem(`active-family-${user.id}`, family.id);
    const { data: babyRows, error: babyError } = await supabase.from("babies").select("*").eq("family_id", family.id).order("display_order").order("created_at");
    if (babyError) { setFamilyGateMessage("宝宝资料暂时无法加载"); setFamilyLoading(false); return null; }
    const nextBabies = babyRows || []; setBabies(nextBabies);
    const chosenBaby = chooseActiveBaby(nextBabies, preference?.active_baby_id, localStorage.getItem(`active-baby-${user.id}`));
    if (chosenBaby) await activateBaby(chosenBaby, family, user);
    else { setActiveBaby(null); setMeals([]); setPlan([]); }
    setFamilyLoading(false);
    return { family, baby: chosenBaby };
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

  /* --- 云同步：数据库查询和本地队列都锁定当前宝宝 --- */
  const sync = async (scopeFamily = activeFamily, scopeBaby = activeBaby) => {
    if (!navigator.onLine || !scopeFamily?.id || !scopeBaby?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const scope = recordScope(scopeFamily, scopeBaby, user.id);
      const pendingQueueKey = scopedStorageKey(pendingKey, scopeBaby.id);
      const updateQueueKey = scopedStorageKey(pendingUpdatesKey, scopeBaby.id);
      const deleteQueueKey = scopedStorageKey(planDeletesKey, scopeBaby.id);
      const localPlanKey = scopedStorageKey(planKey, scopeBaby.id);

      const localFoodSettings = readLocal(scopedStorageKey(customFoodsKey, scopeBaby.id), []);
      if (localFoodSettings.length) await supabase.from("baby_foods").upsert({ family_id: scope.family_id, baby_id: scope.baby_id, settings: localFoodSettings, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "baby_id" });
      const { data: cloudFoodSettings } = await supabase.from("baby_foods").select("settings").eq("family_id", scope.family_id).eq("baby_id", scope.baby_id).maybeSingle();
      if (cloudFoodSettings?.settings) {
        setCustomFoods(cloudFoodSettings.settings);
        writeLocal(scopedStorageKey(customFoodsKey, scopeBaby.id), cloudFoodSettings.settings);
      }

      // 先处理离线期间删除的计划，再上传本机计划，最后合并家庭云端计划。
      const queuedPlanDeletes = [...new Set(readLocal(deleteQueueKey, []))];
      const remainingPlanDeletes = [];
      for (const food of queuedPlanDeletes) {
        const { error } = await supabase.from("food_plans").delete().eq("family_id", scope.family_id).eq("baby_id", scope.baby_id).eq("food", food);
        if (error) remainingPlanDeletes.push(food);
      }
      if (remainingPlanDeletes.length) writeLocal(deleteQueueKey, remainingPlanDeletes);
      else localStorage.removeItem(deleteQueueKey);

      const localPlans = [...new Map(readLocal(localPlanKey, []).map(item => [item.food, item])).values()];
      const plansToUpload = localPlans.filter(item => String(item.id).startsWith("plan-"));
      let plansUploadSucceeded = true;
      if (plansToUpload.length) {
        const { error } = await supabase.from("food_plans").upsert(
          plansToUpload.map(item => ({ ...scope, food: item.food, amount: item.amount || null })),
          { onConflict: "baby_id,food" },
        );
        plansUploadSucceeded = !error;
      }
      const { data: cloudPlans } = await supabase.from("food_plans").select("id,food,amount,created_at").eq("family_id", scope.family_id).eq("baby_id", scope.baby_id).order("created_at");
      if (cloudPlans) {
        const deletedFoods = new Set(remainingPlanDeletes);
        const mergedPlans = new Map(plansToUpload.map(item => [item.food, item]));
        cloudPlans.filter(item => !deletedFoods.has(item.food)).forEach(item => mergedPlans.set(item.food, item));
        savePlan([...mergedPlans.values()], scopeBaby.id);
      }

      const pending = readLocal(pendingQueueKey, []);
      if (pending.length) {
        const rows = [];
        for (const pendingMeal of pending) {
          const photoPath = await uploadMealPhoto(scope.family_id, scope.baby_id, pendingMeal);
          const { id, localId, time, asset, photo_preview, ...m } = pendingMeal;
          rows.push({ ...m, ...scope, foods: foodsForMeal(m), photo_path: photoPath, emoji: foodsForMeal(m).map(emojiFor).join("") });
        }
        const { error } = await supabase.from("meals").insert(rows);
        if (!error) localStorage.removeItem(pendingQueueKey);
      }
      const pendingUpdates = readLocal(updateQueueKey, []);
      if (pendingUpdates.length) {
        const remainingUpdates = [];
        for (const queued of pendingUpdates) {
          try {
            let photoPath = queued.photo_path || null;
            if (queued.photo_changed) {
              if (queued.photo_preview) photoPath = await uploadMealPhoto(scope.family_id, scope.baby_id, { ...queued, photo_path: photoPath });
              else if (photoPath) {
                await supabase.storage.from("meal-photos").remove([photoPath]);
                photoPath = null;
              }
            }
            const { error } = await supabase.from("meals").update({
              food: queued.food, foods: foodsForMeal(queued), amount_grams: queued.amount_grams, eaten_at: queued.eaten_at,
              reaction: queued.reaction, note: queued.note, food_source: queued.food_source,
              remarks: queued.remarks, photo_path: photoPath, emoji: foodsForMeal(queued).map(emojiFor).join(""),
            }).eq("id", queued.id).eq("family_id", scope.family_id).eq("baby_id", scope.baby_id);
            if (error) remainingUpdates.push(queued);
          } catch { remainingUpdates.push(queued); }
        }
        if (remainingUpdates.length) writeLocal(updateQueueKey, remainingUpdates);
        else localStorage.removeItem(updateQueueKey);
      }
      const { data } = await supabase.from("meals").select("*").eq("family_id", scope.family_id).eq("baby_id", scope.baby_id).order("eaten_at");
      if (data) {
        const cachedMeals = new Map(readLocal(scopedStorageKey(mealsKey, scopeBaby.id), []).map(meal => [meal.id, meal]));
        const hydrated = await Promise.all(data.map(async meal => {
          if (!meal.photo_path) return meal;
          const cached = cachedMeals.get(meal.id)?.photo_preview;
          if (cached) return { ...meal, photo_preview: cached };
          const { data: photoBlob } = await supabase.storage.from("meal-photos").download(meal.photo_path);
          if (!photoBlob) return meal;
          try { return { ...meal, photo_preview: await blobToDataUrl(photoBlob) }; }
          catch { return meal; }
        }));
        const stillPending = readLocal(pendingQueueKey, []);
        const stillUpdates = new Map(readLocal(updateQueueKey, []).map(meal => [meal.id, meal]));
        const merged = [
          ...hydrated.map(meal => stillUpdates.has(meal.id) ? { ...meal, ...stillUpdates.get(meal.id) } : meal),
          ...stillPending,
        ];
        saveMeals(merged, scopeBaby.id);
        setSyncStatus("爸妈已同步");
      }
    } catch { /* 网络异常时保持本地数据 */ }
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const user = data.session?.user || null;
      setCurrentUser(user);
      await loadFamilyContext(user);
      if (active) setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setCurrentUser(session?.user || null);
      if (event === "SIGNED_OUT") { setSyncStatus(""); loadFamilyContext(null); }
      if (event === "SIGNED_IN" && session?.user) setTimeout(async () => {
        const context = await loadFamilyContext(session.user);
        if (context?.baby) sync(context.family, context.baby);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const on = () => { setOnline(true); sync(); setNotice("已恢复网络，记录已同步"); };
    const off = () => { setOnline(false); setNotice("已进入离线模式，记录会稍后同步"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (activeFamily && activeBaby) sync(activeFamily, activeBaby);
  }, [activeFamily?.id, activeBaby?.id]);

  /* --- 记一餐 --- */
  const removePlansByFood = async (foodNames, { quiet = false } = {}) => {
    const names = [...new Set(foodNames.filter(Boolean))];
    savePlan(plan.filter(p => !names.includes(p.food)));
    const deleteQueueKey = cacheKey(planDeletesKey);
    const queueDelete = () => writeLocal(deleteQueueKey, [...new Set([...readLocal(deleteQueueKey, []), ...names])]);
    if (!navigator.onLine) {
      queueDelete();
      if (!quiet) setNotice("已从计划移除，联网后会同步给家人");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeFamily?.id || !activeBaby?.id) {
      queueDelete();
      if (!quiet) setNotice("已从本机计划移除，登录后会同步");
      return;
    }
    let failed = false;
    for (const food of names) {
      const { error } = await supabase.from("food_plans").delete().eq("family_id", activeFamily.id).eq("baby_id", activeBaby.id).eq("food", food);
      if (error) failed = true;
    }
    if (failed) queueDelete();
    else {
      const remaining = readLocal(deleteQueueKey, []).filter(food => !names.includes(food));
      if (remaining.length) writeLocal(deleteQueueKey, remaining);
      else localStorage.removeItem(deleteQueueKey);
    }
    if (!quiet) setNotice(failed ? "已从计划移除，稍后自动同步" : "已从计划移除并同步给家人");
  };
  const removePlan = (item, options) => removePlansByFood([item.food], options);

  const addMeal = async record => {
    if (!activeFamily?.id || !activeBaby?.id) { setNotice("请先选择宝宝"); return; }
    const local = {
      food: record.food, foods: record.foods, amount_grams: record.amount_grams, reaction: record.reaction, note: record.note,
      food_source: record.food_source, remarks: record.remarks, photo_preview: record.photo_preview || null,
      id: `local-${Date.now()}`, eaten_at: isoFor(record.date || todayKey(), record.time),
    };
    saveMeals([...meals, local]);
    setSheetOpen(false);
    const plannedFoods = plan.filter(item => record.foods.includes(item.food)).map(item => item.food);
    if (plannedFoods.length) await removePlansByFood(plannedFoods, { quiet: true });
    const queueKey = cacheKey(pendingKey);
    const queue = () => writeLocal(queueKey, [...readLocal(queueKey, []), local]);
    if (!navigator.onLine) { queue(); setNotice("已离线保存，联网后自动同步"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { queue(); setNotice("已保存在本机，登录后可与家人同步"); return; }
    const scope = recordScope(activeFamily, activeBaby, user.id);
    try { local.photo_path = await uploadMealPhoto(scope.family_id, scope.baby_id, local); }
    catch { queue(); setNotice("记录已保存在手机，照片会稍后自动同步"); return; }
    const { error } = await supabase.from("meals").insert({
      ...scope, food: local.food, foods: local.foods, amount_grams: local.amount_grams,
      eaten_at: local.eaten_at, reaction: local.reaction, note: local.note,
      food_source: local.food_source, remarks: local.remarks, photo_path: local.photo_path, emoji: local.foods.map(emojiFor).join(""),
    });
    if (error) { queue(); setNotice("已保存在本机，稍后自动重试"); } else { setNotice("这一餐已同步给家人"); sync(activeFamily, activeBaby); }
  };

  const updateMeal = async (record, original) => {
    const photoChanged = (record.photo_preview || null) !== (original.photo_preview || null);
    const updated = {
      ...original,
      food: record.food,
      foods: record.foods,
      amount_grams: record.amount_grams,
      reaction: record.reaction,
      note: record.note,
      food_source: record.food_source,
      remarks: record.remarks,
      photo_preview: record.photo_preview || null,
      photo_path: photoChanged && !record.photo_preview ? null : (original.photo_path || null),
      eaten_at: isoFor(record.date || dayKeyOf(original.eaten_at), record.time),
    };
    saveMeals(meals.map(meal => meal.id === original.id ? updated : meal));
    setSheetOpen(false);
    setPrefill(null);

    if (String(original.id).startsWith("local-")) {
      const queueKey = cacheKey(pendingKey);
      const queued = readLocal(queueKey, []);
      writeLocal(queueKey, queued.map(meal => meal.id === original.id ? updated : meal));
      setNotice("记录已更新，登录联网后会同步");
      return;
    }

    const queueUpdate = () => {
      const queueKey = cacheKey(pendingUpdatesKey);
      const queue = readLocal(queueKey, []).filter(meal => meal.id !== original.id);
      writeLocal(queueKey, [...queue, { ...updated, photo_changed: photoChanged }]);
    };
    if (!navigator.onLine) { queueUpdate(); setNotice("修改已离线保存，联网后自动同步"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { queueUpdate(); setNotice("修改已保存在本机，登录后同步"); return; }

    try {
      let photoPath = original.photo_path || null;
      if (photoChanged) {
        if (updated.photo_preview) photoPath = await uploadMealPhoto(activeFamily.id, activeBaby.id, { ...updated, photo_path: photoPath });
        else if (photoPath) {
          await supabase.storage.from("meal-photos").remove([photoPath]);
          photoPath = null;
        }
      }
      const { error } = await supabase.from("meals").update({
        food: updated.food, foods: updated.foods, amount_grams: updated.amount_grams, eaten_at: updated.eaten_at,
        reaction: updated.reaction, note: updated.note, food_source: updated.food_source,
        remarks: updated.remarks, photo_path: photoPath, emoji: updated.foods.map(emojiFor).join(""),
      }).eq("id", original.id).eq("family_id", activeFamily.id).eq("baby_id", activeBaby.id);
      if (error) throw error;
      if (photoPath !== updated.photo_path) saveMeals(meals.map(meal => meal.id === original.id ? { ...updated, photo_path: photoPath } : meal));
      setNotice("这条记录已更新并同步给家人");
    } catch {
      queueUpdate();
      setNotice("修改已保存在手机，稍后自动同步");
    }
  };

  const deleteMeal = async meal => {
    saveMeals(meals.filter(m => m.id !== meal.id));
    const pendingQueueKey = cacheKey(pendingKey);
    const updateQueueKey = cacheKey(pendingUpdatesKey);
    writeLocal(pendingQueueKey, readLocal(pendingQueueKey, []).filter(m => m.id !== meal.id));
    writeLocal(updateQueueKey, readLocal(updateQueueKey, []).filter(m => m.id !== meal.id));
    setDetailMeal(null);
    if (!String(meal.id).startsWith("local-") && navigator.onLine) {
      await supabase.from("meals").delete().eq("id", meal.id).eq("family_id", activeFamily.id).eq("baby_id", activeBaby.id);
      if (meal.photo_path) await supabase.storage.from("meal-photos").remove([meal.photo_path]);
    } else if (meal.photo_path && navigator.onLine) {
      await supabase.storage.from("meal-photos").remove([meal.photo_path]);
    }
    setNotice("已删除这条记录");
  };

  /* --- 计划 --- */
  const addToPlan = async food => {
    if (!activeFamily?.id || !activeBaby?.id) { setNotice("请先选择宝宝"); return; }
    if (plan.some(p => p.food === food.name)) { setNotice(`「${food.name}」已经在计划里了`); return; }
    const localItem = { id: `plan-${Date.now()}`, food: food.name, amount: food.amount };
    savePlan([...plan, localItem]);
    if (!navigator.onLine) { setNotice(`已把「${food.name}」加入计划，联网后同步`); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setNotice(`已把「${food.name}」加入本机计划，登录后同步`); return; }
    const { error } = await supabase.from("food_plans").upsert(
      { ...recordScope(activeFamily, activeBaby, user.id), food: food.name, amount: food.amount || null },
      { onConflict: "baby_id,food" },
    );
    if (error) setNotice(`已把「${food.name}」加入计划，稍后自动同步`);
    else { setNotice(`已把「${food.name}」加入计划并同步给家人`); sync(activeFamily, activeBaby); }
  };

  const syncTap = async () => {
    if (currentUser && activeFamily) setFamilySettingsOpen(true);
    else setAuthOpen(true);
  };

  const syncFromAccount = async () => {
    if (!navigator.onLine) { setNotice("现在离线，联网后会自动同步"); return; }
    setNotice("正在同步…");
    await sync();
    setNotice("已和家人同步");
  };

  const createFamily = async name => {
    setFamilyBusy(true); setFamilyGateMessage("");
    const { error } = await supabase.rpc("create_family", { p_name: name.trim() });
    if (error) setFamilyGateMessage(friendlyFamilyError(error));
    else await loadFamilyContext(currentUser);
    setFamilyBusy(false);
  };

  const acceptInvite = async ({ displayName, relationship } = {}) => {
    if (!inviteToken) return;
    setFamilyBusy(true); setFamilyGateMessage("");
    const { error } = await supabase.rpc("accept_family_invitation", { p_token: inviteToken, p_display_name: displayName, p_relationship: relationship });
    if (error) setFamilyGateMessage(friendlyFamilyError(error));
    else {
      history.replaceState({}, "", location.pathname);
      await loadFamilyContext(currentUser);
      setNotice("已加入家庭");
    }
    setFamilyBusy(false);
  };

  const acceptInviteCode = async code => {
    const normalized = normalizeInviteCode(code);
    if (normalized.length !== 12) {
      const error = "请输入完整的 12 位家庭邀请码";
      setFamilyGateMessage(error); setNotice(error);
      return { error };
    }
    setFamilyBusy(true); setFamilyGateMessage("");
    const { error } = await supabase.rpc("accept_family_invite_code", { p_code: normalized });
    if (error) {
      const friendly = friendlyFamilyError(error);
      setFamilyGateMessage(friendly); setNotice(friendly); setFamilyBusy(false);
      return { error: friendly };
    }
    setFamilySettingsOpen(false);
    await loadFamilyContext(currentUser);
    setNotice("已加入家人的家庭，宝宝资料正在同步");
    setFamilyBusy(false);
    return { ok: true };
  };

  const switchBaby = async baby => {
    setDetailMeal(null); setSheetOpen(false); setPrefill(null);
    await activateBaby(baby, activeFamily, currentUser);
    setBabyManagerOpen(false);
  };

  const uploadManagedAvatar = async (baby, file) => {
    if (!file) return baby;
    const { blob } = await prepareAvatar(file);
    const path = `${activeFamily.id}/${baby.id}/avatar.webp`;
    const { error: uploadError } = await supabase.storage.from("baby-avatars").upload(path, blob, { contentType: "image/webp", upsert: true });
    if (uploadError) throw uploadError;
    const { data, error } = await supabase.from("babies").update({ avatar_path: path, updated_at: new Date().toISOString() }).eq("id", baby.id).eq("family_id", activeFamily.id).select().single();
    if (error) throw error;
    return data;
  };

  const saveManagedBaby = async values => {
    if (!activeFamily?.id || !currentUser?.id) return;
    setFamilyBusy(true);
    const payload = { nickname: values.nickname, birth_date: values.birth_date, gender: values.gender, notes: values.notes, updated_at: new Date().toISOString() };
    if (values.id) {
      const { data, error } = await supabase.from("babies").update(payload).eq("id", values.id).eq("family_id", activeFamily.id).select().single();
      if (error) setNotice(friendlyFamilyError(error));
      else {
        const saved = await uploadManagedAvatar(data, values.avatarFile);
        setBabies(current => current.map(item => item.id === saved.id ? saved : item));
        if (activeBaby?.id === saved.id) await activateBaby(saved, activeFamily, currentUser);
        setNotice("宝宝资料已更新");
      }
    } else {
      const { data, error } = await supabase.from("babies").insert({ ...payload, family_id: activeFamily.id, created_by: currentUser.id, display_order: babies.length }).select().single();
      if (error) setNotice(friendlyFamilyError(error));
      else {
        const saved = await uploadManagedAvatar(data, values.avatarFile);
        if (values.copyPlan && activeBaby?.id) {
          const { data: sourcePlans } = await supabase.from("food_plans").select("food,amount").eq("family_id", activeFamily.id).eq("baby_id", activeBaby.id);
          if (sourcePlans?.length) await supabase.from("food_plans").upsert(sourcePlans.map(item => ({ family_id: activeFamily.id, baby_id: saved.id, user_id: currentUser.id, ...item })), { onConflict: "baby_id,food" });
        }
        setBabies(current => [...current, saved]);
        await activateBaby(saved, activeFamily, currentUser);
        setNotice(values.copyPlan ? "宝宝已添加，基础计划已复制" : "宝宝已添加");
      }
    }
    setFamilyBusy(false);
  };

  const deleteManagedBaby = async baby => {
    setFamilyBusy(true);
    const { data, error } = await supabase.functions.invoke("family-account-actions", { body: { action: "delete_baby", family_id: activeFamily.id, baby_id: baby.id } });
    if (error || data?.error) setNotice(friendlyFamilyError(data?.error || error));
    else {
      const remaining = babies.filter(item => item.id !== baby.id);
      setBabies(remaining);
      if (activeBaby?.id === baby.id) {
        if (remaining[0]) await activateBaby(remaining[0], activeFamily, currentUser);
        else { setActiveBaby(null); setMeals([]); setPlan([]); setAvatar("/assets/baby-avatar.png"); }
      }
      setNotice(`已删除 ${baby.nickname}，其他宝宝不受影响`);
    }
    setFamilyBusy(false);
  };

  const moveManagedBaby = async (baby, direction) => {
    const index = babies.findIndex(item => item.id === baby.id);
    const other = babies[index + direction];
    if (!other) return;
    const reordered = [...babies]; [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    setBabies(reordered);
    await Promise.all(reordered.map((item, display_order) => supabase.from("babies").update({ display_order }).eq("id", item.id).eq("family_id", activeFamily.id)));
  };

  const changeLocale = async nextLocale => {
    setLocale(nextLocale); localStorage.setItem("baby-journal-locale", nextLocale);
    if (currentUser) await supabase.from("user_preferences").upsert({ user_id: currentUser.id, active_family_id: activeFamily?.id || null, active_baby_id: activeBaby?.id || null, locale: nextLocale, updated_at: new Date().toISOString() });
  };

  const switchFamily = async familyId => {
    if (!currentUser) return;
    localStorage.setItem(`active-family-${currentUser.id}`, familyId);
    await supabase.from("user_preferences").upsert({ user_id: currentUser.id, active_family_id: familyId, active_baby_id: null, locale, updated_at: new Date().toISOString() });
    setFamilySettingsOpen(false);
    await loadFamilyContext(currentUser);
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
      if (!activeFamily?.id || !activeBaby?.id) throw new Error("missing_baby_scope");
      const path = `${activeFamily.id}/${activeBaby.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage.from("baby-avatars").upload(path, blob, { contentType: "image/webp", upsert: true });
      if (uploadError) throw uploadError;
      const { data: savedBaby, error: profileError } = await supabase.from("babies").update({ avatar_path: path, updated_at: new Date().toISOString() })
        .eq("id", activeBaby.id).eq("family_id", activeFamily.id).select().single();
      if (profileError) throw profileError;
      if (savedBaby) { setActiveBaby(savedBaby); setBabies(current => current.map(item => item.id === savedBaby.id ? savedBaby : item)); }
      setNotice(`${babyName} 的头像已同步给家人`);
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
      `${babyName} 现在 ${months} 个月，还没有记录过${recommend.name}，正适合尝试。建议分量 ${recommend.amount}，第一次选在上午，方便白天观察反应。`,
    ],
  };

  if (!authReady || familyLoading) return <div className="family-gate"><div className="family-gate-card"><RefreshCw className="spin" /><p>正在安全加载家庭资料…</p></div></div>;

  if (!currentUser || !activeFamily) return <>
    <FamilyOnboarding user={currentUser} inviteToken={inviteToken} onCreate={createFamily} onAcceptInvite={acceptInvite} onAcceptCode={acceptInviteCode} onOpenAuth={() => setAuthOpen(true)} onOpenPrivacy={openPrivacy} busy={familyBusy} message={familyGateMessage} locale={locale} />
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} user={currentUser} online={online} pendingCount={0} babyName={babyName} birth={birth} onOpenPrivacy={openPrivacy}
      onProfilePrepared={() => {}} onSync={() => {}} onSignedIn={async user => { setCurrentUser(user); setAuthOpen(false); await loadFamilyContext(user); }}
      onSignedOut={() => { setCurrentUser(null); setAuthOpen(false); }} />
    <PrivacyPolicyDialog open={privacyOpen} onOpenChange={changePrivacyOpen} locale={locale} />
  </>;

  if (!activeBaby) return <>
    <div className="family-gate"><div className="family-gate-card"><div className="account-mark"><Baby size={28} /></div><h1>{activeFamily.name}</h1><h2>家庭里还没有宝宝</h2><p>添加第一个宝宝后，就可以开始记录辅食。昵称必填，出生日期、性别、头像和备注都可以稍后补充。</p><button className="save-button" onClick={() => setBabyManagerOpen(true)}><Plus size={18} />添加宝宝</button><button className="secondary-button" onClick={() => setFamilySettingsOpen(true)}><Settings size={17} />家庭与账户</button></div></div>
    <BabyManagerDialog open={babyManagerOpen} onOpenChange={setBabyManagerOpen} family={activeFamily} role={activeMembership?.role} babies={babies} activeBaby={activeBaby} locale={locale} onSwitch={switchBaby} onSave={saveManagedBaby} onDelete={deleteManagedBaby} onMove={moveManagedBaby} />
    <FamilySettingsDialog open={familySettingsOpen} onOpenChange={setFamilySettingsOpen} user={currentUser} family={activeFamily} membership={activeMembership} memberships={memberships} locale={locale} onLocale={changeLocale} onSwitchFamily={switchFamily} onReload={() => loadFamilyContext(currentUser)} onSignedOut={() => supabase.auth.signOut({ scope: "local" })} onOpenPrivacy={openPrivacy} onJoinByCode={acceptInviteCode} />
    <PrivacyPolicyDialog open={privacyOpen} onOpenChange={changePrivacyOpen} locale={locale} />
  </>;

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
              online={online} status={syncStatus} signedIn={!!currentUser} avatar={avatar} babyName={babyName} onAvatar={changeAvatar}
              onCalendar={() => setCalendarOpen(true)} birth={birth} onSyncTap={syncTap}
              onTopTap={scrollToTop}
              onProfileEdit={() => setBabyManagerOpen(true)}
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
          {tab === "library" && <LibraryView library={library} months={months} tried={tried} onRecord={openRecord} onPlan={addToPlan} onEdit={f => setEditingFood({ mode: "edit", food: f })} onAdd={() => setEditingFood({ mode: "add" })} hiddenCount={customFoods.filter(c => c.hidden).length} onRestoreHidden={restoreHiddenFoods} babyName={babyName} />}
          {tab === "plan" && <PlanView plan={plan} onRecord={openRecord} onRemove={removePlan} babyName={babyName} />}
          {tab === "growth" && <GrowthView meals={meals} onOpenMeal={setDetailMeal} onAddFor={d => { setPrefill({ date: d }); setSheetOpen(true); }} babyName={babyName} />}
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
      <AddMealDialog
        open={sheetOpen}
        babyName={babyName}
        prefill={prefill}
        onOpenChange={value => { setSheetOpen(value); if (!value) setPrefill(null); }}
        onSave={(record, original) => original ? updateMeal(record, original) : addMeal(record)}
      />
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        user={currentUser}
        online={online}
        pendingCount={readLocal(cacheKey(pendingKey), []).length}
        babyName={babyName}
        birth={birth}
        onOpenPrivacy={openPrivacy}
        onProfilePrepared={storeBabyProfile}
        onSync={syncFromAccount}
        onSignedIn={async user => { setCurrentUser(user); setAuthOpen(false); const context = await loadFamilyContext(user); if (context?.baby) sync(context.family, context.baby); setNotice("登录成功，正在同步记录"); }}
        onSignedOut={() => { setCurrentUser(null); setAuthOpen(false); setSyncStatus(""); setNotice("已退出这台设备，手机里的记录仍然保留"); }}
      />
      <CalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} meals={meals} onAddFor={d => { setPrefill({ date: d }); setSheetOpen(true); }} />
      <MealDetailDialog
        meal={detailMeal}
        onClose={() => setDetailMeal(null)}
        onDelete={deleteMeal}
        onEdit={meal => { setDetailMeal(null); setPrefill({ meal }); setSheetOpen(true); }}
        babyName={babyName}
      />
      <BabyProfileDialog open={profileOpen} onOpenChange={setProfileOpen} babyName={babyName} birth={birth} onSave={saveBabyProfile} />
      <BabyManagerDialog open={babyManagerOpen} onOpenChange={setBabyManagerOpen} family={activeFamily} role={activeMembership?.role} babies={babies} activeBaby={activeBaby} locale={locale} onSwitch={switchBaby} onSave={saveManagedBaby} onDelete={deleteManagedBaby} onMove={moveManagedBaby} />
      <FamilySettingsDialog open={familySettingsOpen} onOpenChange={setFamilySettingsOpen} user={currentUser} family={activeFamily} membership={activeMembership} memberships={memberships} locale={locale} onLocale={changeLocale} onSwitchFamily={switchFamily} onReload={() => loadFamilyContext(currentUser)} onSignedOut={() => supabase.auth.signOut({ scope: "local" })} onOpenPrivacy={openPrivacy} onJoinByCode={acceptInviteCode} />
      <PrivacyPolicyDialog open={privacyOpen} onOpenChange={changePrivacyOpen} locale={locale} />
      <FoodEditDialog editing={editingFood} onClose={() => setEditingFood(null)} onSave={saveFood} onDelete={deleteFood} />
      <InfoDialog info={info} onClose={() => setInfo(null)} />
    </div>
  );
}

function AuthDialog({ open, onOpenChange, onSignedIn, onSignedOut, onSync, user, online, pendingCount, babyName, onOpenPrivacy }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signupMode, setSignupMode] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupRelationship, setSignupRelationship] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  useEffect(() => {
    if (open) {
      setMessage("");
      setSignupMode(false);
      setSignupName("");
      setSignupRelationship("");
      setPrivacyAccepted(false);
    }
  }, [open, user]);
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
  const signup = async e => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) { setMessage("请先填写正确的邮箱地址"); return; }
    if (password.length < 6) { setMessage("密码至少要 6 位"); return; }
    if (!signupName.trim()) { setMessage("请填写你的称呼"); return; }
    if (!signupRelationship.trim()) { setMessage("请填写你在家庭中的身份"); return; }
    if (!privacyAccepted) { setMessage("请先阅读隐私政策"); return; }
    setMessage("正在创建个人账号…");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}${location.pathname}${location.search}`,
        data: { display_name: signupName.trim(), relationship: signupRelationship.trim(), privacy_accepted: true, privacy_policy_version: PRIVACY_VERSION },
      },
    });
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
          <Dialog.Description>每位家长使用自己的账号，通过家庭邀请共同照顾 {babyName}。</Dialog.Description>
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
          <Dialog.Title>{signupMode ? "创建个人账号" : "欢迎来到宝贝食光"}</Dialog.Title>
          <Dialog.Description>{signupMode ? "每位家长创建自己的账号，之后再创建或加入家庭。" : `登录后，可通过家庭安全共享宝宝的辅食记录。`}</Dialog.Description>
          <form onSubmit={signupMode ? signup : login}>
            {signupMode && <div className="signup-profile-fields">
              <label>你的称呼<input value={signupName} onChange={e => setSignupName(e.target.value)} maxLength={60} autoComplete="name" placeholder="例如：Sara" required /></label>
              <label>家庭身份<input value={signupRelationship} onChange={e => setSignupRelationship(e.target.value)} maxLength={40} placeholder="例如：妈妈" required /></label>
            </div>}
            <label>邮箱<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
            <label>密码<input type="password" minLength="6" autoComplete={signupMode ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} required /></label>
            {signupMode && <div className="consent-block">
              <label className="consent-row"><input type="checkbox" checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} required /><span>我已阅读<button type="button" onClick={onOpenPrivacy}>《隐私政策》</button></span></label>
            </div>}
            <button className="save-button" type="submit">{signupMode ? "创建个人账号" : "登录"}</button>
            <button className="signup-link" type="button" onClick={() => { setSignupMode(value => !value); setMessage(""); }}>{signupMode ? "已有账号？返回登录" : "第一次使用？创建个人账号"}</button>
            {!signupMode && <button className="privacy-link" type="button" onClick={onOpenPrivacy}>隐私政策 · Politique de confidentialité · Privacy Policy</button>}
            <p className="auth-message">{message}</p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { App };

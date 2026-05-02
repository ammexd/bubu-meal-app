'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import emailjs from '@emailjs/browser';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import {
  pickMeal, storage, getRandomTip,
  type Meal, type TimeKey, type CountryKey,
} from './lib/foodBrain';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { id: 'ng', flag: '🇳🇬', name: 'Nigeria' },
  { id: 'za', flag: '🇿🇦', name: 'S. Africa' },
  { id: 'gh', flag: '🇬🇭', name: 'Ghana' },
  { id: 'us', flag: '🇺🇸', name: 'USA' },
  { id: 'gb', flag: '🇬🇧', name: 'UK' },
  { id: 'in', flag: '🇮🇳', name: 'India' },
  { id: 'jp', flag: '🇯🇵', name: 'Japan' },
  { id: 'mx', flag: '🇲🇽', name: 'Mexico' },
  { id: 'it', flag: '🇮🇹', name: 'Italy' },
  { id: 'cn', flag: '🇨🇳', name: 'China' },
  { id: 'br', flag: '🇧🇷', name: 'Brazil' },
  { id: 'eg', flag: '🇪🇬', name: 'Egypt' },
];

const VIBES = [
  { id: 'all',       icon: '💎', label: 'All Vibes'      },
  { id: 'sap',       icon: '💸', label: 'Sapa Trip'      },
  { id: 'nostalgic', icon: '🌅', label: 'Nostalgia'      },
  { id: 'everyday',  icon: '🏠', label: 'Everyday'       },
  { id: 'wow',       icon: '🤩', label: 'Wow Me'         },
  { id: 'healthy',   icon: '🥗', label: 'Eating Clean'   },
  { id: 'comfort',   icon: '🤗', label: 'Comfort'        },
  { id: 'light',     icon: '⚡', label: 'Light & Fresh'  },
  { id: 'indulgent', icon: '😋', label: 'Treat Yourself' },
];

const TIMES = [
  { id: 'breakfast', icon: '🌅', name: 'Breakfast', cal: '300–500' },
  { id: 'lunch',     icon: '☀️', name: 'Lunch',     cal: '500–800' },
  { id: 'dinner',    icon: '🌙', name: 'Dinner',    cal: '500–750' },
  { id: 'snack',     icon: '🍎', name: 'Snack',     cal: '100–250' },
];

const DIETS = ['All', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Low-Carb', 'Dairy-Free'];

const DAILY_CAL_GOAL = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LoggedMeal { name: string; cal: number; time: string; }
interface PlanFilters { country: string; vibe: string; diet: string; }

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function smartTime(): TimeKey {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}

function pct(val: number, max: number) { return Math.min(100, Math.round((val / max) * 100)); }

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function NourishSelectPage() {
  const router = useRouter();
  const weeklyExportRef = useRef<HTMLDivElement>(null);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [country, setCountry] = useState<CountryKey>('ng');
  const [vibe,    setVibe   ] = useState('all');
  const [time,    setTime   ] = useState<TimeKey>('lunch');
  const [diet,    setDiet   ] = useState('All');

  // ── Meal state ────────────────────────────────────────────────────────────
  const [meal,      setMeal     ] = useState<Meal | null>(null);
  const [mealImage, setMealImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop');
  const [loading,   setLoading  ] = useState(false);
  const [mealIn,    setMealIn   ] = useState(false);

  // ── Tracker state ─────────────────────────────────────────────────────────
  const [water,        setWater      ] = useState(0);
  const [streak,       setStreak     ] = useState(0);
  const [loggedMeals,  setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [totalCal,     setTotalCal   ] = useState(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [email,          setEmail         ] = useState('');
  const [emailSent,      setEmailSent     ] = useState(false);
  const [emailLoading,   setEmailLoading  ] = useState(false);
  const [darkMode,       setDarkMode      ] = useState(false);
  const [autoRefresh,    setAutoRefresh   ] = useState(false);
  const [showSettings,   setShowSettings  ] = useState(false);
  const [showPlanner,    setShowPlanner   ] = useState(false);
  const [showHistory,    setShowHistory   ] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); // 💎 Guard State
const [isSubscribed, setIsSubscribed] = useState(false);   // 💎 Subscription State
  const [weeklyPlan,     setWeeklyPlan    ] = useState<Record<string, Record<string, Meal>> | null>(null);
  const [planFilters,    setPlanFilters   ] = useState<PlanFilters | null>(null);
  const [toast,          setToast         ] = useState('');
  const [toastTimer,     setToastTimer    ] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [onboarded,      setOnboarded     ] = useState(true);
  const [waterHintShown, setWaterHintShown] = useState(true);

  // ── Hydration message ─────────────────────────────────────────────────────
  const waterMsg = ['Start your day right 💙', 'Good start!', 'Keep going 💪', '¼ there!',
                    'Halfway! ✨', 'More than half!', '¾ done!', 'Almost!', '🎉 Full hydration!'];

  // ─────────────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────────────
   useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. THE GUARD: Check login first and stop if failed
      const isLoggedIn = localStorage.getItem('bubu_logged_in') === 'true';
      if (!isLoggedIn) {
        router.push('/login');
        return; 
      }

      // 2. DEFINE DATA: Pull from storage so the variables exist for later steps
      const savedEmail = localStorage.getItem('bubu_email') || '';
      const savedWater = Number(localStorage.getItem('bubu_water') || 0);
      const savedSub = localStorage.getItem('bubu_subscribed') === 'true';
      const savedCountry = localStorage.getItem('bubu_country') as CountryKey | null;
      const savedTime = localStorage.getItem('bubu_time') as TimeKey | null;

      // 3. APPLY TO UI: Update your component states
      setEmail(savedEmail);
      setWater(savedWater);
      setIsSubscribed(savedSub);
      if (savedCountry) setCountry(savedCountry);
      if (savedTime) setTime(savedTime || smartTime());

      // 4. INTELLIGENT AUTO-REFRESH: Uses the 'saved' variables defined above
      if (localStorage.getItem('bubu_auto_refresh') === 'true') {
        setTimeout(() => {
          const lastMeal = storage.get('bubu_last_meal');
          const picked = pickMeal(
            savedCountry || 'ng', 
            savedTime || 'lunch', 
            'all', 
            'All', 
            lastMeal
          );
          if (picked) {
            setMeal(picked);
            storage.set('bubu_last_meal', picked.name);
          }
        }, 600);
      }

      // 5. THE MASTER KEY: Reveal the dashboard once loading is complete
      setIsCheckingAuth(false);
    }
  }, [router]);

  // ─────────────────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToast(''), 3000);
    setToastTimer(t);
  }, [toastTimer]);

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE ENGINE
  // ─────────────────────────────────────────────────────────────────────────
  const fetchMealImage = async (query: string) => {
    const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!key) return;
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food')}&orientation=landscape&per_page=1`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      const data = await res.json();
      const url = data?.results?.[0]?.urls?.regular;
      if (url) setMealImage(url);
    } catch { /* keep existing image */ }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SPIN MEAL
  // ─────────────────────────────────────────────────────────────────────────
  const spinMeal = async () => {
    setLoading(true);
    setMealIn(false);
    const lastMeal = storage.get('bubu_last_meal');
    const picked = pickMeal(country, time, vibe, diet, lastMeal);
    if (picked) {
      setMeal(picked);
      storage.set('bubu_last_meal', picked.name);
      await fetchMealImage(picked.unsplashQuery || picked.name);
      setTimeout(() => setMealIn(true), 50);
    }
    if (!onboarded) {
      setOnboarded(true);
      localStorage.setItem('bubu_onboarded', 'true');
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOG MEAL
  // ─────────────────────────────────────────────────────────────────────────
  const logMeal = () => {
    if (!meal) return;
    const entry: LoggedMeal = { name: meal.name, cal: meal.nutrition.calories, time };
    const updated = [...loggedMeals, entry];
    const newTotal = totalCal + meal.nutrition.calories;
    setLoggedMeals(updated);
    setTotalCal(newTotal);
    localStorage.setItem('bubu_logged_meals', JSON.stringify(updated));
    localStorage.setItem('bubu_cal_date', new Date().toDateString());
    showToast(`✅ ${meal.name} logged — ${meal.nutrition.calories} kcal`);
    if (newTotal >= DAILY_CAL_GOAL) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
    }
  };

  const removeLoggedMeal = (i: number) => {
    const updated = loggedMeals.filter((_, idx) => idx !== i);
    const newTotal = updated.reduce((s, m) => s + m.cal, 0);
    setLoggedMeals(updated);
    setTotalCal(newTotal);
    localStorage.setItem('bubu_logged_meals', JSON.stringify(updated));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WATER
  // ─────────────────────────────────────────────────────────────────────────
  const logGlass = (i: number) => {
    const next = i < water ? i : i + 1;
    setWater(next);
    localStorage.setItem('bubu_water', String(next));
    if (!waterHintShown) {
      setWaterHintShown(true);
      localStorage.setItem('bubu_water_hint_shown', 'true');
    }
    if (next === 8) confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EMAIL
  // ─────────────────────────────────────────────────────────────────────────
  const sendEmail = async () => {
    if (!meal || !email) { showToast('⚠️ Spin a meal & enter your email first!'); return; }
    setEmailLoading(true);
    try {
      const res = await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        {
          to_email:     email,
          meal_name:    meal.name,
          meal_desc:    meal.description,
          meal_cal:     meal.nutrition.calories,
          meal_protein: meal.nutrition.protein,
          meal_carbs:   meal.nutrition.carbs,
          meal_fat:     meal.nutrition.fat,
          healthy_tip:  getRandomTip(),
        },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      );
      if (res.status === 200) {
        setEmailSent(true);
        showToast('📬 Meal sent to your inbox!');
        setTimeout(() => setEmailSent(false), 5000);
      }
    } catch (e: any) {
      showToast(`❌ Send failed — ${e?.text || 'check console'}`);
      console.error('EmailJS:', e);
    }
    setEmailLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // WEEKLY PLANNER
  // ─────────────────────────────────────────────────────────────────────────
  const generateWeeklyPlan = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const times: TimeKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const plan: Record<string, Record<string, Meal>> = {};
    days.forEach(day => {
      plan[day] = {};
      times.forEach(t => {
        const picked = pickMeal(country, t, vibe, diet, null);
        if (picked) plan[day][t] = picked;
      });
    });
    setWeeklyPlan(plan);
    localStorage.setItem('bubu_weekly_plan', JSON.stringify(plan));

    // Save the filters used so we can detect drift later
    const filters: PlanFilters = { country, vibe, diet };
    setPlanFilters(filters);
    localStorage.setItem('bubu_plan_filters', JSON.stringify(filters));

    showToast('📅 Weekly plan generated!');
  };

  const downloadWeeklyPlan = async () => {
    const el = weeklyExportRef.current;
    if (!weeklyPlan || !el) return;
    try {
      await new Promise(r => setTimeout(r, 400));
      const url = await toPng(el, { quality: 1, pixelRatio: 2, cacheBust: true, backgroundColor: '#F8FAFC' });
      const a = document.createElement('a');
      a.download = `BuBu-Meal-Plan-${new Date().toLocaleDateString()}.png`;
      a.href = url;
      a.click();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch { showToast('Export failed — try again'); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────
  const saveSettings = () => {
    localStorage.setItem('bubu_email', email);
    localStorage.setItem('bubu_country', country);
    localStorage.setItem('bubu_time', time);
    localStorage.setItem('bubu_auto_refresh', String(autoRefresh));
    localStorage.setItem('bubu_dark_mode', String(darkMode));
    setShowSettings(false);
    showToast('✅ Settings saved!');
  };

  const logout = () => { localStorage.removeItem('bubu_logged_in'); router.push('/login'); };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────────────────────────────────
  const dk = darkMode;
  const bg          = dk ? 'bg-[#0D0A06]'                : 'bg-[#FBF6EE]';
  const txt         = dk ? 'text-white'                   : 'text-[#1C1008]';
  const card        = dk ? 'bg-[#1A1208] border-white/5'  : 'bg-white border-[#E8E2D2]';
  const sub         = dk ? 'text-white/40'                : 'text-[#A67C52]';
  const input       = dk ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                         : 'bg-[#FDF9F0] border-[#E8E2D2] text-[#1C1008] placeholder-[#A67C52]/50';
  const pill        = dk ? 'bg-white/5 border-white/8 text-white'
                         : 'bg-white border-[#E8E2D2] text-[#1C1008]';
  const activePill  = 'bg-[#C9532A] border-[#C9532A] text-white';
  const activeCountry = dk ? 'bg-white text-[#0D0A06]' : 'bg-[#1C1008] text-white';
  const activeTime    = dk ? 'bg-white text-[#0D0A06]' : 'bg-[#1C1008] text-white';

  const calPct  = pct(totalCal, DAILY_CAL_GOAL);
  const calColor = calPct < 60 ? '#5C7A5E' : calPct < 90 ? '#D4870D' : '#C9532A';

  const countryName = COUNTRIES.find(c => c.id === country)?.name ?? 'local';
  const dayTotal = (meals: Record<string, Meal>) =>
    Object.values(meals).reduce((s, m) => s + m.nutrition.calories, 0);

  // Has the user changed filters since they last generated a plan?
  const planDrifted = weeklyPlan && planFilters &&
    (planFilters.country !== country || planFilters.vibe !== vibe || planFilters.diet !== diet);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
   // ⚡ If we are still checking the ID card, show a blank screen to prevent the flicker
  if (isCheckingAuth) {
    return <div className={`${bg} min-h-screen`} />;
  }
  return (
    <div className={`${bg} ${txt} min-h-screen font-sans transition-colors duration-300`}>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl backdrop-blur-md bg-[#1C1008] text-white animate-in fade-in slide-in-from-bottom-4 duration-300 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 ${dk ? 'bg-[#0D0A06]/90 border-white/5' : 'bg-[#FBF6EE]/90 border-[#5a3714]/8'} border-b backdrop-blur-xl transition-colors duration-300`}>
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between gap-3">

          <button onClick={logout}
            className={`text-xs font-bold px-3 py-2 rounded-xl ${dk ? 'hover:bg-white/5' : 'hover:bg-[#F5EDD8]'} text-[#C9532A] transition-all`}>
            🚪 LogOut
          </button>

          <div className="text-center flex-1">
            <h1 className="font-serif italic font-bold text-xl leading-none">
              BuBu <span className="text-[#C9532A]">NourishSelect</span> 💎
            </h1>
            {streak > 0 && (
              <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${sub}`}>
                🔥 {streak}-day streak
              </p>
            )}
          </div>

          <div className="flex gap-1.5 items-center">
            <button onClick={() => setShowHistory(true)}
              className={`text-xs font-bold px-3 py-2 rounded-xl ${dk ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'} transition-all`}>
              📊
            </button>

            <button onClick={() => setShowPlanner(true)}
              className={`relative text-xs font-black px-3 py-2 rounded-xl transition-all flex items-center gap-1.5
                ${dk ? 'bg-[#C9532A]/20 hover:bg-[#C9532A]/30 text-[#F5844C]' : 'bg-[#FEE9DF] hover:bg-[#FDD9C8] text-[#C9532A]'}`}>
              📅 <span className="hidden sm:inline">Plan Week</span>
              {/* Dot if plan exists */}
              {weeklyPlan && !planDrifted && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C9532A] border-2 border-current" />
              )}
              {/* Pulsing dot if plan is stale */}
              {planDrifted && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-current animate-pulse" />
              )}
            </button>

            <button onClick={() => setShowSettings(true)}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all">
              ⚙️
            </button>
          </div>

        </div>
      </header>

      {/* ── ONBOARDING STRIP ─────────────────────────────────────────────── */}
      {!onboarded && (
        <div className={`${dk ? 'bg-[#1A1208] border-white/5' : 'bg-[#FFF7ED] border-[#F5DFC0]'} border-b`}>
          <div className="max-w-xl mx-auto px-4 py-4">
            <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3`}>How it works</p>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { num: '①', icon: '💎', text: 'Pick your vibe & filters' },
                { num: '→', icon: '',   text: '' },
                { num: '②', icon: '🤌', text: 'Hit the big button' },
                { num: '→', icon: '',   text: '' },
                { num: '③', icon: '✅', text: 'Log it or email it' },
              ].map((s, i) => s.icon ? (
                <div key={i} className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl ${dk ? 'bg-white/5' : 'bg-white border border-[#F0E4CC]'}`}>
                  <span className="text-[10px] font-black text-[#C9532A]">{s.num}</span>
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{s.text}</span>
                </div>
              ) : (
                <span key={i} className={`flex-shrink-0 text-sm ${sub}`}>→</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8 pb-32">

        {/* ── CALORIE BAR ──────────────────────────────────────────────────── */}
        <section className={`${card} border rounded-3xl p-5`}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${sub}`}>🔥 Today's Calories</p>
              {totalCal === 0 && (
                <p className={`text-[10px] mt-0.5 ${sub} opacity-70`}>Log a meal below to start tracking</p>
              )}
            </div>
            <p className="text-xs font-bold">
              {totalCal > 0
                ? <><span style={{ color: calColor }}>{totalCal}</span><span className={sub}> / {DAILY_CAL_GOAL} kcal</span></>
                : <span className={sub}>0 / {DAILY_CAL_GOAL} kcal</span>
              }
            </p>
          </div>
          <div className={`h-2 rounded-full ${dk ? 'bg-white/8' : 'bg-[#F5EDD8]'} overflow-hidden`}>
            {totalCal > 0
              ? <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${calPct}%`, background: `linear-gradient(90deg, ${calColor}, ${calColor}aa)` }} />
              : <div className={`h-full w-0 rounded-full ${dk ? 'bg-white/10' : 'bg-[#E8D8C0]'}`} />
            }
          </div>
          {loggedMeals.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {loggedMeals.map((m, i) => (
                <span key={i}
                  className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 ${dk ? 'bg-white/5' : 'bg-[#F5EDD8]'} ${sub} font-medium`}>
                  {m.name.slice(0, 16)}{m.name.length > 16 ? '…' : ''}
                  <span className="text-[#C9532A] font-bold">{m.cal}k</span>
                  <button onClick={() => removeLoggedMeal(i)} className="opacity-40 hover:opacity-100 ml-0.5 leading-none">×</button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── COUNTRY ──────────────────────────────────────────────────────── */}
        <section>
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>Your Country</p>
          <p className={`text-[11px] ${sub} opacity-70 mb-3`}>We prioritise meals from this cuisine</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {COUNTRIES.map(c => (
              <button key={c.id}
                onClick={() => setCountry(c.id as CountryKey)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-2xl border text-[11px] font-bold transition-all duration-200 ${country === c.id ? activeCountry + ' shadow-lg scale-[1.04]' : pill}`}>
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* ── VIBE ─────────────────────────────────────────────────────────── */}
        <section>
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>Today's Vibe</p>
          <p className={`text-[11px] ${sub} opacity-70 mb-3`}>Tell us how you're feeling — we'll match the food</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {VIBES.map(v => (
              <button key={v.id}
                onClick={() => setVibe(v.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border text-[11px] font-bold transition-all duration-200 ${vibe === v.id ? activePill + ' scale-[1.04]' : pill}`}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── MEAL TIME ────────────────────────────────────────────────────── */}
        <section>
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>Meal Time</p>
          <p className={`text-[11px] ${sub} opacity-70 mb-3`}>What meal are you planning right now?</p>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map(t => (
              <button key={t.id}
                onClick={() => setTime(t.id as TimeKey)}
                className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all duration-200 ${time === t.id ? activeTime + ' shadow-xl scale-[1.04]' : pill}`}>
                <span className="text-xl mb-1">{t.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wide">{t.name}</span>
                <span className={`text-[8px] mt-0.5 ${time === t.id ? 'opacity-60' : sub}`}>{t.cal}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── DIET ─────────────────────────────────────────────────────────── */}
        <section>
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>Diet Preference</p>
          <p className={`text-[11px] ${sub} opacity-70 mb-3`}>We'll filter out anything that doesn't work for you</p>
          <div className="flex flex-wrap gap-2">
            {DIETS.map(d => (
              <button key={d}
                onClick={() => setDiet(d)}
                className={`px-4 py-2 rounded-full border text-[11px] font-bold transition-all duration-200 ${diet === d ? 'bg-[#5C7A5E] border-[#5C7A5E] text-white' : pill}`}>
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* ── SPIN BUTTON ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <button
            onClick={spinMeal}
            disabled={loading}
            className={`w-full py-6 rounded-3xl font-black text-lg shadow-2xl active:scale-[0.98] transition-all duration-200 relative overflow-hidden
              ${dk ? 'bg-white text-[#0D0A06]' : 'bg-[#1C1008] text-white'}
              ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(28,16,8,0.25)]'}`}>
            <span className="relative z-10">
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Consulting the brain…
                </span>
              ) : '💎💁🏿‍♀️  What should I eat?'}
            </span>
          </button>
          <p className={`text-center text-[11px] ${sub}`}>
            Tap above — we'll pick the perfect {countryName} meal for your mood
          </p>
        </div>

        {/* ── MEAL CARD ────────────────────────────────────────────────────── */}
        {meal && !loading && (
          <div className={`${card} border rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 ${mealIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

            <div className="relative h-60 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mealImage} alt={meal.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute top-4 left-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/60 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {VIBES.find(v => v.id === vibe)?.icon} {meal.cuisine.toUpperCase()}
                </span>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-1.5">Guided Selection</p>
                <h2 className="font-serif font-bold text-3xl text-white leading-tight">{meal.name}</h2>
              </div>
            </div>

            <div className="p-6">
              <p className={`text-[13.5px] leading-[1.7] italic mb-6 ${dk ? 'text-white/55' : 'text-[#5C3D1E]/70'}`}>
                "{meal.description}"
              </p>

              <div className={`grid grid-cols-4 rounded-2xl overflow-hidden border ${dk ? 'border-white/6' : 'border-[#F0E8D8]'} mb-6`}>
                {[
                  { val: meal.nutrition.calories, unit: 'kcal', label: 'Cal',     accent: true },
                  { val: meal.nutrition.protein,  unit: 'g',    label: 'Protein'               },
                  { val: meal.nutrition.carbs,     unit: 'g',    label: 'Carbs'                 },
                  { val: meal.nutrition.fat,       unit: 'g',    label: 'Fat'                   },
                ].map((m, i) => (
                  <div key={i}
                    className={`py-4 text-center ${i < 3 ? `border-r ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}` : ''} ${dk ? 'bg-white/2' : 'bg-[#FDFAF5]'}`}>
                    <p className={`font-serif font-bold text-xl ${m.accent ? 'text-[#C9532A]' : ''}`}>
                      {m.val}<span className={`text-[9px] font-normal ${sub}`}>{m.unit}</span>
                    </p>
                    <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${sub}`}>{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                {[
                  { icon: '⏱', val: `${meal.prepTime + meal.cookTime} min` },
                  { icon: '📊', val: meal.difficulty },
                  { icon: '⭐', val: meal.rating.toFixed(1) },
                ].map((b, i) => (
                  <span key={i}
                    className={`text-[10.5px] font-semibold px-3 py-1.5 rounded-full ${dk ? 'bg-white/5' : 'bg-[#F5EDD8]'} ${sub} flex items-center gap-1.5`}>
                    {b.icon} {b.val}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={logMeal}
                    className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${dk ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}>
                    ➕ Add to Calories
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(meal.name + ' restaurant near me')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center ${dk ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}>
                    🗺️ Find Near Me
                  </a>
                </div>

                <div>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${sub} mb-1.5 text-center`}>Want to save this for later?</p>
                  {emailSent ? (
                    <div className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center ${dk ? 'bg-[#5C7A5E]/20 text-[#5C7A5E]' : 'bg-[#E0EDDF] text-[#5C7A5E]'} animate-in fade-in duration-300`}>
                      💌 Sent to inbox!
                    </div>
                  ) : (
                    <button onClick={sendEmail} disabled={emailLoading}
                      className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-[#C9532A] hover:bg-[#A93F1F] text-white disabled:opacity-60">
                      {emailLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          Sending…
                        </span>
                      ) : '📩 Email Me This Meal'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
        {!meal && !loading && (
          <div className={`${card} border rounded-[2rem] p-12 text-center`}>
            <p className="text-5xl mb-4">🍽️</p>
            <p className={`font-serif text-lg font-bold mb-2`}>Ready when you are</p>
            <p className={`text-sm ${sub}`}>Pick a vibe, time, and preference — then let the brain work.</p>
          </div>
        )}

        {/* ── HYDRATION ────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-[#0E2233] to-[#0A3040] p-7 rounded-[2rem] text-white shadow-2xl border border-[#38bdf8]/10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-1">💧 Hydration</p>
              <p className="text-[11px] text-white/30">{waterMsg[Math.min(water, 8)]}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-3xl font-bold text-[#7DD3FC]">
                {water} <span className="text-xs font-normal opacity-40">/ 8</span>
              </p>
              {water > 0 && (
                <button onClick={() => { setWater(0); localStorage.setItem('bubu_water', '0'); }}
                  className="text-[9px] text-white/25 hover:text-white/50 transition-colors mt-1">
                  reset
                </button>
              )}
            </div>
          </div>

          {!waterHintShown && (
            <p className="text-[9px] text-[#38bdf8]/60 font-bold uppercase tracking-widest mb-3 animate-pulse">
              👆 Tap a glass to log water
            </p>
          )}

          <div className="flex justify-between mb-5">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} onClick={() => logGlass(i)}
                className={`text-2xl transition-all duration-200 hover:scale-125 ${i < water ? 'opacity-100 scale-110' : 'opacity-20 grayscale'} ${!waterHintShown && i === 0 ? 'animate-bounce' : ''}`}>
                🥛
              </button>
            ))}
          </div>

          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#38bdf8] to-[#7DD3FC] rounded-full transition-all duration-700"
              style={{ width: `${pct(water, 8)}%` }} />
          </div>
        </section>

        {/* ── EMAIL CAPTURE ────────────────────────────────────────────────── */}
        <section className={`${card} border rounded-3xl p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${dk ? 'bg-white/5' : 'bg-[#F5EDD8]'}`}>🔔</div>
            <div>
              <p className="text-sm font-bold">Meal & Hydration Reminders</p>
              <p className={`text-[10px] ${sub}`}>Get your daily recommendation by email</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); localStorage.setItem('bubu_email', e.target.value); }}
              placeholder="your@email.com"
              className={`flex-1 px-4 py-3 rounded-2xl border text-[13px] outline-none focus:border-[#C9532A] transition-all ${input}`}
            />
            <button onClick={sendEmail} disabled={emailLoading || !meal}
              className="px-4 py-3 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[11px] font-black uppercase rounded-2xl transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap">
              {emailLoading ? '…' : 'Send 📩'}
            </button>
          </div>
        </section>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* ── SETTINGS MODAL ───────────────────────────────────────────────── */}
      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} dk={dk}>
          <h2 className="font-serif font-bold text-2xl mb-6">Settings ⚙️</h2>
          <div className="space-y-5">
            <Field label="Email" dk={dk} sub={sub}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${input}`} />
            </Field>
            <Field label="Default Country" dk={dk} sub={sub}>
              <select value={country} onChange={e => setCountry(e.target.value as CountryKey)}
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${input}`}>
                {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
              </select>
            </Field>
            <Field label="Default Meal Time" dk={dk} sub={sub}>
              <select value={time} onChange={e => setTime(e.target.value as TimeKey)}
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${input}`}>
                {TIMES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </Field>
            <ToggleRow label="Auto-Refresh on Visit" active={autoRefresh} onToggle={() => setAutoRefresh(!autoRefresh)} sub={sub} />
              <ToggleRow 
  label="Daily Email Recommendations" 
  active={isSubscribed} 
  onToggle={() => {
    const next = !isSubscribed;
    setIsSubscribed(next);
    localStorage.setItem('bubu_subscribed', String(next));
  }} 
  sub={sub} 
/>
            <ToggleRow label="Dark Mode" active={darkMode} onToggle={() => setDarkMode(!darkMode)} sub={sub} />
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => setShowSettings(false)}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-sm border ${dk ? 'border-white/10 text-white hover:bg-white/5' : 'border-[#E8E2D2] hover:bg-[#F5EDD8]'} transition-all`}>
              Cancel
            </button>
            <button onClick={saveSettings}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all">
              Save Settings ✓
            </button>
          </div>
        </Modal>
      )}

      {/* ── HISTORY MODAL ────────────────────────────────────────────────── */}
      {showHistory && (
        <Modal onClose={() => setShowHistory(false)} dk={dk}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif font-bold text-2xl">Today's Log 📊</h2>
            <p className={`text-sm font-bold ${sub}`}>
              <span style={{ color: calColor }}>{totalCal}</span> / {DAILY_CAL_GOAL} kcal
            </p>
          </div>
          <div className={`${dk ? 'bg-white/5' : 'bg-[#FDF9F0]'} rounded-2xl p-4 mb-5`}>
            <div className={`h-3 rounded-full ${dk ? 'bg-white/8' : 'bg-[#F0E8D8]'} overflow-hidden`}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${calPct}%`, background: `linear-gradient(90deg, ${calColor}, ${calColor}aa)` }} />
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${sub}`}>
              {calPct < 60 ? 'Under target — keep eating!' : calPct < 100 ? 'On track 👏' : '🎉 Daily goal reached!'}
            </p>
          </div>
          {loggedMeals.length === 0 ? (
            <p className={`text-center py-8 text-sm ${sub}`}>No meals logged yet today.<br />Spin a meal and tap ➕ Add to Calories!</p>
          ) : (
            <div className="space-y-3">
              {loggedMeals.map((m, i) => (
                <div key={i}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${dk ? 'border-white/6 bg-white/3' : 'border-[#F0E8D8] bg-[#FDFAF5]'}`}>
                  <div>
                    <p className="text-sm font-bold">{m.name}</p>
                    <p className={`text-[10px] capitalize ${sub} mt-0.5`}>{m.time}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#C9532A]">{m.cal} kcal</span>
                    <button onClick={() => removeLoggedMeal(i)} className={`text-lg ${sub} hover:text-[#C9532A] transition-colors`}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── WEEKLY PLANNER MODAL ─────────────────────────────────────────── */}
      {showPlanner && (
        <Modal onClose={() => setShowPlanner(false)} dk={dk} wide>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-10 pt-2">

            {/* Left — title + filter badges + drift nudge */}
            <div>
              <h2 className="font-serif font-bold text-2xl">📅 Plan Your Week</h2>
              <p className={`text-[10px] font-semibold ${sub} mt-1 mb-2`}>
                7-day personalised meal plan — based on your
              </p>

              {/* Active filter badges */}
              <div className="flex flex-wrap gap-1.5">
                {/* Country */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border
                  ${dk ? 'bg-white/8 border-white/10 text-white/80' : 'bg-[#F5EDD8] border-[#E8D8C0] text-[#5C3D1E]'}`}>
                  {COUNTRIES.find(c => c.id === country)?.flag}{' '}
                  {COUNTRIES.find(c => c.id === country)?.name}
                </span>

                {/* Vibe */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border
                  ${dk ? 'bg-[#C9532A]/15 border-[#C9532A]/20 text-[#F5844C]' : 'bg-[#FEE9DF] border-[#F5C9B8] text-[#C9532A]'}`}>
                  {VIBES.find(v => v.id === vibe)?.icon}{' '}
                  {VIBES.find(v => v.id === vibe)?.label}
                </span>

                {/* Diet — hidden when default "All" */}
                {diet !== 'All' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border
                    ${dk ? 'bg-[#5C7A5E]/15 border-[#5C7A5E]/20 text-[#86B888]' : 'bg-[#E0EDDF] border-[#C4DAC3] text-[#4A6B4C]'}`}>
                    🥗 {diet}
                  </span>
                )}
              </div>

              {/* Drift nudge — only shows when saved plan used different filters */}
              {planDrifted && (
                <button
                  onClick={generateWeeklyPlan}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border border-dashed animate-pulse
                    border-amber-400/60 text-amber-500 bg-amber-400/8 hover:bg-amber-400/15 hover:animate-none transition-all active:scale-95">
                  🔄 Update for new selection
                </button>
              )}
            </div>

            {/* Right — action buttons */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {weeklyPlan ? (
                <>
                  <button onClick={generateWeeklyPlan}
                    className="px-4 py-2.5 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-xs font-black uppercase rounded-xl transition-all">
                    🔄 Regenerate
                  </button>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={downloadWeeklyPlan}
                      className="px-4 py-2.5 bg-[#5C7A5E] hover:bg-[#4a5d4a] text-white text-xs font-black uppercase rounded-xl transition-all">
                      📸 Save as Image
                    </button>
                    <p className={`text-[9px] ${sub} opacity-70`}>Downloads your full week as a photo</p>
                  </div>
                </>
              ) : (
                <button onClick={generateWeeklyPlan}
                  className="px-5 py-2.5 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-sm font-black uppercase rounded-xl transition-all">
                  🎯 Generate Plan
                </button>
              )}
            </div>
          </div>

          {!weeklyPlan ? (
            /* ── BLANK STATE ── */
            <div>
              <p className={`text-sm ${sub} text-center mb-6`}>
                Generate a personalised 7-day meal plan based on your current vibe, country, and diet preferences.
                Here's a preview of what you'll get:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-40 pointer-events-none select-none mb-6">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                  <div key={day} className="bg-white rounded-[1.2rem] p-4 border border-[#E2E8F0]">
                    <h3 className="text-sm font-black text-[#111827] mb-3">{day}</h3>
                    <div className="space-y-2">
                      {[
                        { t: '🌅 Breakfast' },
                        { t: '☀️ Lunch'     },
                        { t: '🌙 Dinner'    },
                        { t: '🍎 Snack'     },
                      ].map((row, i) => (
                        <div key={i} className="p-2 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                          <p className="text-[8px] font-black text-[#94A3B8] uppercase">{row.t}</p>
                          <p className="text-[10px] font-bold text-[#1F2937]">— — — —</p>
                        </div>
                      ))}
                      <div className="pt-1 border-t border-[#E2E8F0] text-[9px] font-black text-[#94A3B8]">Total: — kcal</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <button onClick={generateWeeklyPlan}
                  className="px-8 py-4 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-sm font-black uppercase rounded-2xl transition-all shadow-lg">
                  🎯 Generate My Plan
                </button>
              </div>
            </div>
          ) : (
            /* ── GENERATED PLAN ── */
            <div id="weekly-plan-content" ref={weeklyExportRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-[#F8FAFC] rounded-[1.5rem]">
              {Object.entries(weeklyPlan).map(([day, meals]) => {
                const total = dayTotal(meals);
                const onTarget = total >= 1500 && total <= DAILY_CAL_GOAL;
                const over = total > DAILY_CAL_GOAL;
                return (
                  <div key={day} className="bg-white rounded-[1.5rem] p-5 border border-[#E2E8F0] shadow-sm flex flex-col">
                    <h3 className="text-base font-black text-[#111827] mb-4">{day}</h3>
                    <div className="space-y-3 flex-1">
                      {Object.entries(meals).map(([t, m]) => (
                        <div key={t} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[8.5px] font-black uppercase text-[#94A3B8] tracking-widest">
                              {t === 'breakfast' ? '🌅' : t === 'lunch' ? '☀️' : t === 'dinner' ? '🌙' : '🍎'} {t}
                            </span>
                            <span className="text-[8.5px] font-bold bg-[#EEF2FF] px-2 py-0.5 rounded-full text-[#6366F1]">
                              {m.nutrition.calories} kcal
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#1F2937] leading-tight">{m.name}</p>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-4 pt-3 border-t ${over ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-[#94A3B8]">Daily Total</span>
                        <span className={`text-[10px] font-black ${over ? 'text-[#C9532A]' : 'text-[#111827]'}`}>
                          {total} kcal
                        </span>
                      </div>
                      <p className={`text-[9px] font-bold mt-1 ${over ? 'text-[#C9532A]' : onTarget ? 'text-[#5C7A5E]' : 'text-[#94A3B8]'}`}>
                        {over ? '⚠️ Over target' : onTarget ? '✅ On target' : '📉 Under target'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Modal({ children, onClose, dk, wide }: {
  children: React.ReactNode;
  onClose: () => void;
  dk: boolean;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`${dk ? 'bg-[#1A1208]' : 'bg-white'} rounded-[2rem] ${wide ? 'max-w-5xl' : 'max-w-md'} w-full max-h-[90vh] shadow-2xl border ${dk ? 'border-white/5' : 'border-[#E8E2D2]'} animate-in fade-in zoom-in-95 duration-300 relative flex flex-col`}>
       <button
  onClick={onClose}
  className="absolute -top-5 -right-5 w-14 h-14 rounded-full flex items-center justify-center text-3xl 
  shadow-2xl transition-all active:scale-90 z-[110] backdrop-blur-md border-2 
  bg-[#C9532A] text-white hover:bg-[#A93F1F] border-[#C9532A]/50"
>
  ✕
</button>
        <div className="overflow-y-auto max-h-[90vh] p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, dk, sub }: {
  label: string;
  children: React.ReactNode;
  dk: boolean;
  sub: string;
}) {
  return (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-widest ${sub} mb-2 block`}>{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, active, onToggle, sub }: {
  label: string;
  active: boolean;
  onToggle: () => void;
  sub: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold">{label}</span>
      <button onClick={onToggle}
        className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${active ? 'bg-[#C9532A] text-white' : `${sub} bg-current/10 opacity-60`}`}>
        {active ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
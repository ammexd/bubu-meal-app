'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import emailjs from '@emailjs/browser';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import {
  pickMeal, storage, MEALS, getRandomTip,
  type Meal, type TimeKey, type CountryKey,
} from './lib/foodBrain';
import {
  getTodaySummary, saveToDiary, logWater, resetWater,
  removeMealLog, updateStreak, getWaterGoal, getCachedImage,
  getProfile, saveProfile, getWeeklyPlan, saveWeeklyPlan,
  getTopMeals, learnFoodPreference, toggleFavorite,
  getEffectiveCalorieGoal, getProgramProgress,
  generateMarketPlan, getLatestMarketPlan,
  addMarketItem, toggleMarketItem,  cancelProgram, 
  createProgram,
  type Profile,           // ← ADDED: import the type
  type MealLog,
  type NutritionProgram, type ProgramProgress, type MarketPlan, type MarketCategory,
} from './lib/db';
import { supabase } from './lib/supabase';
import { OnboardingSheet } from './components/OnboardingSheet';
import { ProgramSheet }    from './components/ProgramSheet';
import { MarketSheet } from './components/MarketSheet';
import { CalorieSection } from './components/CalorieSection';
// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { id: 'ng', flag: '🇳🇬', name: 'Nigeria'   },
  { id: 'za', flag: '🇿🇦', name: 'S. Africa' },
  { id: 'gh', flag: '🇬🇭', name: 'Ghana'     },
  { id: 'us', flag: '🇺🇸', name: 'USA'       },
  { id: 'gb', flag: '🇬🇧', name: 'UK'        },
  { id: 'in', flag: '🇮🇳', name: 'India'     },
  { id: 'jp', flag: '🇯🇵', name: 'Japan'     },
  { id: 'mx', flag: '🇲🇽', name: 'Mexico'    },
  { id: 'it', flag: '🇮🇹', name: 'Italy'     },
  { id: 'cn', flag: '🇨🇳', name: 'China'     },
  { id: 'br', flag: '🇧🇷', name: 'Brazil'    },
  { id: 'eg', flag: '🇪🇬', name: 'Egypt'     },
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

interface PlanFilters { country: string; vibe: string; diet: string; }

function smartTime(): TimeKey {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 20) return 'dinner';
  return 'snack';
}
function pct(val: number, max: number) { return Math.min(100, Math.round((val / max) * 100)); }

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function NourishSelectPage() {
  const router          = useRouter();
  const weeklyExportRef = useRef<HTMLDivElement>(null);

  // ── Selectors ──────────────────────────────────────────────────────────────
  const [country, setCountry] = useState<CountryKey>('ng');
  const [vibe,    setVibe   ] = useState('everyday');
  const [time,    setTime   ] = useState<TimeKey>('lunch');
  const [diet,    setDiet   ] = useState('All');

  // ── Profile state — THE FIX ────────────────────────────────────────────────
  // profile was only a local variable before — now it lives in state so
  // the Settings sheet (and any other render) can read it safely.
  const [profile,  setProfile ] = useState<Profile | null>(null);

  // ── Meal state ─────────────────────────────────────────────────────────────
  const [meal,        setMeal       ] = useState<Meal | null>(null);
  const [mealImage,   setMealImage  ] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop');
  const [isFavorite,  setIsFavorite ] = useState(false);
  const [isManual,    setIsManual   ] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // ── Calorie goal — dynamic ─────────────────────────────────────────────────
  const [dailyCalGoal,     setDailyCalGoal    ] = useState(2000);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);
const [calGoalSource, setCalGoalSource] = useState<'program'|'profile'|'tdee'|'default'|'disabled'>('default');
  const [programProgress,  setProgramProgress ] = useState<ProgramProgress | null>(null);

  // ── Sheets ─────────────────────────────────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProgram,    setShowProgram   ] = useState(false);
  const [showSettings,   setShowSettings  ] = useState(false);
  const [showPlanner,    setShowPlanner   ] = useState(false);
  const [showHistory,    setShowHistory   ] = useState(false);
  const [showMarket,     setShowMarket    ] = useState(false);

  // ── Market plan ────────────────────────────────────────────────────────────
  const [marketPlan,    setMarketPlan   ] = useState<MarketPlan | null>(null);
  const [newItemName,   setNewItemName  ] = useState('');
  const [newItemCat,    setNewItemCat   ] = useState<MarketCategory>('groceries');
  const [marketLoading, setMarketLoading] = useState(false);

  // ── Confirm clear ──────────────────────────────────────────────────────────
  const [confirmClearProfile, setConfirmClearProfile] = useState(false);

  // ── Favorite auto-check ────────────────────────────────────────────────────
  useEffect(() => {
    if (!meal) return;
    supabase
      .from('food_preferences')
      .select('is_favorite')
      .eq('food_name', meal.name)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(data?.is_favorite ?? false));
  }, [meal]);

  // ── Image / meal loading state ─────────────────────────────────────────────
  const [loading,   setLoading  ] = useState(false);
  const [mealIn,    setMealIn   ] = useState(false);
  const [imgIndex,  setImgIndex ] = useState(0);
  const [imgSource, setImgSource] = useState<'google'|'unsplash'|'placeholder'>('unsplash');
  const [imgTotal,  setImgTotal ] = useState(1);
  const [isSaving,  setIsSaving ] = useState(false);
  const [spinCount, setSpinCount] = useState(0);

  // ── Tracking ───────────────────────────────────────────────────────────────
  const [water,       setWater      ] = useState(0);
  const [waterGoal,   setWaterGoal  ] = useState(8);
  const [loggedMeals, setLoggedMeals] = useState<MealLog[]>([]);
  const [glassSizeMl,    setGlassSizeMl   ] = useState(250);
const [showSizePicker, setShowSizePicker] = useState(false);

const GLASS_SIZES = [
  { ml: 150, label: '150ml', note: 'Small cup' },
  { ml: 200, label: '200ml', note: 'Tea cup'   },
  { ml: 250, label: '250ml', note: 'Standard'  },
  { ml: 330, label: '330ml', note: 'Can size'  },
  { ml: 500, label: '500ml', note: 'Big bottle' },
];
  const [totalCal,    setTotalCal   ] = useState(0);
  const [streak,      setStreak     ] = useState(0);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [email,          setEmail        ] = useState('');
  const [emailSent,      setEmailSent    ] = useState(false);
  const [emailLoading,   setEmailLoading ] = useState(false);
  const [darkMode,       setDarkMode     ] = useState(false);
  const [autoRefresh,    setAutoRefresh  ] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSubscribed,   setIsSubscribed ] = useState(false);
  const [weeklyPlan,     setWeeklyPlan   ] = useState<Record<string, Record<string, Meal>> | null>(null);
  const [planFilters,    setPlanFilters  ] = useState<PlanFilters | null>(null);
  const [toast,          setToast        ] = useState('');
  const [toastTimer,     setToastTimer   ] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [onboarded,      setOnboarded    ] = useState(true);
  const [waterHintShown, setWaterHintShown] = useState(true);

  const waterMsg = [
    'Start your day right 💙','Good start!','Keep going 💪','¼ there!',
    'Halfway! ✨','More than half!','¾ done!','Almost there!','🎉 Full hydration!',
  ];

  // ── Mount / auth / data ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      // ── Profile — store in state so Settings sheet can read it ──
      const profileData = await getProfile();
      if (!mounted) return;
      if (profileData) {
        setProfile(profileData);                               // ← THE FIX
        if (profileData.country)              setCountry(profileData.country as CountryKey);
        if (profileData.vibe)                 setVibe(profileData.vibe);
        if (profileData.diet)                 setDiet(profileData.diet);
        if (profileData.dark_mode    != null) setDarkMode(profileData.dark_mode);
        if (profileData.auto_refresh != null) setAutoRefresh(profileData.auto_refresh);
        if (profileData.subscribed   != null) setIsSubscribed(profileData.subscribed);
        setEmail(profileData.email ?? '');
        if (!profileData.onboarded) setShowOnboarding(true);
      }

      const newStreak = await updateStreak();
      if (mounted) setStreak(newStreak);

      const wg = await getWaterGoal();
      if (mounted) setWaterGoal(wg);
      // ADD: restore saved glass size
if (profileData?.glass_size_ml) {
        setGlassSizeMl(profileData.glass_size_ml);
      }
      const summary = await getTodaySummary();
      if (!mounted) return;
      setTotalCal(summary.totalCal);
      setWater(summary.waterGlasses);
      setLoggedMeals(summary.meals);

      const savedPlan = await getWeeklyPlan();
      if (savedPlan && mounted) setWeeklyPlan(savedPlan as Record<string, Record<string, Meal>>);

      if (profileData?.auto_refresh) {
        const lastMeal = storage.get('bubu_last_meal');
        const picked   = pickMeal(
          (profileData.country as CountryKey) || 'ng',
          smartTime(), profileData.vibe || 'everyday',
          profileData.diet || 'All', lastMeal,
        );
        if (picked && mounted) {
          setMeal(picked);
          storage.set('bubu_last_meal', picked.name);
          fetchMealImage(picked.unsplashQuery || picked.name, 0);
        }
      }

      const { goal, source, hasActiveProgram } = await getEffectiveCalorieGoal();
      if (mounted) {
        setDailyCalGoal(goal);
        setCalGoalSource(source);
        setHasActiveProgram(hasActiveProgram);
      }

      if (hasActiveProgram) {
        const prog = await getProgramProgress();
        if (mounted) setProgramProgress(prog);
      }

      const plan = await getLatestMarketPlan();
      if (plan && mounted) setMarketPlan(plan);

      if (mounted) setIsCheckingAuth(false);
    }

    hydrate();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToast(''), 3000);
    setToastTimer(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Image engine ───────────────────────────────────────────────────────────
  const fetchMealImage = useCallback(async (
    mealName: string, index = 0, country_ = country,
  ) => {
    setImgIndex(index);
    if (index === 0) {
      const cached = await getCachedImage(mealName, country_);
      if (cached) { setMealImage(cached); setImgSource('google'); return; }
    }
    try {
      const params = new URLSearchParams({ q: mealName, index: String(index) });
      const res    = await fetch(`/api/food?${params}`);
      const data   = await res.json() as { url: string; source: 'google'|'unsplash'|'placeholder'; total: number };
      if (data.url) { setMealImage(data.url); setImgSource(data.source); setImgTotal(data.total); }
    } catch { /* keep current image */ }
  }, [country]);

  // ── Manual log ─────────────────────────────────────────────────────────────
  const handleManualLog = async () => {
    if (!manualInput.trim()) return;
    setManualLoading(true);
    try {
      const res  = await fetch(`/api/food?q=${encodeURIComponent(manualInput)}&index=0`);
      const data = await res.json();
      const finalImageUrl = data.url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop';
      setMealImage(finalImageUrl);
      setImgSource(data.source || 'unsplash');
      const manualMeal: any = {
        name: manualInput, rating: 5.0, difficulty: 'easy',
        prepTime: 10, cookTime: 0, cuisine: 'local',
        description: 'Manually logged meal',
        nutrition: { calories: 450, protein: 15, carbs: 50, fat: 12 },
      };
      setMeal(manualMeal);
      setTimeout(() => setMealIn(true), 100);
      await saveToDiary({ name: manualInput, calories: 450, timeSlot: time, country, imageUrl: finalImageUrl });
      await learnFoodPreference(manualInput);
      // Update local calorie total
      setLoggedMeals(prev => [...prev, { type: 'meal', name: manualInput, amount: 450, time_slot: time, logged_at: new Date().toISOString() }]);
      setTotalCal(prev => prev + 450);
      setManualInput('');
      setIsManual(false);
      showToast(`✅ "${manualInput}" logged and learned!`);
    } catch (err) {
      console.error('Manual log failed:', err);
      showToast('⚠️ Log failed — try again');
    } finally {
      setManualLoading(false);
    }
  };

  // ── Spin meal ──────────────────────────────────────────────────────────────
  const spinMeal = async () => {
    setLoading(true); setMealIn(false);
    const lastMeal = storage.get('bubu_last_meal');
    let picked: Meal | null = null;

    if (Math.random() < 0.3) {
      const topMeals = await getTopMeals(5);
      if (topMeals.length) {
        const allMeals = Object.values(MEALS[country] ?? {}).flat();
        picked = allMeals.find(m => m.name === topMeals[0]) ?? null;
        if (picked) showToast('⭐ Picked from your favourites!');
      }
    }
    if (!picked) picked = pickMeal(country, time, vibe, diet, lastMeal);

    if (picked) {
      setMeal(picked);
      storage.set('bubu_last_meal', picked.name);
      await fetchMealImage(picked.unsplashQuery || picked.name, 0, country);
      setTimeout(() => setMealIn(true), 50);
    }
    setSpinCount(c => c + 1);
    setLoading(false);
  };

  // ── Toggle favourite ───────────────────────────────────────────────────────
  const handleToggleFavorite = async () => {
    if (!meal) return;
    const next = await toggleFavorite(meal.name);
    setIsFavorite(next);
    showToast(next ? '⭐ Added to favourites!' : '☆ Removed from favourites');
  };

  // ── Log meal ───────────────────────────────────────────────────────────────
  const logMeal = async () => {
    if (!meal || isSaving) return;
    setIsSaving(true);
    const cal = meal.nutrition?.calories ?? 450;
    const ok  = await saveToDiary({ name: meal.name, calories: cal, timeSlot: time, country, imageUrl: mealImage });
    if (ok) {
      const entry: MealLog = { type:'meal', name:meal.name, amount:cal, time_slot:time, image_url:mealImage, logged_at:new Date().toISOString() };
      setLoggedMeals(prev => [...prev, entry]);
      setTotalCal(prev => {
        const next = prev + cal;
        if (next >= dailyCalGoal) confetti({ particleCount:120, spread:70, origin:{ y:0.4 } });
        return next;
      });
      showToast(`✅ ${meal.name} logged — ${cal} kcal`);
    } else {
      showToast('❌ Could not save — check your connection');
    }
    setIsSaving(false);
  };

  // ── Remove logged meal ─────────────────────────────────────────────────────
  const removeLoggedMeal = async (i: number) => {
    const entry = loggedMeals[i];
    if (!entry) return;
    if (entry.id) await removeMealLog(entry.id);
    const updated = loggedMeals.filter((_, idx) => idx !== i);
    setLoggedMeals(updated);
    setTotalCal(updated.reduce((s, m) => s + (m.amount ?? 0), 0));
    showToast('🗑 Meal removed');
  };

// ── Calorie goal management ─────────────────────────────────────────────────
const handleGoalChange = (goal: number, source: 'program'|'profile'|'tdee'|'default'|'disabled') => {
  setDailyCalGoal(goal);
  setCalGoalSource(source);
};

const handleGoalDisable = () => {
  setDailyCalGoal(0);
  setCalGoalSource('disabled');
  setHasActiveProgram(false);
  setProgramProgress(null);
};



  // ── Log water ──────────────────────────────────────────────────────────────
  const logGlass = async (i: number) => {
    const target = i < water ? i : i + 1;
    const delta  = target - water;
    if (delta > 0) {
      await logWater(delta);
      setWater(target);
      if (target >= waterGoal) {
        confetti({ particleCount:120, spread:70, origin:{ y:0.6 } });
        showToast('🎉 Daily water goal hit!');
      }
    } else if (target === 0) {
      await resetWater(); setWater(0);
    }
  };

  // ── Send email ─────────────────────────────────────────────────────────────
  const sendEmail = async () => {
    if (!meal || !email) { showToast('⚠️ Spin a meal & enter your email first!'); return; }
    setEmailLoading(true);
    try {
      const res = await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        { to_email:email, meal_name:meal.name, meal_desc:meal.description,
          meal_cal:meal.nutrition?.calories, meal_protein:meal.nutrition?.protein,
          meal_carbs:meal.nutrition?.carbs, meal_fat:meal.nutrition?.fat,
          healthy_tip: getRandomTip() },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!,
      );
      if (res.status === 200) { setEmailSent(true); showToast('📬 Meal sent to your inbox!'); setTimeout(() => setEmailSent(false), 5000); }
    } catch (e: any) { showToast(`❌ Send failed — ${e?.text || 'check console'}`); }
    setEmailLoading(false);
  };

  // ── Weekly plan ────────────────────────────────────────────────────────────
  const generateWeeklyPlan = async () => {
    const days: string[]   = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const times: TimeKey[] = ['breakfast','lunch','dinner','snack'];
    const plan: Record<string, Record<string, Meal>> = {};
    days.forEach(day => {
      plan[day] = {};
      times.forEach(t => { const p = pickMeal(country, t, vibe, diet, null); if (p) plan[day][t] = p; });
    });
    setWeeklyPlan(plan);
    await saveWeeklyPlan(plan);
    setPlanFilters({ country, vibe, diet });
    showToast('📅 Weekly plan generated!');
  };

 const downloadWeeklyPlan = async () => {
  const el = weeklyExportRef.current;
  if (!weeklyPlan || !el) return;
  try {
    await document.fonts.ready;
    await new Promise(r => requestAnimationFrame(r));
    const url = await toPng(el, {
      quality:         1,
      pixelRatio:      2,
      cacheBust:       true,
      backgroundColor: '#F8FAFC',
      fontEmbedCSS:    '',
      filter: (node: Element) => {
        if (node.tagName === 'LINK') return false;
        if (node.tagName === 'SCRIPT') return false;
        return true;
      },
    });
    const a = document.createElement('a');
    a.download = `BuBu-Meal-Plan-${new Date().toLocaleDateString()}.png`;
    a.href = url; a.click();
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  } catch { showToast('Export failed — try again'); }
};

  // ── Market plan generate ───────────────────────────────────────────────────
const handleGenerateMarket = async () => {
  setMarketLoading(true);
  setMarketPlan(null); // clear first so UX shows generating state
  try {
    const ingredients: string[] = weeklyPlan
      ? Array.from(new Set(
          Object.values(weeklyPlan).flatMap((day: any) =>
            Object.values(day).flatMap((m: any) => m.ingredients ?? [])
          )
        ))
      : [];
    const plan = await generateMarketPlan(ingredients);
    if (plan) {
      setMarketPlan(plan);
      showToast(`✅ ${plan.items?.length ?? 0} items ready to shop!`);
    } else {
      showToast('❌ Could not generate — check connection');
    }
  } catch { showToast('❌ Something went wrong'); }
  finally { setMarketLoading(false); }
};

  // ── Market item toggle ─────────────────────────────────────────────────────
  const handleToggleMarketItem = async (itemId: string, currentChecked: boolean) => {
    // Optimistic update
    setMarketPlan(prev => prev ? {
      ...prev,
      items: prev.items?.map(i => i.id === itemId ? { ...i, checked: !currentChecked } : i)
    } : prev);
    try {
      await toggleMarketItem(itemId, !currentChecked);
    } catch {
      // Revert on failure
      const fresh = await getLatestMarketPlan();
      if (fresh) setMarketPlan(fresh);
      showToast('❌ Could not update item');
    }
  };

  // ── Market item add ────────────────────────────────────────────────────────
  // const handleAddMarketItem = async () => {
  //   if (!newItemName.trim() || !marketPlan?.id) return;
  //   const trimmed  = newItemName.trim();
  //   const tempItem = { name: trimmed, category: newItemCat, source: 'manual' as const, checked: false };
  //   // Optimistic add
  //   setMarketPlan(prev => prev ? { ...prev, items: [...(prev.items ?? []), tempItem] } : prev);
  //   setNewItemName('');
  //   try {
  //     await addMarketItem(marketPlan.id, tempItem);
  //     const fresh = await getLatestMarketPlan();
  //     if (fresh) setMarketPlan(fresh);
  //   } catch {
  //     showToast('❌ Could not add item');
  //     const fresh = await getLatestMarketPlan();
  //     if (fresh) setMarketPlan(fresh);
  //   }
  // };

  // ── Settings save ──────────────────────────────────────────────────────────
  const saveSettings = async () => {
     await saveProfile({ email, country, vibe, diet, dark_mode: darkMode, auto_refresh: autoRefresh, subscribed: isSubscribed, glass_size_ml: glassSizeMl });
    // Re-fetch profile so Settings card stays accurate
    const updated = await getProfile();
    if (updated) setProfile(updated);
    storage.set('bubu_country',      country);
    storage.set('bubu_auto_refresh', String(autoRefresh));
    storage.set('bubu_dark_mode',    String(darkMode));
    setShowSettings(false);
    showToast('✅ Settings saved!');
  };

  // delete below later:
// 🧠 TEMPORARY OVERRIDE FOR SANDBOX TESTING:
const runEmailDiagnostic = async () => {
  const { testNourishEmailPipeline } = await import('./lib/sendEmail');
  
  // 🚨 FORCE THE REGISTERED SANDBOX ACCOUNT ADDRESS:
  const check = await testNourishEmailPipeline('bubu-meal-app@protonmail.com'); 
  
  if (check.success) {
    showToast('📩 Test delivery successful! Check your ProtonMail account.');
  } else {
    showToast(`❌ Routing blocked: ${check.error}`);
  }
};

  // 🧠 THE USER RESET ACTION: Drop this here so it can mutate state flags cleanly
const handleUserReset = async () => {
  if (!window.confirm('Are you sure you want to reset your setup? This cannot be undone.')) return;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/reset-user', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    
    if (res.ok) {
      showToast('🔄 Account setup has been completely reset.');
      setShowSettings(false);   // Close settings window panel wrapper
      setShowOnboarding(true);  // Force display onboarding workflow
      router.push('/');
    } else {
      showToast('❌ Reset routing error encountered.');
    }
  } catch (err) {
    console.error('Reset handling pipeline exception:', err);
  }
};


  const logout = async () => { await supabase.auth.signOut(); router.push('/login'); };

  // ── Theme ──────────────────────────────────────────────────────────────────
  const dk         = darkMode;
  const bg         = dk ? 'bg-[#0A0804]'                : 'bg-[#FAF5EC]';
  const txt        = dk ? 'text-[#F5EDD8]'              : 'text-[#1C1008]';
  const card       = dk ? 'bg-[#141008] border-white/6' : 'bg-white border-[#E8E0CC]';
  const cardGlow   = dk ? 'shadow-[0_2px_24px_rgba(0,0,0,0.4)]' : 'shadow-[0_4px_32px_rgba(28,16,8,0.06)]';
  const sub        = dk ? 'text-[#8B6D52]'              : 'text-[#A67C52]';
  const inputCls   = dk
    ? 'bg-white/5 border-white/10 text-[#F5EDD8] placeholder-white/25'
    : 'bg-[#FDF9F0] border-[#E0D4BC] text-[#1C1008] placeholder-[#A67C52]/50';
  const pill       = dk
    ? 'bg-white/4 border-white/8 text-[#D4B896] hover:bg-white/8 hover:border-white/15'
    : 'bg-white border-[#E8E0CC] text-[#3D2010] hover:border-[#C9532A]/30 hover:bg-[#FFF7F2]';
  const activePill    = 'bg-[#C9532A] border-[#C9532A] text-white shadow-[0_4px_16px_rgba(201,83,42,0.38)]';
  const activeCountry = dk
    ? 'bg-[#F5EDD8] text-[#1C1008] border-[#F5EDD8] shadow-[0_4px_14px_rgba(245,237,216,0.18)]'
    : 'bg-[#1C1008] text-white border-[#1C1008] shadow-[0_4px_14px_rgba(28,16,8,0.22)]';
  const activeTime = dk
    ? 'bg-[#F5EDD8] text-[#1C1008] border-[#F5EDD8]'
    : 'bg-[#1C1008] text-white border-[#1C1008]';

  const calPct      = pct(totalCal, dailyCalGoal);
  const calColor    = calPct < 50 ? '#5C7A5E' : calPct < 85 ? '#D4870D' : '#C9532A';
  const countryName = COUNTRIES.find(c => c.id === country)?.name ?? 'local';
  const dayTotal    = (meals: Record<string, Meal>) => Object.values(meals).reduce((s, m) => s + m.nutrition.calories, 0);
  const planDrifted = weeklyPlan && planFilters &&
    (planFilters.country !== country || planFilters.vibe !== vibe || planFilters.diet !== diet);

  const marketUnchecked = marketPlan?.items?.filter(i => !i.checked).length ?? 0;

  if (isCheckingAuth) return <div className={`${bg} min-h-screen`} />;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className={`${bg} ${txt} min-h-screen font-sans transition-colors duration-300 relative`}>

      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.022] mix-blend-overlay"
        style={{ backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] z-[1]"
        style={{ background:'radial-gradient(ellipse at top, rgba(201,83,42,0.1) 0%, transparent 70%)' }} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3.5 rounded-2xl text-sm font-bold shadow-2xl backdrop-blur-xl border border-white/10 bg-[#1C1008]/95 text-white max-w-[88vw] text-center"
          style={{ animation:'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-2xl transition-colors duration-300 ${dk ? 'bg-[#0A0804]/88 border-white/5' : 'bg-[#FAF5EC]/88 border-[#E0D4BC]/60'}`}>
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <button onClick={logout} className={`text-[11px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 text-[#C9532A] ${dk ? 'hover:bg-[#C9532A]/10' : 'hover:bg-[#C9532A]/8'}`}>
            🚪 Out
          </button>
          <div className="text-center flex-1 min-w-0">
            <h1 className="font-serif italic font-bold text-[1.15rem] leading-none tracking-tight">
              BuBu <span style={{ color:'#C9532A' }}>NourishSelect</span> 💎
            </h1>
            {streak > 0 && <p className="text-[9px] font-black uppercase tracking-[0.15em] mt-0.5" style={{ color:'#D4870D' }}>🔥 {streak}-day streak</p>}
          </div>
          <div className="flex gap-1.5 items-center flex-shrink-0">
            <button onClick={() => setShowHistory(true)} className={`text-sm px-2.5 py-2 rounded-xl transition-all active:scale-95 ${dk ? 'bg-white/5 hover:bg-white/10 text-[#D4B896]' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}>📊</button>
            
            {/* tempo button BELOW TO TEST RESEND MESSAGES HOWEVER NEED TDOMAIN TO USE IT WELL SO JUST FOR LATER */}
                     {/* <button 
  onClick={runEmailDiagnostic} 
  className={`text-sm px-2.5 py-2 rounded-xl font-bold transition-all active:scale-95 ${dk ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`}
  title="Run Resend Pipeline Test"
>
  ⚡ Test API
</button> */}
            <button onClick={() => setShowPlanner(true)} className={`relative text-[11px] font-black px-2.5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1 ${dk ? 'bg-[#C9532A]/15 hover:bg-[#C9532A]/25 text-[#F5844C]' : 'bg-[#FEE9DF] hover:bg-[#FDD9C8] text-[#C9532A]'}`}>
              📅 Plan
              {weeklyPlan && !planDrifted && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C9532A]" />}
              {planDrifted && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </button>
            <button onClick={() => setShowMarket(true)} className={`relative text-[11px] font-black px-2.5 py-2 rounded-xl transition-all active:scale-95 ${dk ? 'bg-white/5 hover:bg-white/10 text-[#D4B896]' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}>
              🛒
              {marketUnchecked > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C9532A] text-white text-[7px] flex items-center justify-center font-black">{marketUnchecked}</span>}
            </button>
            <button onClick={() => setShowSettings(true)} className="text-sm px-2.5 py-2 rounded-xl bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all active:scale-95 shadow-[0_2px_10px_rgba(201,83,42,0.3)]">⚙️</button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="max-w-xl mx-auto px-4 pt-6 pb-32 space-y-7 relative z-[2]">

        {/* ── Calorie Bar ── */}
      {/* ── Calorie Bar ── */}
<CalorieSection
  dk={dk}
  sub={sub}
  totalCal={totalCal}
  dailyCalGoal={dailyCalGoal}
  calGoalSource={calGoalSource}
  hasActiveProgram={hasActiveProgram}
  programProgress={programProgress}
  loggedMeals={loggedMeals}
  profile={profile}
  onGoalChange={handleGoalChange}
  onGoalDisable={handleGoalDisable}
  onSetProgram={() => setShowProgram(true)}
  onRemoveMeal={removeLoggedMeal}
  showToast={showToast}
/>

        {/* ── Country ── */}
        <section>
          <SectionLabel dk={dk}>Your Country</SectionLabel>
          <p className={`text-[11px] ${sub} mt-1 mb-3`}>We prioritise meals from this cuisine</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {COUNTRIES.map(c => (
              <button key={c.id} onClick={() => setCountry(c.id as CountryKey)}
                className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border text-[11px] font-bold transition-all duration-200 active:scale-95 ${country === c.id ? activeCountry+' scale-[1.04]' : pill}`}>
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </section>

        {/* ── Vibe ── */}
        <section>
          <SectionLabel dk={dk}>Today's Vibe</SectionLabel>
          <p className={`text-[11px] ${sub} mt-1 mb-3`}>Tell us how you're feeling — we'll match the food</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {VIBES.map(v => (
              <button key={v.id} onClick={() => setVibe(v.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[11px] font-bold transition-all duration-200 active:scale-95 ${vibe === v.id ? activePill+' scale-[1.04]' : pill}`}>
                <span>{v.icon}</span>{v.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Meal Time ── */}
        <section>
          <SectionLabel dk={dk}>Meal Time</SectionLabel>
          <p className={`text-[11px] ${sub} mt-1 mb-3`}>What meal are you planning right now?</p>
          <div className="grid grid-cols-4 gap-2">
            {TIMES.map(t => (
              <button key={t.id} onClick={() => setTime(t.id as TimeKey)}
                className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 active:scale-95 ${time === t.id ? activeTime+' scale-[1.04] shadow-lg' : pill}`}>
                <span className="text-2xl mb-1">{t.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-wide">{t.name}</span>
                <span className={`text-[8px] mt-0.5 ${time === t.id ? 'opacity-55' : sub}`}>{t.cal}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Diet ── */}
        <section>
          <SectionLabel dk={dk}>Diet Preference</SectionLabel>
          <p className={`text-[11px] ${sub} mt-1 mb-3`}>We'll filter out anything that doesn't work for you</p>
          <div className="flex flex-wrap gap-2">
            {DIETS.map(d => (
              <button key={d} onClick={() => setDiet(d)}
                className={`px-4 py-2 rounded-full border text-[11px] font-bold transition-all duration-200 active:scale-95 ${diet === d ? 'bg-[#5C7A5E] border-[#5C7A5E] text-white shadow-[0_4px_12px_rgba(92,122,94,0.32)] scale-[1.04]' : pill}`}>
                {d}
              </button>
            ))}
          </div>
        </section>

        {/* ── Spin Button ── */}
        <div className="space-y-3">
          <div className="relative">
            {!loading && <div className="absolute inset-x-8 inset-y-2 rounded-3xl blur-2xl opacity-15 pointer-events-none" style={{ background:dk ? '#F5EDD8' : '#1C1008' }}/>}
            <button onClick={spinMeal} disabled={loading}
              className={`relative w-full py-7 rounded-3xl font-black text-xl tracking-tight transition-all duration-300 active:scale-[0.97] overflow-hidden ${dk ? 'bg-[#F5EDD8] text-[#1C1008]' : 'bg-[#1C1008] text-white'} ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
              style={{ boxShadow:loading ? 'none' : dk ? '0 8px 32px rgba(245,237,216,0.14),0 2px 8px rgba(0,0,0,0.25)' : '0 8px 32px rgba(28,16,8,0.3),0 2px 8px rgba(28,16,8,0.15)' }}>
              {!loading && <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl"><span className="absolute inset-0" style={{ backgroundImage:'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)', backgroundSize:'200% 100%', animation:'shimmer 3s ease-in-out infinite' }}/></span>}
              <span className="relative z-10 flex items-center justify-center gap-3">
                {loading ? <><span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin"/>Consulting the brain…</> : <><span className="text-2xl">💎</span> What should I eat? <span className="text-2xl">💁🏿‍♀️</span></>}
              </span>
            </button>
          </div>
          <p className={`text-center text-[11px] font-medium ${sub}`}>
            {spinCount === 0 ? `Tap above — we'll find the perfect ${countryName} meal for your mood` : spinCount === 1 ? 'Not feeling it? Tap again for a different pick ✨' : 'Keep going until it feels right 🎯'}
          </p>
        </div>

        {/* ── Manual Log ── */}
        <div className="space-y-2 mt-[-10px]">
          <button onClick={() => setIsManual(!isManual)}
            className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isManual ? 'bg-[#5C7A5E] border-[#5C7A5E] text-white shadow-lg' : dk ? 'bg-white/4 border-white/8 text-[#8B6D52] hover:bg-white/8' : 'bg-[#F5EDD8] border-[#E8D8C0] text-[#A67C52] hover:bg-[#EDE0C8]'}`}>
            {isManual ? '↑ Hide Manual' : '✎ I already ate something'}
          </button>
          {isManual && (
            <div className="flex gap-2">
              <input type="text" autoFocus value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualLog()}
                placeholder="What did you eat? (e.g. 2 slices of yam)"
                className={`flex-1 px-4 py-3 rounded-2xl border text-[13px] outline-none focus:border-[#C9532A] transition-all ${inputCls}`}
              />
              <button onClick={handleManualLog} disabled={manualLoading || !manualInput.trim()}
                className="px-6 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[10px] font-black uppercase rounded-2xl transition-all active:scale-95 disabled:opacity-40">
                {manualLoading ? '…' : 'Log'}
              </button>
            </div>
          )}
        </div>

        {/* ── Meal Card ── */}
        {meal && !loading && (
          <div className={`${card} border rounded-[2rem] overflow-hidden transition-all duration-500 ${cardGlow} ${mealIn ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.97]'}`}>
            <div className="relative h-64 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mealImage} alt={meal.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"/>
              <div className="absolute inset-0" style={{ background:'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)' }}/>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/70 bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {VIBES.find(v => v.id === vibe)?.icon} {(meal.cuisine ?? 'local').toUpperCase()}
                </span>
                {meal.rating != null && (
                  <span className="text-[9px] font-black text-white/60 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    ⭐ {meal.rating.toFixed(1)}
                  </span>
                )}
              </div>
              {meal.difficulty && (
                <div className="absolute top-4 right-4">
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full backdrop-blur-md border border-white/10 ${meal.difficulty === 'easy' ? 'bg-green-900/40 text-green-300' : meal.difficulty === 'medium' ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/40 text-red-300'}`}>
                    {meal.difficulty}
                  </span>
                </div>
              )}
              <button onClick={handleToggleFavorite}
                className="absolute bottom-20 right-6 z-[60] w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background:isFavorite ? 'rgba(201,135,13,0.9)' : 'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.15)', boxShadow:isFavorite ? '0 0 16px rgba(212,135,13,0.5)' : 'none' }}>
                <span style={{ fontSize:'18px', filter:isFavorite ? 'none' : 'grayscale(1) opacity(0.6)' }}>⭐</span>
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/35 mb-2">— Guided Selection —</p>
                <h2 className="font-serif font-bold text-[1.75rem] text-white leading-tight">{meal.name}</h2>
              </div>
            </div>
            <div className="p-6">
              {meal.description && <p className={`text-[13px] leading-[1.8] italic mb-6 ${dk ? 'text-[#8B6D52]' : 'text-[#6B4C30]/70'}`}>&ldquo;{meal.description}&rdquo;</p>}
              <div className={`grid grid-cols-4 rounded-2xl overflow-hidden border mb-5 ${dk ? 'border-white/6' : 'border-[#EDE4D4]'}`}>
                {[
                  { val: meal.nutrition?.calories ?? 0, unit:'kcal', label:'Energy',  color:'#C9532A' },
                  { val: meal.nutrition?.protein  ?? 0, unit:'g',    label:'Protein', color:'#5C7A5E' },
                  { val: meal.nutrition?.carbs    ?? 0, unit:'g',    label:'Carbs',   color:'#D4870D' },
                  { val: meal.nutrition?.fat      ?? 0, unit:'g',    label:'Fat',     color:'#7B6BA8' },
                ].map((macro, i) => (
                  <div key={i} className={`py-4 text-center relative ${i < 3 ? `border-r ${dk ? 'border-white/6' : 'border-[#EDE4D4]'}` : ''} ${dk ? 'bg-white/2' : 'bg-[#FDFAF5]'}`}>
                    <div className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full opacity-50" style={{ background:macro.color }}/>
                    <p className="font-serif font-bold text-[1.15rem]" style={{ color:macro.color }}>
                      {macro.val}<span className={`text-[8px] font-normal ml-0.5 ${sub}`}>{macro.unit}</span>
                    </p>
                    <p className={`text-[7.5px] font-black uppercase tracking-widest mt-1 ${sub}`}>{macro.label}</p>
                  </div>
                ))}
              </div>
              {(meal.prepTime != null || meal.cuisine) && (
                <div className="flex gap-2 mb-6 flex-wrap">
                  {meal.prepTime != null && <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${dk ? 'bg-white/5 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>⏱ {meal.prepTime + (meal.cookTime ?? 0)} min</span>}
                  {meal.cuisine && <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${dk ? 'bg-white/5 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>🍽️ {meal.cuisine}</span>}
                </div>
              )}
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2.5">
                  <button onClick={logMeal} disabled={isSaving} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${dk ? 'bg-white/6 hover:bg-white/12 text-[#F5EDD8] border border-white/8' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#3D2010] border border-[#E0D4BC]'}`}>
                    {isSaving ? '…' : '➕ Log Calories'}
                  </button>
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(meal.name+' restaurant near me')}`} target="_blank" rel="noopener noreferrer"
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center ${dk ? 'bg-white/6 hover:bg-white/12 text-[#F5EDD8] border border-white/8' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#3D2010] border border-[#E0D4BC]'}`}>
                    🗺️ Find Near Me
                  </a>
                  <button onClick={() => fetchMealImage(meal.name, (imgIndex+1) % Math.max(imgTotal,1))}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${dk ? 'bg-white/6 hover:bg-white/12 text-[#F5EDD8] border border-white/8' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#3D2010] border border-[#E0D4BC]'}`}>
                    <span className="flex items-center justify-center gap-1">💎 Regen{imgSource==='google' && <span className="text-[7px] font-black text-[#5C7A5E] bg-[#E0EDDF] px-1 py-0.5 rounded-full">G</span>}</span>
                  </button>
                </div>
                <div className={`rounded-2xl overflow-hidden border ${dk ? 'border-white/6' : 'border-[#E0D4BC]'}`}>
                  <p className={`text-[9px] font-bold uppercase tracking-widest ${sub} px-4 pt-3 pb-1 text-center`}>Save this meal for later</p>
                  {emailSent
                    ? <div className={`py-4 text-[10px] font-black uppercase tracking-widest text-center ${dk ? 'bg-[#5C7A5E]/15 text-[#86B888]' : 'bg-[#E0EDDF] text-[#5C7A5E]'}`}>💌 Landed in your inbox!</div>
                    : <button onClick={sendEmail} disabled={emailLoading} className="w-full py-4 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 bg-[#C9532A] hover:bg-[#A93F1F] text-white disabled:opacity-50">
                        {emailLoading ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"/>Sending…</span> : '📩 Email Me This Meal'}
                      </button>
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!meal && !loading && (
          <div className={`${card} ${cardGlow} border rounded-[2rem] p-14 text-center`}>
            <div className="text-6xl mb-5" style={{ animation:'float 3s ease-in-out infinite' }}>🍽️</div>
            <p className="font-serif text-xl font-bold mb-2">Ready when you are</p>
            <p className={`text-sm leading-relaxed ${sub}`}>Pick a vibe, set your mood,<br/>then let the brain do the work.</p>
          </div>
        )}

      
        {/* ── Hydration ── */}
<section className="relative overflow-hidden rounded-[2rem] p-7 text-white"
  style={{ background: 'linear-gradient(135deg, #0C1E30 0%, #0A2840 50%, #0E3350 100%)' }}>
  <div className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none"
    style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)' }} />

  <div className="relative">
    {/* Header row */}
    <div className="flex justify-between items-start mb-1">
      <div>
        <SectionLabel dk={true}>💧 Hydration</SectionLabel>
        <p className="text-[12px] text-blue-200/45 mt-1">
          {waterMsg[Math.min(water, 8)]}
        </p>
      </div>

      {/* Volume counter + size picker trigger */}
      <div className="text-right">
        {/* Big number: consumed ml / goal ml */}
        <p className="font-serif text-3xl font-black text-[#7DD3FC] leading-none">
          {(water * glassSizeMl) >= 1000
            ? `${((water * glassSizeMl) / 1000).toFixed(1)}L`
            : `${water * glassSizeMl}ml`}
          <span className="text-sm font-normal text-blue-300/35">
            {' '}/ {(waterGoal * glassSizeMl) >= 1000
              ? `${((waterGoal * glassSizeMl) / 1000).toFixed(1)}L`
              : `${waterGoal * glassSizeMl}ml`}
          </span>
        </p>
        {/* Sub-line: X / Y glasses */}
        <p className="text-[10px] text-blue-300/40 font-semibold mt-0.5">
          {water} / {waterGoal} glasses
        </p>
        {water > 0 && (
          <button
            onClick={async () => { await resetWater(); setWater(0); }}
            className="text-[9px] text-blue-300/25 hover:text-blue-300/55 transition-colors mt-1 block ml-auto"
          >
            reset
          </button>
        )}
      </div>
    </div>

    {/* Inline glass-size picker */}
    <div className="mb-4 mt-3">
      <button
        onClick={() => setShowSizePicker(s => !s)}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-300/50 hover:text-blue-300/80 transition-colors"
      >
        <span className="w-3.5 h-3.5 rounded-full border border-blue-300/30 flex items-center justify-center text-[8px]">
          {showSizePicker ? '↑' : '⚙'}
        </span>
        Per glass: {glassSizeMl}ml
        {glassSizeMl === 250 && <span className="text-blue-300/30 normal-case font-normal">· standard</span>}
      </button>

      {showSizePicker && (
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {[
            { ml: 150, note: 'Small cup'   },
            { ml: 200, note: 'Tea cup'     },
            { ml: 250, note: 'Standard'    },
            { ml: 330, note: 'Can size'    },
            { ml: 500, note: 'Bottle'      },
          ].map(s => (
            <button
              key={s.ml}
              onClick={() => {
                setGlassSizeMl(s.ml);
                setShowSizePicker(false);
                // Persist immediately
                saveProfile({ glass_size_ml: s.ml });
              }}
              className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all active:scale-95 ${
                glassSizeMl === s.ml
                  ? 'bg-[#38bdf8]/20 border-[#38bdf8]/50 text-[#7DD3FC]'
                  : 'bg-white/5 border-white/10 text-blue-300/50 hover:bg-white/10'
              }`}
            >
              <span className="text-[11px] font-black">{s.ml}ml</span>
              <span className="text-[8px] font-medium opacity-60 mt-0.5">{s.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Glass icons */}
    <div className="flex justify-between mb-5">
      {Array.from({ length: waterGoal }, (_, i) => (
        <button
          key={i}
          onClick={() => logGlass(i)}
          className="group transition-all duration-200 active:scale-90"
          style={{ transform: i < water ? 'scale(1.12)' : 'scale(1)' }}
        >
          <span className={`text-2xl block transition-all duration-200 group-hover:scale-125 ${
            i < water ? 'opacity-100' : 'opacity-20 grayscale'
          }`}>🥛</span>
          {i < water && (
            <div className="mx-auto mt-0.5 w-1 h-1 rounded-full bg-[#38bdf8]" />
          )}
        </button>
      ))}
    </div>

    {/* Progress bar */}
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct(water, waterGoal)}%`,
          background: 'linear-gradient(90deg, #38bdf8, #7DD3FC)',
          boxShadow: water > 0 ? '0 0 8px rgba(56,189,248,0.45)' : 'none',
        }}
      />
    </div>

    {/* Volume label under bar */}
    {water > 0 && (
      <p className="text-[9px] text-blue-300/35 font-semibold mt-1.5 text-center">
        {water * glassSizeMl}ml consumed of {waterGoal * glassSizeMl}ml daily target
      </p>
    )}
  </div>
</section>

        {/* ── Email capture ── */}
        <section className={`${card} ${cardGlow} border rounded-3xl p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${dk ? 'bg-[#C9532A]/15' : 'bg-[#FEE9DF]'}`}>🔔</div>
            <div>
              <p className="text-sm font-bold">Meal & Hydration Reminders</p>
              <p className={`text-[10px] ${sub}`}>Get your daily recommendation by email</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); storage.set('bubu_email', e.target.value); }}
              placeholder="your@email.com"
              className={`flex-1 px-4 py-3 rounded-2xl border text-[13px] outline-none focus:border-[#C9532A] transition-all ${inputCls}`}/>
            <button onClick={sendEmail} disabled={emailLoading || !meal}
              className="px-4 py-3 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[11px] font-black uppercase rounded-2xl transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap shadow-[0_4px_12px_rgba(201,83,42,0.28)]">
              {emailLoading ? '…' : 'Send 📩'}
            </button>
          </div>
        </section>

      </div>

      {/* ══ SHEETS ══ */}

      {/* Settings */}
      {showSettings && (
        <Sheet onClose={() => { setShowSettings(false); setConfirmClearProfile(false); }} dk={dk} title="Settings ⚙️">
          <div className="space-y-5">

            {/* Body Profile card */}
            <div className={`rounded-2xl border p-4 ${dk ? 'bg-white/4 border-white/8' : 'bg-[#FDF9F0] border-[#E0D4BC]'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>💎 Body Profile</p>
                  <p className="text-sm font-bold mt-0.5">
                    {profile?.onboarded ? 'Profile complete ✓' : 'Not set up yet'}
                  </p>
                  {profile?.bmi && profile?.tdee && (
                    <p className={`text-[10px] ${sub} mt-0.5`}>
                      BMI {profile.bmi} · TDEE {profile.tdee} kcal · {profile.goal_type ?? 'maintain'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setShowSettings(false); setTimeout(() => setShowOnboarding(true), 200); }}
                  className={`text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all active:scale-95 ${profile?.onboarded ? dk ? 'bg-white/8 text-[#D4B896] hover:bg-white/16' : 'bg-[#F5EDD8] text-[#5C3D1E] hover:bg-[#EDE0C8]' : 'bg-[#C9532A] text-white hover:bg-[#A93F1F]'}`}>
                  {profile?.onboarded ? 'Update' : 'Set Up'}
                </button>
              </div>
              {profile?.onboarded && (
                confirmClearProfile ? (
                  <div className={`rounded-xl p-3 border ${dk ? 'bg-[#C9532A]/10 border-[#C9532A]/20' : 'bg-[#FEE9DF] border-[#F5C9B8]'}`}>
                    <p className="text-[10px] font-black text-[#C9532A] mb-2">⚠️ This clears your BMI, TDEE, and targets. Meal logs stay.</p>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await saveProfile({ age: undefined, height_cm: undefined, weight_kg: undefined, gender: undefined, activity_level: undefined, goal_type: undefined, bmi: undefined, tdee: undefined, onboarded: false } as any);
                        const updated = await getProfile();
                        if (updated) setProfile(updated);
                        setConfirmClearProfile(false);
                        showToast('Profile cleared.');
                      }} className="flex-1 py-2 rounded-xl bg-[#C9532A] text-white text-[9px] font-black uppercase transition-all active:scale-95">Yes, clear</button>
                      <button onClick={() => setConfirmClearProfile(false)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896]' : 'border-[#E8E2D2]'}`}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClearProfile(true)} className={`text-[9px] font-black opacity-40 hover:opacity-80 transition-opacity ${sub}`}>Clear body data & memory</button>
                )
              )}
            </div>

            <Field label="Email" dk={dk} sub={sub}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`}/>
            </Field>
            <Field label="Default Country" dk={dk} sub={sub}>
              <select value={country} onChange={e => setCountry(e.target.value as CountryKey)}
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`}>
                {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
              </select>
            </Field>
            <Field label="Default Meal Time" dk={dk} sub={sub}>
              <select value={time} onChange={e => setTime(e.target.value as TimeKey)}
                className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`}>
                {TIMES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
              </select>
            </Field>
            <ToggleRow label="Auto-Refresh on Visit"       active={autoRefresh}  onToggle={() => setAutoRefresh(!autoRefresh)}   sub={sub}/>
            <ToggleRow label="Daily Email Recommendations" active={isSubscribed} onToggle={() => setIsSubscribed(!isSubscribed)} sub={sub}/>
            <ToggleRow label="Dark Mode"                   active={darkMode}     onToggle={() => setDarkMode(!darkMode)}         sub={sub}/>

               {/* 🚨 THE VISUAL RESET BUTTON ENGINE */}
 {/* <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5">
   <button 
     type="button"
     onClick={handleUserReset} 
     className="w-full py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-600/20 transition-all duration-200 active:scale-[0.98]"
   >
     ⚠️ Reset Profile & App Memory
   </button>
   <p className="text-[9px] font-medium text-red-600/60 dark:text-red-400/40 mt-1.5 px-1 leading-normal">
     Warning: This will clear your personal weight, height, metrics, programs, and market plans. Your historical meal logs will remain untouched.
   </p>
 </div> */}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={() => { setShowSettings(false); setConfirmClearProfile(false); }} className={`flex-1 py-3.5 rounded-2xl font-bold text-sm border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896] hover:bg-white/5' : 'border-[#E8E2D2] hover:bg-[#F5EDD8]'}`}>Cancel</button>
            <button onClick={saveSettings} className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all active:scale-95 shadow-[0_4px_14px_rgba(201,83,42,0.28)]">Save ✓</button>
          </div>
        </Sheet>
      )}

      {/* History */}
      {showHistory && (
        <Sheet onClose={() => setShowHistory(false)} dk={dk} title="Today's Log 📊"
          titleRight={<span className={`text-xs font-bold ${sub}`}><span style={{ color:calColor }}>{totalCal}</span> / {dailyCalGoal} kcal</span>}>
          <div className={`rounded-2xl p-4 mb-5 ${dk ? 'bg-white/4' : 'bg-[#FDF9F0]'}`}>
            <div className={`h-2.5 rounded-full overflow-hidden ${dk ? 'bg-white/8' : 'bg-[#F0E8D8]'}`}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width:`${calPct}%`, background:`linear-gradient(90deg, ${calColor}88, ${calColor})` }}/>
            </div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-2.5 ${sub}`}>{calPct < 60 ? 'Under target — keep eating!' : calPct < 100 ? 'On track 👏' : '🎉 Daily goal reached!'}</p>
          </div>
          {loggedMeals.length === 0
            ? <div className="text-center py-10"><p className="text-4xl mb-3">🥢</p><p className={`text-sm ${sub}`}>No meals logged yet today.</p></div>
            : <div className="space-y-2.5">
                {loggedMeals.map((m, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${dk ? 'border-white/6 bg-white/3' : 'border-[#F0E8D8] bg-[#FDFAF5]'}`}>
                    <div><p className="text-sm font-bold">{m.name}</p><p className={`text-[10px] capitalize ${sub} mt-0.5`}>{m.time_slot}</p></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black" style={{ color:calColor }}>{m.amount} kcal</span>
                      <button onClick={() => removeLoggedMeal(i)} className={`text-lg leading-none ${sub} hover:text-[#C9532A] transition-colors`}>×</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </Sheet>
      )}

      {/* Planner */}
      {showPlanner && (
        <Sheet onClose={() => setShowPlanner(false)} dk={dk} title="📅 Plan Your Week" wide>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${dk ? 'bg-white/8 border-white/10 text-white/80' : 'bg-[#F5EDD8] border-[#E8D8C0] text-[#5C3D1E]'}`}>{COUNTRIES.find(c => c.id === country)?.flag} {COUNTRIES.find(c => c.id === country)?.name}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${dk ? 'bg-[#C9532A]/15 border-[#C9532A]/20 text-[#F5844C]' : 'bg-[#FEE9DF] border-[#F5C9B8] text-[#C9532A]'}`}>{VIBES.find(v => v.id === vibe)?.icon} {VIBES.find(v => v.id === vibe)?.label}</span>
          </div>
          {planDrifted && <button onClick={generateWeeklyPlan} className="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black border border-dashed border-amber-400/60 text-amber-500 bg-amber-400/8 hover:bg-amber-400/15 transition-all active:scale-95 animate-pulse hover:animate-none">🔄 Update plan for new filters</button>}
          <div className="flex flex-wrap gap-2 mb-6">
            {weeklyPlan
              ? <><button onClick={generateWeeklyPlan} className="px-4 py-2.5 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-xs font-black uppercase rounded-xl transition-all active:scale-95">🔄 Regenerate</button>
                  <button onClick={downloadWeeklyPlan} className="px-4 py-2.5 bg-[#5C7A5E] hover:bg-[#4a5d4a] text-white text-xs font-black uppercase rounded-xl transition-all active:scale-95">📸 Save as Image</button></>
              : <button onClick={generateWeeklyPlan} className="px-5 py-2.5 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-sm font-black uppercase rounded-xl transition-all active:scale-95">🎯 Generate Plan</button>
            }
          </div>
          {!weeklyPlan
            ? <div className="text-center py-8"><p className={`text-sm ${sub} mb-6 leading-relaxed`}>Generate a personalised 7-day meal plan based on your current vibe, country, and diet.</p><button onClick={generateWeeklyPlan} className="px-8 py-4 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-sm font-black uppercase rounded-2xl transition-all active:scale-95">🎯 Generate My Plan</button></div>
            : <div ref={weeklyExportRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#F8FAFC] rounded-[1.5rem]">
                {Object.entries(weeklyPlan).map(([day, meals]) => {
                  const total    = dayTotal(meals);
                  const onTarget = total >= 1500 && total <= dailyCalGoal;
                  const over     = total > dailyCalGoal;
                  return (
                    <div key={day} className="bg-white rounded-[1.25rem] p-4 border border-[#E2E8F0] shadow-sm flex flex-col">
                      <h3 className="text-sm font-black text-[#111827] mb-3">{day}</h3>
                      <div className="space-y-2 flex-1">
                        {Object.entries(meals).map(([t, m]) => (
                          <div key={t} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#F1F5F9]">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[8px] font-black uppercase text-[#94A3B8] tracking-widest">{t==='breakfast'?'🌅':t==='lunch'?'☀️':t==='dinner'?'🌙':'🍎'} {t}</span>
                              <span className="text-[8px] font-bold bg-[#EEF2FF] px-1.5 py-0.5 rounded-full text-[#6366F1]">{m.nutrition.calories}k</span>
                            </div>
                            <p className="text-[11px] font-bold text-[#1F2937] leading-tight">{m.name}</p>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-3 pt-3 border-t ${over ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase text-[#94A3B8]">Daily Total</span>
                          <span className={`text-[10px] font-black ${over ? 'text-[#C9532A]' : 'text-[#111827]'}`}>{total} kcal</span>
                        </div>
                        <p className={`text-[9px] font-bold mt-0.5 ${over ? 'text-[#C9532A]' : onTarget ? 'text-[#5C7A5E]' : 'text-[#94A3B8]'}`}>{over ? '⚠️ Over target' : onTarget ? '✅ On target' : '📉 Under target'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Sheet>
      )}

      {/* Market */}
    {/* Market */}
{showMarket && (
  <Sheet onClose={() => setShowMarket(false)} dk={dk} title="🛒 Market Plan">
    <MarketSheet
      dk={dk}
      sub={sub}
      inputCls={inputCls}
      marketPlan={marketPlan}
      weeklyPlan={weeklyPlan}
      profile={profile}
      email={email}
      onPlanGenerated={setMarketPlan}
      onClearPlan={() => setMarketPlan(null)}
      onEmailList={async () => {
        if (!marketPlan?.items || !email) {
          showToast('⚠️ Add your email in Settings first');
          return;
        }
        const lines = marketPlan.items
          .filter(i => !i.checked)
          .map(i => `• ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`);
        setEmailLoading(true);
        try {
          await emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
            {
              to_email:    email,
              meal_name:   '🛒 Your Market List',
              meal_desc:   lines.join('\n'),
              meal_cal:    `${lines.length} items to buy`,
              meal_protein:'', meal_carbs: '', meal_fat: '',
              healthy_tip: 'Tick off each item as you shop. Stay organised, eat well. 💎',
            },
            process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!,
          );
          showToast('📬 Market list sent to your inbox!');
        } catch { showToast('❌ Email failed — check settings'); }
        setEmailLoading(false);
      }}
      showToast={showToast}
    />
  </Sheet>
)}
      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingSheet dk={dk}
          onSkip={() => setShowOnboarding(false)}
          onDone={async (updatedProfile) => {
            setShowOnboarding(false);
            setProfile(updatedProfile);          // keep state in sync
            const { goal, source, hasActiveProgram } = await getEffectiveCalorieGoal();
            setDailyCalGoal(goal); setCalGoalSource(source); setHasActiveProgram(hasActiveProgram);
            const wg = await getWaterGoal(); setWaterGoal(wg);
            showToast(`💎 Profile saved! ${updatedProfile.tdee ? `TDEE: ${updatedProfile.tdee} kcal` : 'Targets updated.'}`);
          }}
        />
      )}

      {/* Program */}
      {showProgram && (
        <ProgramSheet dk={dk} suggestedCal={dailyCalGoal}
          onClose={() => setShowProgram(false)}
          onCreate={async () => {
            setShowProgram(false);
            const { goal, source, hasActiveProgram } = await getEffectiveCalorieGoal();
            setDailyCalGoal(goal); setHasActiveProgram(hasActiveProgram);
            const prog = await getProgramProgress(); setProgramProgress(prog);
            showToast('🎯 Program started! Track your progress daily.');
          }}
        />
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,14px) scale(0.94)} to{opacity:1;transform:translate(-50%,0) scale(1)} }
        .no-scrollbar::-webkit-scrollbar{display:none}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionLabel({ children, dk }: { children: React.ReactNode; dk: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-3.5 rounded-full bg-[#C9532A] flex-shrink-0" />
      <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${dk ? 'text-[#8B6D52]' : 'text-[#A67C52]'}`}>{children}</p>
    </div>
  );
}

function Sheet({ children, onClose, dk, title, titleRight, wide }: {
  children: React.ReactNode; onClose: () => void; dk: boolean;
  title?: string; titleRight?: React.ReactNode; wide?: boolean;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  const sheetBg = dk ? 'bg-[#141008]' : 'bg-white';
  const borderCl = dk ? 'border-white/6' : 'border-[#E8E0CC]';
  const hdBorder = dk ? 'border-white/5' : 'border-[#F0E8D8]';
  const closeBg  = dk ? 'bg-white/8 hover:bg-white/16 text-[#D4B896]' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]';
  const pillBg   = dk ? 'bg-white/15' : 'bg-[#D0C4B0]';
  return (
    <div ref={backdropRef} onClick={e => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-[200] flex flex-col justify-end sm:items-center sm:justify-center"
      style={{ background:'rgba(0,0,0,0.68)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)' }}>
      <div className={['w-full flex flex-col rounded-t-[2rem] sm:rounded-[2rem]','max-h-[92vh] sm:max-h-[88vh]', wide ? 'sm:max-w-5xl' : 'sm:max-w-md', sheetBg,'border',borderCl,'shadow-2xl','animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300'].join(' ')} onClick={e => e.stopPropagation()}>
        <div className={`flex-shrink-0 px-5 pt-4 pb-4 border-b ${hdBorder} ${sheetBg} rounded-t-[2rem] sticky top-0 z-10`}>
          <div className="flex justify-center mb-3 sm:hidden"><div className={`w-10 h-1 rounded-full ${pillBg}`}/></div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 pr-2">
              {title      && <h2 className="font-serif font-bold text-xl leading-snug">{title}</h2>}
              {titleRight && <div className="mt-0.5">{titleRight}</div>}
            </div>
            <button onClick={onClose} aria-label="Close" className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all active:scale-90 ${closeBg}`}>✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-10">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, dk, sub }: { label: string; children: React.ReactNode; dk: boolean; sub: string }) {
  return (
    <div>
      <label className={`text-[10px] font-black uppercase tracking-widest ${sub} mb-2 block`}>{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, active, onToggle, sub }: { label: string; active: boolean; onToggle: () => void; sub: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold flex-1 leading-snug">{label}</span>
      <button onClick={onToggle} className={`flex-shrink-0 w-12 h-6 rounded-full transition-all duration-300 relative ${active ? 'bg-[#C9532A] shadow-[0_0_10px_rgba(201,83,42,0.35)]' : 'bg-black/10'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${active ? 'left-[26px]' : 'left-0.5'}`}/>
      </button>
    </div>
  );
}
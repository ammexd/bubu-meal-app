// app/lib/db.ts  ── v2
// ══════════════════════════════════════════════════════════════════════════════
// All Supabase operations in one place.
// New in v2: nutrition programs · market plans · BMI/TDEE · conditional tracking
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id:             string;
  email:          string;
  display_name?:  string;
  username?:      string;
  // Body metrics
  age?:           number;
  height_cm?:     number;
  weight_kg?:     number;
  gender?:        'male' | 'female' | 'other';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal_type?:     'lose' | 'maintain' | 'gain';
  bmi?:           number;           // computed by DB trigger
  tdee?:          number;           // computed by DB trigger
  glass_size_ml?: number;
  // Goals
  daily_cal_goal?: number;          // user-set or trigger-computed
  // App state
  onboarded?:     boolean;
  dark_mode?:     boolean;
  auto_refresh?:  boolean;
  subscribed?:    boolean;
  streak?:        number;
  last_visit?:    string;
  weekly_plan?:   string;
  country?:       string;
  vibe?:          string;
  diet?:          string;
  current_phase?: string;
  is_legacy?:     boolean;
}

export interface MealLog {
  id?:         string;
  user_id?:    string;
  type:        'meal' | 'water';
  name?:       string;
  amount:      number;
  time_slot?:  string;
  country?:    string;
  image_url?:  string;
  logged_at?:  string;
}

export interface DaySummary {
  totalCal:     number;
  waterGlasses: number;
  meals:        MealLog[];
}

export interface NutritionProgram {
  id?:            string;
  user_id?:       string;
  title:          string;
  type:           'weekly' | 'monthly' | 'custom';
  goal_type:      'lose' | 'maintain' | 'gain';
  calorie_target: number;
  water_target:   number;
  start_date:     string;
  end_date:       string;
  is_active?:     boolean;
  completed?:     boolean;
}

export interface ProgramCheckin {
  id?:            string;
  program_id:     string;
  date:           string;
  calories_eaten: number;
  calorie_target: number;
  water_glasses:  number;
  water_target:   number;
  cal_hit?:       boolean;
  water_hit?:     boolean;
  streak_day?:    number;
}

export interface ProgramProgress {
  program:          NutritionProgram;
  totalDays:        number;
  daysCompleted:    number;
  daysRemaining:    number;
  calHitStreak:     number;
  waterHitStreak:   number;
  completionPct:    number;
  todayCheckin?:    ProgramCheckin;
}

export interface MarketPlan {
  id?:         string;
  user_id?:    string;
  title:       string;
  week_start:  string;
  generated?:  boolean;
  items?:      MarketItem[];
}

export type MarketCategory =
  | 'groceries' | 'protein' | 'dairy' | 'vegetables' | 'fruits'
  | 'snacks' | 'toiletries' | 'hygiene' | 'household' | 'other';

export interface MarketItem {
  id?:       string;
  plan_id?:  string;
  name:      string;
  category:  MarketCategory;
  quantity?: string;
  checked?:  boolean;
  source?:   'auto' | 'manual' | 'ai';
}

export interface SaveMealInput {
  name:      string;
  calories:  number;
  timeSlot:  string;
  country:   string;
  imageUrl?: string;
}

export interface BodyMetrics {
  bmi:          number;
  bmiCategory:  'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  tdee:         number;
  suggestedCal: number;
  waterGoal:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) { console.error('[db] getProfile:', error.message); return null; }
  return data as Profile;
}

export async function saveProfile(updates: Partial<Profile>): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...updates }, { onConflict: 'id' });

  if (error) { console.error('[db] saveProfile:', error.message); return false; }
  return true;
}

/**
 * Complete onboarding — saves body metrics and marks profile as onboarded.
 * The DB trigger will compute BMI + TDEE automatically.
 */
export async function completeOnboarding(data: {
  age:            number;
  height_cm:      number;
  weight_kg:      number;
  gender:         'male' | 'female' | 'other';
  activity_level: Profile['activity_level'];
  goal_type:      'lose' | 'maintain' | 'gain';
  calorie_target?: number;  // optional override; if omitted DB trigger sets it
}): Promise<{ profile: Profile | null; metrics: BodyMetrics | null }> {
  const ok = await saveProfile({ ...data, onboarded: true });
  if (!ok) return { profile: null, metrics: null };

  // Re-fetch so we get trigger-computed bmi + tdee
  const profile = await getProfile();
  const metrics  = profile ? computeBodyMetrics(profile) : null;
  return { profile, metrics };
}

/** Compute BMI + TDEE client-side (mirrors DB trigger, for instant UI feedback) */
export function computeBodyMetrics(p: Profile): BodyMetrics | null {
  if (!p.weight_kg || !p.height_cm || !p.age) return null;

  const heightM = p.height_cm / 100;
  const bmi     = Math.round((p.weight_kg / (heightM * heightM)) * 10) / 10;

  const bmiCategory: BodyMetrics['bmiCategory'] =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25   ? 'Normal'      :
    bmi < 30   ? 'Overweight'  : 'Obese';

  const bmr = p.gender === 'female'
    ? 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 161
    : 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 5;

  const af: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = Math.round(bmr * (af[p.activity_level ?? 'moderate'] ?? 1.55));

  const suggestedCal =
    p.goal_type === 'lose' ? tdee - 500 :
    p.goal_type === 'gain' ? tdee + 300 : tdee;

  const waterGoal = Math.max(8, Math.round((p.weight_kg * 35) / 250));

  return { bmi, bmiCategory, tdee, suggestedCal, waterGoal };
}

export async function updateStreak(): Promise<number> {
  const profile = await getProfile();
  if (!profile) return 0;

  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const lastVisit = profile.last_visit ?? '';

  let newStreak = profile.streak ?? 0;
  if (lastVisit === today) return newStreak;

  newStreak = lastVisit === yesterday ? newStreak + 1 : 1;
  await saveProfile({ streak: newStreak, last_visit: today });
  return newStreak;
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY CAL GOAL — DYNAMIC
// Respects: active program > profile override > TDEE > default 2000
// ─────────────────────────────────────────────────────────────────────────────

export async function getEffectiveCalorieGoal(): Promise<{
  goal:   number;
  source: 'program' | 'profile' | 'tdee' | 'default';
  hasActiveProgram: boolean;
}> {
  const user = await getUser();
  if (!user) return { goal: 2000, source: 'default', hasActiveProgram: false };

  // Check active program first
  const { data: prog } = await supabase
    .from('nutrition_programs')
    .select('calorie_target')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (prog) return {
    goal: prog.calorie_target,
    source: 'program',
    hasActiveProgram: true,
  };

  const profile = await getProfile();

  if (profile?.daily_cal_goal && profile.daily_cal_goal !== 2000) return {
    goal: profile.daily_cal_goal,
    source: 'profile',
    hasActiveProgram: false,
  };

  if (profile?.tdee) return {
    goal: profile.tdee,
    source: 'tdee',
    hasActiveProgram: false,
  };

  return { goal: 2000, source: 'default', hasActiveProgram: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// TODAY'S LOGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getTodaySummary(): Promise<DaySummary> {
  const user = await getUser();
  if (!user) return { totalCal: 0, waterGlasses: 0, meals: [] };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('logged_at', todayStart.toISOString())
    .order('logged_at', { ascending: true });

  if (error) { console.error('[db] getTodaySummary:', error.message); return { totalCal: 0, waterGlasses: 0, meals: [] }; }

  const logs        = (data ?? []) as MealLog[];
  const meals       = logs.filter(l => l.type === 'meal');
  const totalCal    = meals.reduce((s, m) => s + (m.amount ?? 0), 0);
  const waterGlasses = logs
    .filter(l => l.type === 'water')
    .reduce((s, l) => s + Math.round((l.amount ?? 250) / 250), 0);

  return { totalCal, waterGlasses, meals };
}

export async function logWater(glasses = 1): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const rows = Array.from({ length: glasses }, () => ({
    user_id: user.id, type: 'water' as const, amount: 250,
    logged_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('logs').insert(rows);
  if (error) console.error('[db] logWater:', error.message);
  return !error;
}

export async function resetWater(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  await supabase.from('logs').delete()
    .eq('user_id', user.id).eq('type', 'water')
    .gte('logged_at', todayStart.toISOString());
}

export async function removeMealLog(id: string): Promise<boolean> {
  const { error } = await supabase.from('logs').delete().eq('id', id);
  if (error) console.error('[db] removeMealLog:', error.message);
  return !error;
}

export async function getWaterGoal(): Promise<number> {
  const profile = await getProfile();
  if (!profile?.weight_kg) return 8;
  return Math.max(8, Math.round((profile.weight_kg * 35) / 250));
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE & LEARN  💎
// ─────────────────────────────────────────────────────────────────────────────

export async function saveToDiary(input: SaveMealInput): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const now = new Date().toISOString();

  const { error: logError } = await supabase.from('logs').insert({
    user_id:   user.id,
    type:      'meal',
    name:      input.name,
    amount:    input.calories,
    time_slot: input.timeSlot,
    country:   input.country,
    image_url: input.imageUrl ?? null,
    logged_at: now,
  });

  if (logError) { console.error('[db] saveToDiary → logs:', logError.message); return false; }

  // Behavioural learning — use food_name column (your existing schema)
  const { data: existing } = await supabase
    .from('food_preferences')
    .select('id, search_count, saved_count')
    .eq('user_id', user.id)
    .eq('food_name', input.name)
    .maybeSingle();

  if (existing) {
    await supabase.from('food_preferences').update({
      search_count:  (existing.search_count ?? 0) + 1,
      saved_count:   (existing.saved_count  ?? 0) + 1,
      last_selected: now,
    }).eq('id', existing.id);
  } else {
    await supabase.from('food_preferences').insert({
      user_id:       user.id,
      food_name:     input.name,
      meal_name:     input.name,
      country:       input.country,
      search_count:  1,
      saved_count:   1,
      last_selected: now,
    });
  }

  // Image cache
  if (input.imageUrl) {
    await supabase.from('food_image_cache').upsert(
      { food_name: input.name, meal_name: input.name, country: input.country,
        image_url: input.imageUrl, source: 'hybrid', cached_at: now },
      { onConflict: 'meal_name,country' }
    );
  }

  // Write today's program check-in if one is active
  await writeProgramCheckin();

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE CACHE
// ─────────────────────────────────────────────────────────────────────────────

export async function getCachedImage(mealName: string, country: string): Promise<string | null> {
  const { data } = await supabase
    .from('food_image_cache')
    .select('image_url')
    .or(`food_name.eq.${mealName},meal_name.eq.${mealName}`)
    .eq('country', country)
    .maybeSingle();
  return data?.image_url ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOD PREFERENCES / FAVOURITES
// ─────────────────────────────────────────────────────────────────────────────

export async function learnFoodPreference(foodName: string): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from('food_preferences')
    .select('id, search_count')
    .eq('user_id', user.id)
    .eq('food_name', foodName)
    .maybeSingle();

  if (existing) {
    await supabase.from('food_preferences')
      .update({ search_count: existing.search_count + 1, last_selected: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('food_preferences').insert({
      user_id: user.id, food_name: foodName, meal_name: foodName,
      search_count: 1, is_favorite: false, last_selected: new Date().toISOString(),
    });
  }
}

export async function toggleFavorite(foodName: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from('food_preferences')
    .select('id, is_favorite')
    .eq('user_id', user.id)
    .eq('food_name', foodName)
    .maybeSingle();

  const newVal = existing ? !existing.is_favorite : true;
  if (existing) {
    await supabase.from('food_preferences').update({ is_favorite: newVal }).eq('id', existing.id);
  } else {
    await supabase.from('food_preferences').insert({
      user_id: user.id, food_name: foodName, meal_name: foodName,
      search_count: 0, is_favorite: true,
    });
  }
  return newVal;
}

export async function getTopMeals(limit = 10): Promise<string[]> {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('food_preferences')
    .select('food_name, search_count, is_favorite')
    .eq('user_id', user.id)
    .order('is_favorite', { ascending: false })
    .order('search_count', { ascending: false })
    .limit(limit);
  return data?.map(d => d.food_name) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// NUTRITION PROGRAMS
// ─────────────────────────────────────────────────────────────────────────────

/** Create a new program. Deactivates any previous active program first. */
export async function createProgram(input: Omit<NutritionProgram, 'id' | 'user_id'>): Promise<NutritionProgram | null> {
  const user = await getUser();
  if (!user) return null;

  // Deactivate old active program
  await supabase.from('nutrition_programs')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const { data, error } = await supabase
    .from('nutrition_programs')
    .insert({ user_id: user.id, ...input, is_active: true, completed: false })
    .select()
    .single();

  if (error) { console.error('[db] createProgram:', error.message); return null; }

  // Sync daily_cal_goal on profile
  await saveProfile({ daily_cal_goal: input.calorie_target });

  return data as NutritionProgram;
}

export async function getActiveProgram(): Promise<NutritionProgram | null> {
  const user = await getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('nutrition_programs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  return data as NutritionProgram | null;
}

export async function getProgramHistory(): Promise<NutritionProgram[]> {
  const user = await getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('nutrition_programs')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })
    .limit(10);

  return (data ?? []) as NutritionProgram[];
}

export async function cancelProgram(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from('nutrition_programs')
    .update({ is_active: false })
    .eq('user_id', user.id).eq('is_active', true);
}

/** Write or update today's check-in for the active program */
async function writeProgramCheckin(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const program = await getActiveProgram();
  if (!program?.id) return;

  const today = new Date().toISOString().split('T')[0];
  const summary = await getTodaySummary();

  await supabase.from('program_checkins').upsert(
    {
      user_id:        user.id,
      program_id:     program.id,
      date:           today,
      calories_eaten: summary.totalCal,
      calorie_target: program.calorie_target,
      water_glasses:  summary.waterGlasses,
      water_target:   program.water_target,
    },
    { onConflict: 'user_id,program_id,date' }
  );
}

export async function getProgramProgress(): Promise<ProgramProgress | null> {
  const user = await getUser();
  if (!user) return null;

  const program = await getActiveProgram();
  if (!program?.id) return null;

  const start = new Date(program.start_date);
  const end   = new Date(program.end_date);
  const today = new Date();

  const totalDays     = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const daysCompleted = Math.min(
    Math.ceil((today.getTime() - start.getTime()) / 86_400_000),
    totalDays
  );
  const daysRemaining  = Math.max(0, totalDays - daysCompleted);
  const completionPct  = Math.round((daysCompleted / totalDays) * 100);

  const { data: checkins } = await supabase
    .from('program_checkins')
    .select('*')
    .eq('program_id', program.id)
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  const todayStr     = today.toISOString().split('T')[0];
  const todayCheckin = (checkins ?? []).find(c => c.date === todayStr) as ProgramCheckin | undefined;

  // Compute current cal + water streaks
  let calStreak = 0, waterStreak = 0;
  for (const c of (checkins ?? [])) {
    if (c.cal_hit)   calStreak++;   else break;
  }
  for (const c of (checkins ?? [])) {
    if (c.water_hit) waterStreak++; else break;
  }

  return {
    program, totalDays, daysCompleted, daysRemaining,
    completionPct, calHitStreak: calStreak,
    waterHitStreak: waterStreak, todayCheckin,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKET PLANS
// ─────────────────────────────────────────────────────────────────────────────

/** Items auto-generated from profile + meal plan + gender logic */
function buildAutoItems(profile: Profile, mealIngredients: string[]): Omit<MarketItem, 'id' | 'plan_id'>[] {
  const items: Omit<MarketItem, 'id' | 'plan_id'>[] = [];

  // Dedupe and categorise meal ingredients
  const seen = new Set<string>();
  for (const ing of mealIngredients) {
    const key = ing.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    const cat: MarketCategory =
      /chicken|beef|fish|turkey|lamb|pork|egg|prawn|shrimp|sardine/i.test(key) ? 'protein' :
      /milk|yogurt|cheese|cream|butter/i.test(key)                             ? 'dairy'   :
      /spinach|tomato|onion|pepper|carrot|cabbage|okra|yam|plantain|cassava/i.test(key) ? 'vegetables' :
      /mango|banana|orange|watermelon|pineapple|pawpaw|guava/i.test(key)       ? 'fruits'  :
      /rice|garri|flour|pasta|noodle|bread/i.test(key)                        ? 'groceries' :
      'groceries';

    items.push({ name: ing, category: cat, quantity: '1 pack', checked: false, source: 'auto' });
  }

  // Profile-based essentials
  const essentials: Omit<MarketItem, 'id' | 'plan_id'>[] = [
    { name: 'Drinking Water (sachet or bottle)', category: 'groceries', quantity: '2 packs', checked: false, source: 'auto' },
    { name: 'Toothpaste',         category: 'toiletries', quantity: '1 tube',  checked: false, source: 'auto' },
    { name: 'Toothbrush',         category: 'toiletries', quantity: '1',       checked: false, source: 'auto' },
    { name: 'Bar Soap / Body Wash',category: 'hygiene',   quantity: '2 bars',  checked: false, source: 'auto' },
    { name: 'Tissue / Toilet Roll',category: 'household', quantity: '1 pack',  checked: false, source: 'auto' },
  ];

  // Gender-specific
  if (profile.gender === 'female') {
    essentials.push(
      { name: 'Sanitary Pads',    category: 'hygiene',   quantity: '1 pack', checked: false, source: 'auto' },
      { name: 'Facial Cleanser',  category: 'hygiene',   quantity: '1',      checked: false, source: 'auto' },
      { name: 'Body Lotion',      category: 'toiletries',quantity: '1',      checked: false, source: 'auto' }
    );
  }

  // Goal-based protein boost
  if (profile.goal_type === 'gain' || profile.goal_type === 'lose') {
    essentials.push(
      { name: 'Eggs (crate)',     category: 'protein',   quantity: '1 crate', checked: false, source: 'auto' },
      { name: 'Groundnut (peanut butter)', category: 'protein', quantity: '1 jar', checked: false, source: 'auto' }
    );
  }

  return [...items, ...essentials];
}

export async function generateMarketPlan(mealIngredients: string[] = []): Promise<MarketPlan | null> {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile();
  if (!profile) return null;

  // Create plan
  const today = new Date().toISOString().split('T')[0];
  const { data: plan, error } = await supabase
    .from('market_plans')
    .insert({ user_id: user.id, title: 'Weekly Market Run', week_start: today, generated: true })
    .select()
    .single();

  if (error || !plan) { console.error('[db] generateMarketPlan:', error?.message); return null; }

  // Build + insert items
  const autoItems = buildAutoItems(profile, mealIngredients);
  if (autoItems.length) {
    await supabase.from('market_items').insert(
      autoItems.map(item => ({ ...item, plan_id: plan.id, user_id: user.id }))
    );
  }

  return getLatestMarketPlan();
}

export async function getLatestMarketPlan(): Promise<MarketPlan | null> {
  const user = await getUser();
  if (!user) return null;

  const { data: plan } = await supabase
    .from('market_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) return null;

  const { data: items } = await supabase
    .from('market_items')
    .select('*')
    .eq('plan_id', plan.id)
    .order('category');

  return { ...plan, items: (items ?? []) as MarketItem[] };
}

export async function addMarketItem(planId: string, item: Omit<MarketItem, 'id' | 'plan_id'>): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const { error } = await supabase.from('market_items')
    .insert({ ...item, plan_id: planId, user_id: user.id, source: 'manual' });
  if (error) console.error('[db] addMarketItem:', error.message);
  return !error;
}

export async function toggleMarketItem(itemId: string, checked: boolean): Promise<void> {
  await supabase.from('market_items').update({ checked }).eq('id', itemId);
}

export async function deleteMarketItem(itemId: string): Promise<void> {
  await supabase.from('market_items').delete().eq('id', itemId);
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL MILESTONE GUARD
// Prevents the same email type from sending more than once per day
// ─────────────────────────────────────────────────────────────────────────────

export async function canSendEmail(type: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', type)
    .gte('sent_at', todayStart.toISOString())
    .maybeSingle();

  return !data; // true = no email of this type sent today
}

export async function logEmailSent(type: string, metadata?: object): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await supabase.from('email_log').insert({ user_id: user.id, type, metadata });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY PLAN PERSISTENCE
// ─────────────────────────────────────────────────────────────────────────────

export async function saveWeeklyPlan(plan: unknown): Promise<void> {
  await saveProfile({ weekly_plan: JSON.stringify(plan) });
}

export async function getWeeklyPlan(): Promise<unknown | null> {
  const profile = await getProfile();
  const raw = profile?.weekly_plan;
  if (!raw || typeof raw !== 'string') return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function getMealHistory(days = 30) {
  const user = await getUser();
  if (!user) return [];
  const from = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from('logs')
    .select('id, name, amount, time_slot, image_url, logged_at')
    .eq('user_id', user.id).eq('type', 'meal')
    .gte('logged_at', from)
    .order('logged_at', { ascending: false });
  return data ?? [];
}

export async function createMarketSnapshot(
  items: Omit<MarketItem, 'id' | 'plan_id'>[]
): Promise<MarketPlan | null> {
  const user = await getUser();
  if (!user) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data: plan, error } = await supabase
    .from('market_plans')
    .insert({ user_id: user.id, title: 'Weekly Market Run', week_start: today, generated: true })
    .select()
    .single();

  if (error || !plan) { console.error('[db] createMarketSnapshot:', error?.message); return null; }

  if (items.length) {
    await supabase.from('market_items').insert(
      items.map(item => ({ ...item, plan_id: plan.id, user_id: user.id }))
    );
  }

  return getLatestMarketPlan();
}
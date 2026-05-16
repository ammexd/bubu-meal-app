// ══════════════════════════════════════════════════════════════════════════════
// FILE 2:  app/api/reset-user/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Clean server-side reset. Wipes: profile body metrics, meal plan, market
// plans, nutrition programs, food preferences. Keeps auth + meal logs.
// Called from Settings sheet "Reset My Setup" flow.
// ══════════════════════════════════════════════════════════════════════════════
 
// Save as: app/api/reset-user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
 
export const runtime = 'nodejs';
 
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
 
  // Use the user's token to respect RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
 
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 
  try {
    const uid = user.id;
 
    // 1. Reset profile body fields (preserve email, country, dark_mode, etc.)
    await supabase.from('profiles').update({
      onboarded:      false,
      age:            null,
      height_cm:      null,
      weight_kg:      null,
      gender:         null,
      activity_level: null,
      goal_type:      null,
      bmi:            null,
      tdee:           null,
      daily_cal_goal: 2000,
      weekly_plan:    null,
      current_phase:  null,
      streak:         0,
    }).eq('id', uid);
 
    // 2. Remove market plans (cascade deletes market_items via FK)
    await supabase.from('market_plans').delete().eq('user_id', uid);
 
    // 3. Remove nutrition programs (cascade deletes program_checkins)
    await supabase.from('nutrition_programs').delete().eq('user_id', uid);
 
    // 4. Clear food preferences (learned behaviour resets with profile)
    await supabase.from('food_preferences').delete().eq('user_id', uid);
 
    // 5. Clear email log (allows fresh reminder sending)
    await supabase.from('email_log').delete().eq('user_id', uid);
 
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reset-user]', err);
    return NextResponse.json({ error: 'Reset failed — check server logs' }, { status: 500 });
  }
}

// ─── HOW TO CALL FROM CLIENT ─────────────────────────────────────────────────
// 
// const { data: { session } } = await supabase.auth.getSession();
// const res = await fetch('/api/reset-user', {
//   method: 'POST',
//   headers: { 'Authorization': `Bearer ${session?.access_token}` },
// });
// if (res.ok) { router.push('/'); setShowOnboarding(true); }
 
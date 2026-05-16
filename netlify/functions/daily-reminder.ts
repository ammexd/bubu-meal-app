// netlify/functions/daily-reminder.ts
// ══════════════════════════════════════════════════════════════════════════════
// Scheduled Netlify function — runs on a cron schedule
// Sends personalised daily emails only to users who opted in.
//
// Schedule (in netlify.toml):
//   [functions.daily-reminder]
//   schedule = "0 8 * * *"   ← 8 AM UTC daily
//
// ONLY sends emails when:
//   1. User has subscribed = true in their profile
//   2. User has a valid email
//   3. The specific email type hasn't been sent today (email_log guard)
//
// Respects all user preferences — nothing is forced.
// ══════════════════════════════════════════════════════════════════════════════

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase admin client (service role — bypasses RLS for scheduled jobs) ──
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // ← add this to Netlify env vars
  { auth: { persistSession: false } }
);

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bubu.app';
const FROM     = process.env.EMAIL_FROM ?? 'BuBu NourishSelect <hello@bubu.app>';
const API_KEY  = process.env.RESEND_API_KEY;

// ─── Send one email via Resend ────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!API_KEY) { console.log('[Reminder] No API key — skipping send to', to); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Reminder] Send failed:', err);
    return false;
  }
}

// ─── Log that an email was sent (prevents duplicates) ────────────────────────
async function logEmailSent(userId: string, type: string): Promise<void> {
  await supabase.from('email_log').insert({ user_id: userId, type, sent_at: new Date().toISOString() });
}

// ─── Check if email already sent today ───────────────────────────────────────
async function alreadySentToday(userId: string, type: string): Promise<boolean> {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('email_log')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('sent_at', todayStart.toISOString())
    .maybeSingle();
  return !!data;
}

// ─── Get today's summary for a user ──────────────────────────────────────────
async function getTodaySummary(userId: string) {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('logs')
    .select('type, name, amount')
    .eq('user_id', userId)
    .gte('logged_at', todayStart.toISOString());

  const logs  = data ?? [];
  const meals = logs.filter(l => l.type === 'meal');
  const water = logs.filter(l => l.type === 'water');
  return {
    totalCal:    meals.reduce((s, m) => s + (m.amount ?? 0), 0),
    mealNames:   meals.map(m => m.name).filter(Boolean),
    waterGlasses: water.reduce((s, l) => s + Math.round((l.amount ?? 250) / 250), 0),
  };
}

// ─── Pick a random meal suggestion ───────────────────────────────────────────
function getRandomMealSuggestion(country: string): string {
  const suggestions: Record<string, string[]> = {
    ng: ['Jollof Rice & Chicken', 'Pounded Yam & Egusi Soup', 'Amala & Ewedu', 'Moi Moi & Ogi', 'Beans & Dodo'],
    gh: ['Jollof Rice & Tilapia', 'Fufu & Light Soup', 'Waakye', 'Kelewele'],
    za: ['Braai & Pap', 'Bobotie & Yellow Rice', 'Bunny Chow'],
    us: ['Grilled Chicken & Salad', 'Avocado Toast', 'Greek Yogurt Parfait'],
    gb: ['Fish & Chips', 'Sunday Roast', 'Chicken Tikka Masala'],
  };
  const list = suggestions[country] ?? suggestions['ng'];
  return list[Math.floor(Math.random() * list.length)];
}

// ─── Brand-consistent email layout ───────────────────────────────────────────
function emailLayout(content: string, preview = ''): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${preview ? `<span style="display:none;max-height:0;overflow:hidden;">${preview}</span>` : ''}
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FBF6EE;color:#1C1008}</style>
</head><body style="background:#FBF6EE;padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding:0 0 24px;text-align:center">
<p style="font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#A67C52;margin-bottom:6px">BuBu</p>
<h1 style="font-family:Georgia,serif;font-style:italic;font-size:26px;font-weight:700;color:#1C1008;letter-spacing:-.5px">Nourish<span style="color:#C9532A">Select</span> 💎</h1>
</td></tr>
<tr><td style="background:#fff;border-radius:24px;border:.5px solid rgba(90,55,20,.12);overflow:hidden;box-shadow:0 4px 24px rgba(28,16,8,.08)">
${content}
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center">
<p style="font-size:11px;color:#A67C52;line-height:1.6">Sent by BuBu NourishSelect · Your personal nutrition companion<br>
<a href="${APP_URL}/settings" style="color:#A67C52;text-decoration:underline">Manage preferences</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

// ─── TEMPLATE: Daily digest ───────────────────────────────────────────────────
function dailyDigestHtml(opts: {
  name?: string; calories: number; calGoal: number;
  water: number; waterGoal: number; meals: string[];
  streak: number; suggestedMeal: string;
}): { subject: string; html: string } {
  const calPct   = Math.min(100, Math.round((opts.calories / opts.calGoal) * 100));
  const waterPct = Math.min(100, Math.round((opts.water / opts.waterGoal) * 100));
  const calColor = calPct >= 90 ? '#5C7A5E' : calPct >= 60 ? '#D4870D' : '#C9532A';

  const subject = `📊 ${opts.name ? `Hey ${opts.name}` : 'Hey Bubu'} — here's your daily summary`;

  const html = emailLayout(`
    <div style="padding:28px">
      <p style="font-size:9px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#A67C52;margin-bottom:8px">📊 Daily Summary</p>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1C1008;margin-bottom:4px">
        ${opts.name ? `Hey ${opts.name} 👋` : 'Good evening, Bubu 👋'}
      </h2>
      <p style="font-size:13px;color:#A67C52;margin-bottom:24px">
        Here's how today went${opts.streak > 1 ? ` · 🔥 ${opts.streak}-day streak` : ''}.
      </p>

      <!-- Stats -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td style="width:50%;padding-right:8px">
            <div style="background:#FBF6EE;border-radius:14px;padding:16px;text-align:center">
              <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#A67C52;margin-bottom:6px">🔥 Calories</p>
              <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:${calColor}">${opts.calories}</p>
              <p style="font-size:10px;color:#A67C52">of ${opts.calGoal} kcal · ${calPct}%</p>
              <div style="background:rgba(0,0,0,.08);border-radius:999px;height:4px;margin-top:8px;overflow:hidden">
                <div style="background:${calColor};width:${calPct}%;height:100%;border-radius:999px"></div>
              </div>
            </div>
          </td>
          <td style="width:50%;padding-left:8px">
            <div style="background:rgba(10,40,64,.96);border-radius:14px;padding:16px;text-align:center">
              <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:rgba(56,189,248,.6);margin-bottom:6px">💧 Water</p>
              <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#7DD3FC">${opts.water}</p>
              <p style="font-size:10px;color:rgba(56,189,248,.5)">of ${opts.waterGoal} glasses · ${waterPct}%</p>
              <div style="background:rgba(255,255,255,.1);border-radius:999px;height:4px;margin-top:8px;overflow:hidden">
                <div style="background:#38bdf8;width:${waterPct}%;height:100%;border-radius:999px"></div>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Meals -->
      ${opts.meals.length ? `
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#A67C52;margin-bottom:10px">🍽️ Meals logged</p>
        ${opts.meals.map(m => `<div style="padding:10px 12px;background:#FBF6EE;border-radius:10px;margin-bottom:6px;font-size:13px;color:#1C1008">✓ ${m}</div>`).join('')}
        <div style="margin-bottom:20px"></div>
      ` : '<p style="font-size:13px;color:#A67C52;margin-bottom:20px">No meals logged today — don\'t forget to fuel up! 🍽️</p>'}

      <!-- Tomorrow suggestion -->
      <div style="padding:16px;background:#FBF6EE;border-radius:14px;margin-bottom:24px">
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#A67C52;margin-bottom:6px">🌅 Try tomorrow</p>
        <p style="font-size:14px;font-weight:700;color:#1C1008">${opts.suggestedMeal}</p>
      </div>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:#C9532A;color:#fff;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px rgba(201,83,42,.3)">
            Open BuBu App →
          </a>
        </td></tr>
      </table>
    </div>
  `, subject);

  return { subject, html };
}

// ─── TEMPLATE: Hydration nudge ────────────────────────────────────────────────
function hydrationNudgeHtml(glasses: number, goal: number): { subject: string; html: string } {
  const remaining = Math.max(0, goal - glasses);
  const subject   = `💧 ${remaining} glass${remaining !== 1 ? 'es' : ''} to go — you can do it!`;
  const pct       = Math.round((glasses / goal) * 100);

  const html = emailLayout(`
    <div style="padding:28px;text-align:center">
      <p style="font-size:52px;margin-bottom:16px">💧</p>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1C1008;margin-bottom:8px">
        ${remaining} glass${remaining !== 1 ? 'es' : ''} to reach your goal
      </h2>
      <p style="font-size:13px;color:#A67C52;margin-bottom:24px">${glasses} of ${goal} glasses today</p>
      <div style="background:rgba(56,189,248,.15);border-radius:999px;height:10px;width:100%;margin-bottom:24px;overflow:hidden">
        <div style="background:#38bdf8;width:${pct}%;height:100%;border-radius:999px"></div>
      </div>
      <p style="font-size:13px;line-height:1.7;color:#1C1008;margin-bottom:24px">
        Water is the original energy drink. Sip up — your mind and skin will thank you. ✨
      </p>
      <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:#0A2840;color:#7DD3FC;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:14px;text-decoration:none">
        Log Water Now 💧
      </a>
    </div>
  `, subject);

  return { subject, html };
}

// ─── TEMPLATE: Calorie reminder ───────────────────────────────────────────────
function calorieReminderHtml(calories: number, goal: number, suggestedMeal: string): { subject: string; html: string } {
  const remaining = Math.max(0, goal - calories);
  const subject   = `🔥 ${remaining} kcal remaining — keep going!`;

  const html = emailLayout(`
    <div style="padding:28px;text-align:center">
      <p style="font-size:48px;margin-bottom:16px">🔥</p>
      <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1C1008;margin-bottom:8px">
        ${remaining} kcal left today
      </h2>
      <p style="font-size:13px;color:#A67C52;margin-bottom:20px">${calories} of ${goal} kcal eaten</p>
      <div style="background:#FBF6EE;border-radius:14px;padding:16px;margin-bottom:24px;text-align:left">
        <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.15em;color:#A67C52;margin-bottom:6px">🍽️ Could hit your target</p>
        <p style="font-size:14px;font-weight:700;color:#1C1008">${suggestedMeal}</p>
      </div>
      <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;background:#C9532A;color:#fff;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;border-radius:14px;text-decoration:none;box-shadow:0 4px 14px rgba(201,83,42,.3)">
        Log a Meal →
      </a>
    </div>
  `, subject);

  return { subject, html };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
  const startTime = Date.now();
  console.log('[DailyReminder] Starting at', new Date().toISOString());

  // Allow manual trigger via POST (for testing)
  const isManual = event.httpMethod === 'POST';

  try {
    // ── 1. Fetch all subscribed users ──────────────────────────────────────
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, subscribed, country, streak, weight_kg, daily_cal_goal, tdee, gender')
      .eq('subscribed', true)
      .not('email', 'is', null);

    if (error) {
      console.error('[DailyReminder] Profile fetch error:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const users = (profiles ?? []).filter(p => p.email && p.email.includes('@'));
    console.log(`[DailyReminder] Processing ${users.length} subscribed users`);

    let sent = 0; let skipped = 0; let failed = 0;

    // ── 2. Process each user ───────────────────────────────────────────────
    for (const user of users) {
      try {
        const today    = await getTodaySummary(user.id);
        const calGoal  = user.daily_cal_goal ?? user.tdee ?? 2000;
        const waterGoal = user.weight_kg ? Math.max(8, Math.round((user.weight_kg * 35) / 250)) : 8;
        const country  = user.country ?? 'ng';

        // ── Daily digest (always, once per day if subscribed) ──────────────
        const digestKey = 'daily_digest';
        if (isManual || !(await alreadySentToday(user.id, digestKey))) {
          const { subject, html } = dailyDigestHtml({
            name:         user.display_name ?? undefined,
            calories:     today.totalCal,
            calGoal,
            water:        today.waterGlasses,
            waterGoal,
            meals:        today.mealNames,
            streak:       user.streak ?? 0,
            suggestedMeal: getRandomMealSuggestion(country),
          });
          const ok = await sendEmail(user.email, subject, html);
          if (ok) { await logEmailSent(user.id, digestKey); sent++; }
          else     { failed++; }
        } else {
          skipped++;
        }

        // ── Hydration nudge (only if < 50% of water goal by 2pm UTC) ──────
        const hour = new Date().getUTCHours();
        const hydrationKey = 'hydration_nudge';
        if (hour >= 14 && today.waterGlasses < Math.floor(waterGoal * 0.5)) {
          if (isManual || !(await alreadySentToday(user.id, hydrationKey))) {
            const { subject, html } = hydrationNudgeHtml(today.waterGlasses, waterGoal);
            const ok = await sendEmail(user.email, subject, html);
            if (ok) await logEmailSent(user.id, hydrationKey);
          }
        }

        // ── Calorie nudge (only if < 40% of goal logged by 1pm UTC) ───────
        const calKey = 'calorie_nudge';
        if (hour >= 13 && today.totalCal < calGoal * 0.4) {
          if (isManual || !(await alreadySentToday(user.id, calKey))) {
            const { subject, html } = calorieReminderHtml(today.totalCal, calGoal, getRandomMealSuggestion(country));
            const ok = await sendEmail(user.email, subject, html);
            if (ok) await logEmailSent(user.id, calKey);
          }
        }

        // Tiny delay to avoid Resend rate limits (100/s on free tier)
        await new Promise(r => setTimeout(r, 50));

      } catch (userErr) {
        console.error(`[DailyReminder] Error for user ${user.id}:`, userErr);
        failed++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[DailyReminder] Done in ${duration}ms — sent:${sent} skipped:${skipped} failed:${failed}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, users: users.length, sent, skipped, failed, duration }),
    };

  } catch (err) {
    console.error('[DailyReminder] Fatal error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
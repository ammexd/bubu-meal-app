import { NextResponse } from 'next/server';
import { pickMeal, getRandomTip } from '../../../lib/foodBrain';

export const maxDuration = 60;

/*
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  BUBU NOURISHSELECT — DAILY MEAL REMINDER CRON JOB                     │
  │                                                                         │
  │  Schedule (vercel.json):                                                │
  │    "crons": [{ "path": "/api/cron/remind", "schedule": "0 7,12,18 * * *" }]
  │                                                                         │
  │  That fires at 07:00, 12:00, and 18:00 UTC.                            │
  │  Nigeria (WAT) = UTC+1 → lands at 08:00, 13:00, 19:00 WAT.            │
  │  UK (GMT/BST) is UTC+0 or UTC+1 depending on season.                   │
  │                                                                         │
  │  Env vars required:                                                     │
  │    CRON_SECRET                      — random secret for auth header    │
  │    NEXT_PUBLIC_EMAILJS_SERVICE_ID   — EmailJS service id               │
  │    NEXT_PUBLIC_EMAILJS_TEMPLATE_ID  — EmailJS template id              │
  │    NEXT_PUBLIC_EMAILJS_PUBLIC_KEY   — EmailJS public key               │
  │    BUBU_EMAIL                       — recipient email address           │
  └─────────────────────────────────────────────────────────────────────────┘
*/

// ─────────────────────────────────────────────────────────────────────────────
// TIME → MEAL SLOT MAPPING
// ─────────────────────────────────────────────────────────────────────────────

function getTimeKey(): 'breakfast' | 'lunch' | 'dinner' {
  // UTC hours — matches the cron schedule above
  const utcHour = new Date().getUTCHours();

  //  07:00 UTC → breakfast
  //  12:00 UTC → lunch
  //  18:00 UTC → dinner
  if (utcHour < 10) return 'breakfast';
  if (utcHour < 15) return 'lunch';
  return 'dinner';
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAILJS REST API — CORRECT ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
//
//  ⚠️  YOUR ORIGINAL BUG: you used "https://emailjs.com" — that is the
//      marketing website, NOT the API. The real endpoint is below.
//
const EMAILJS_API = 'https://api.emailjs.com/api/v1.0/email/send';

async function sendReminderEmail(params: {
  toEmail:    string;
  mealName:   string;
  mealDesc:   string;
  mealCal:    number;
  mealProtein:number;
  mealCarbs:  number;
  mealFat:    number;
  healthyTip: string;
}) {
  const body = {
    service_id:  process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
    template_id: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
    user_id:     process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
    // ↑ user_id is the PUBLIC key in EmailJS REST API (not private key)
    template_params: {
      to_email:    params.toEmail,
      meal_name:   params.mealName,
      meal_desc:   params.mealDesc,
      meal_cal:    params.mealCal,
      meal_protein:params.mealProtein,
      meal_carbs:  params.mealCarbs,
      meal_fat:    params.mealFat,
      healthy_tip: params.healthyTip,
      // Optional extras the template can use
      time_of_day: getTimeKey(),
      sent_at:     new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' }),
    },
  };

  const res = await fetch(EMAILJS_API, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EmailJS API error ${res.status}: ${text}`);
  }

  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {

  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  //
  //  Vercel sends: Authorization: Bearer <CRON_SECRET>
  //  Add CRON_SECRET to your env vars (generate one at: openssl rand -hex 32)
  //
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] Unauthorized attempt — wrong or missing CRON_SECRET');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── 2. Env var guard ──────────────────────────────────────────────────────
  const missingVars = [
    'NEXT_PUBLIC_EMAILJS_SERVICE_ID',
    'NEXT_PUBLIC_EMAILJS_TEMPLATE_ID',
    'NEXT_PUBLIC_EMAILJS_PUBLIC_KEY',
    'BUBU_EMAIL',
  ].filter(key => !process.env[key]);

  if (missingVars.length > 0) {
    console.error('[CRON] Missing env vars:', missingVars.join(', '));
    return NextResponse.json(
      { error: 'Missing environment variables', vars: missingVars },
      { status: 500 }
    );
  }

  // ── 3. Build meal ─────────────────────────────────────────────────────────
  try {
    const timeKey  = getTimeKey();
    const meal     = pickMeal('ng', timeKey, 'all', 'All', null);

    if (!meal) {
      console.error('[CRON] pickMeal returned null for', timeKey);
      return NextResponse.json({ error: 'No meal found' }, { status: 500 });
    }

    // ── 4. Send email ──────────────────────────────────────────────────────
    await sendReminderEmail({
      toEmail:     process.env.BUBU_EMAIL!,
      mealName:    meal.name,
      mealDesc:    meal.description,
      mealCal:     meal.nutrition.calories,
      mealProtein: meal.nutrition.protein,
      mealCarbs:   meal.nutrition.carbs,
      mealFat:     meal.nutrition.fat,
      healthyTip:  getRandomTip(),
    });

    const log = {
      success:   true,
      meal:      meal.name,
      timeSlot:  timeKey,
      cuisine:   meal.cuisine,
      calories:  meal.nutrition.calories,
      sentTo:    process.env.BUBU_EMAIL!.replace(/(?<=.{3}).(?=[^@]*@)/g, '*'),
      timestamp: new Date().toISOString(),
    };

    console.log('[CRON] Reminder sent:', log);
    return NextResponse.json(log, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CRON] Failed:', message);
    return NextResponse.json(
      { error: 'Cron job failed', detail: message },
      { status: 500 }
    );
  }
}
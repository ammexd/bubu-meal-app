// app/lib/email.ts
// ══════════════════════════════════════════════════════════════════════════════
// Self-owned email infrastructure — no EmailJS dependency
// Provider: Resend (resend.com) — free 100/day, 3,000/month
// Swap RESEND_API_KEY for any provider with a POST /emails endpoint
// All templates are plain TypeScript functions → HTML strings
// ══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS  (matches app brand)
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  cream:   '#FBF6EE',
  brown:   '#1C1008',
  terra:   '#C9532A',
  sage:    '#5C7A5E',
  amber:   '#D4870D',
  blue:    '#38bdf8',
  subtext: '#A67C52',
};

// ─────────────────────────────────────────────────────────────────────────────
// BASE LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
function layout(content: string, previewText = ''): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>BuBu NourishSelect</title>
  ${previewText ? `<span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: ${BRAND.cream}; color: ${BRAND.brown}; }
    a { color: ${BRAND.terra}; text-decoration: none; }
    @media (max-width: 600px) { .container { padding: 16px !important; } .card { border-radius: 16px !important; } }
  </style>
</head>
<body style="background-color:${BRAND.cream}; padding: 32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table width="560" class="container" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px; text-align: center;">
              <p style="font-size:11px; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; color:${BRAND.subtext}; margin-bottom:6px;">BuBu</p>
              <h1 style="font-family: Georgia, 'Times New Roman', serif; font-style:italic; font-size:26px; font-weight:700; color:${BRAND.brown}; letter-spacing:-0.5px;">
                Nourish<span style="color:${BRAND.terra};">Select</span> 💎
              </h1>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="card" style="background:#fff; border-radius:24px; border:0.5px solid rgba(90,55,20,0.12); overflow:hidden; box-shadow: 0 4px 24px rgba(28,16,8,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0; text-align:center;">
              <p style="font-size:11px; color:${BRAND.subtext}; line-height:1.6;">
                Sent by BuBu NourishSelect &middot; Your personal nutrition companion<br>
                <a href="#" style="color:${BRAND.subtext}; text-decoration:underline;">Unsubscribe</a> &middot; <a href="#" style="color:${BRAND.subtext}; text-decoration:underline;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

// Reusable section heading inside a card
function section(emoji: string, label: string): string {
  return `<p style="font-size:9px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; color:${BRAND.subtext}; margin-bottom:8px;">${emoji} ${label}</p>`;
}

// Reusable CTA button
function ctaButton(text: string, href: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td align="center" style="padding:24px 0 0;">
        <a href="${href}" style="display:inline-block; padding:14px 32px; background:${BRAND.terra}; color:#fff; font-size:12px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; border-radius:14px; text-decoration:none; box-shadow:0 4px 14px rgba(201,83,42,0.3);">
          ${text}
        </a>
      </td></tr>
    </table>`;
}

// Macro chip
function macroChip(label: string, val: string | number, unit: string, color: string): string {
  return `
    <td style="text-align:center; padding:0 8px;">
      <p style="font-size:18px; font-weight:700; font-family:Georgia,serif; color:${color};">${val}<span style="font-size:9px; font-weight:400; color:${BRAND.subtext};"> ${unit}</span></p>
      <p style="font-size:8px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:${BRAND.subtext}; margin-top:2px;">${label}</p>
    </td>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: Meal recommendation
// ─────────────────────────────────────────────────────────────────────────────
export interface MealEmailData {
  to:          string;
  meal_name:   string;
  meal_desc:   string;
  calories:    number;
  protein:     number;
  carbs:       number;
  fat:         number;
  image_url?:  string;
  healthy_tip: string;
  cuisine?:    string;
}

export function mealEmailTemplate(d: MealEmailData): { subject: string; html: string } {
  const subject = `💎 Today's pick: ${d.meal_name}`;

  const html = layout(`
    <!-- Hero image -->
    ${d.image_url ? `<div style="height:200px; overflow:hidden; border-radius:24px 24px 0 0;"><img src="${d.image_url}" alt="${d.meal_name}" style="width:100%; height:100%; object-fit:cover;" /></div>` : ''}

    <div style="padding:28px;">
      ${section('🍽️', 'Guided Selection')}
      <h2 style="font-family:Georgia,serif; font-size:24px; font-weight:700; color:${BRAND.brown}; line-height:1.2; margin-bottom:10px;">${d.meal_name}</h2>
      <p style="font-size:13px; line-height:1.7; color:${BRAND.subtext}; font-style:italic; margin-bottom:24px;">&ldquo;${d.meal_desc}&rdquo;</p>

      <!-- Macros -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:0.5px solid rgba(90,55,20,0.12); border-radius:12px; overflow:hidden; background:${BRAND.cream}; margin-bottom:24px;">
        <tr>
          ${macroChip('Calories', d.calories, 'kcal', BRAND.terra)}
          ${macroChip('Protein',  d.protein,  'g',    BRAND.sage)}
          ${macroChip('Carbs',    d.carbs,    'g',    BRAND.amber)}
          ${macroChip('Fat',      d.fat,      'g',    '#7B6BA8')}
        </tr>
      </table>

      <!-- Tip -->
      <div style="padding:16px; background:${BRAND.cream}; border-radius:12px; border:0.5px solid rgba(90,55,20,0.12);">
        <p style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:${BRAND.subtext}; margin-bottom:6px;">💡 Wellness tip</p>
        <p style="font-size:13px; line-height:1.6; color:${BRAND.brown};">${d.healthy_tip}</p>
      </div>

      ${ctaButton('Open BuBu App', process.env.NEXT_PUBLIC_APP_URL ?? '#')}
    </div>
  `, `Today's meal pick: ${d.meal_name}`);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: Market reminder
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketReminderData {
  to:              string;
  items:           { name: string; category: string; quantity?: string; checked: boolean }[];
  reminder_note?:  string;
  app_url?:        string;
}

export function marketReminderTemplate(d: MarketReminderData): { subject: string; html: string } {
  const unchecked = d.items.filter(i => !i.checked);
  const subject   = `🛒 Market reminder — ${unchecked.length} items left`;

  const catGroups = unchecked.reduce<Record<string, typeof unchecked>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const catIcons: Record<string, string> = {
    protein:'🥩', groceries:'🛒', vegetables:'🥦', fruits:'🍎',
    dairy:'🥛', snacks:'🍿', toiletries:'🪥', hygiene:'🧴', household:'🏠', other:'📦',
  };

  const itemsHtml = Object.entries(catGroups).map(([cat, items]) => `
    <p style="font-size:9px; font-weight:800; letter-spacing:0.15em; text-transform:uppercase; color:${BRAND.subtext}; margin:16px 0 8px;">${catIcons[cat] ?? '📦'} ${cat}</p>
    ${items.map(item => `
      <div style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:${BRAND.cream}; border-radius:10px; margin-bottom:6px;">
        <div style="width:16px; height:16px; border-radius:5px; border:2px solid ${BRAND.terra}; flex-shrink:0;"></div>
        <span style="font-size:13px; color:${BRAND.brown}; flex:1;">${item.name}</span>
        ${item.quantity ? `<span style="font-size:10px; color:${BRAND.subtext};">${item.quantity}</span>` : ''}
      </div>
    `).join('')}
  `).join('');

  const html = layout(`
    <div style="padding:28px;">
      ${section('🛒', 'Your Market List')}
      <h2 style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${BRAND.brown}; margin-bottom:8px;">Time to shop! 🛍️</h2>
      <p style="font-size:13px; line-height:1.6; color:${BRAND.subtext}; margin-bottom:4px;">
        ${unchecked.length} item${unchecked.length !== 1 ? 's' : ''} waiting on your list.
        ${d.reminder_note ? `<br/><em>${d.reminder_note}</em>` : ''}
      </p>

      <div style="margin:20px 0;">
        ${itemsHtml || '<p style="color:' + BRAND.subtext + '; font-size:13px;">All items checked — great job! 🎉</p>'}
      </div>

      ${ctaButton('Open My Market List', d.app_url ?? process.env.NEXT_PUBLIC_APP_URL ?? '#')}
    </div>
  `, `${unchecked.length} market items waiting for you`);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: Hydration nudge
// ─────────────────────────────────────────────────────────────────────────────
export interface HydrationNudgeData {
  to:            string;
  glasses_today: number;
  water_goal:    number;
  streak:        number;
}

export function hydrationNudgeTemplate(d: HydrationNudgeData): { subject: string; html: string } {
  const remaining = Math.max(0, d.water_goal - d.glasses_today);
  const subject   = remaining === 0
    ? '💧 You hit your water goal! Amazing 🎉'
    : `💧 ${remaining} glass${remaining !== 1 ? 'es' : ''} to go — you got this!`;

  const pct = Math.round((d.glasses_today / d.water_goal) * 100);

  const html = layout(`
    <div style="padding:28px; text-align:center;">
      <p style="font-size:52px; margin-bottom:16px;">💧</p>
      ${section('💧', 'Hydration Check')}
      <h2 style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${BRAND.brown}; margin-bottom:8px;">
        ${remaining === 0 ? 'Hydration goal complete! 🎉' : `${remaining} glass${remaining !== 1 ? 'es' : ''} to go`}
      </h2>
      <p style="font-size:13px; color:${BRAND.subtext}; margin-bottom:24px;">
        ${d.glasses_today} of ${d.water_goal} glasses today${d.streak > 1 ? ` · 🔥 ${d.streak}-day streak` : ''}
      </p>

      <!-- Progress bar -->
      <div style="background:rgba(56,189,248,0.15); border-radius:999px; height:10px; width:100%; margin-bottom:24px; overflow:hidden;">
        <div style="background:${BRAND.blue}; width:${pct}%; height:100%; border-radius:999px;"></div>
      </div>

      <p style="font-size:13px; line-height:1.7; color:${BRAND.brown};">
        ${remaining === 0
          ? "You're crushing it today. Your body will thank you. 💙"
          : "Water is the original energy drink. Sip up — your mind and skin will glow. ✨"}
      </p>

      ${ctaButton('Log Water Now', process.env.NEXT_PUBLIC_APP_URL ?? '#')}
    </div>
  `, subject);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: Milestone / program achievement
// ─────────────────────────────────────────────────────────────────────────────
export interface MilestoneEmailData {
  to:           string;
  type:         'week_complete' | 'streak_7' | 'goal_hit_80' | 'goal_hit_100' | 'program_done';
  streak?:      number;
  program_name?: string;
  calories_hit?: number;
  cal_goal?:     number;
}

export function milestoneTemplate(d: MilestoneEmailData): { subject: string; html: string } {
  const copy = {
    week_complete:  { emoji:'🏆', title:'You completed your week!',     body:'Seven days of consistency. That\'s not luck — that\'s discipline. Keep going.' },
    streak_7:       { emoji:'🔥', title:'7-day streak unlocked!',       body:`${d.streak ?? 7} days in a row. Habits are forming. The best version of you is showing up daily.` },
    goal_hit_80:    { emoji:'⚡', title:'80% of your daily goal hit!',   body:`${d.calories_hit ?? '–'} of ${d.cal_goal ?? '–'} kcal today. Keep eating — you're almost there.` },
    goal_hit_100:   { emoji:'🎯', title:'Daily calorie goal complete!',  body:'Perfect day. Eat, track, repeat — that\'s the formula. See you tomorrow. 💎' },
    program_done:   { emoji:'💎', title:`Program complete: ${d.program_name ?? 'Your Goal'}!`, body:'You committed and you finished. Take a moment to appreciate that. What\'s next?' },
  }[d.type];

  const html = layout(`
    <div style="padding:28px; text-align:center;">
      <p style="font-size:56px; margin-bottom:16px;">${copy.emoji}</p>
      ${section('💎', 'Achievement unlocked')}
      <h2 style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${BRAND.brown}; line-height:1.3; margin-bottom:12px;">${copy.title}</h2>
      <p style="font-size:14px; line-height:1.7; color:${BRAND.subtext}; margin-bottom:24px;">${copy.body}</p>
      ${ctaButton('See My Progress', process.env.NEXT_PUBLIC_APP_URL ?? '#')}
    </div>
  `, copy.title);

  return { subject: `${copy.emoji} ${copy.title}`, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: Daily digest
// ─────────────────────────────────────────────────────────────────────────────
export interface DailyDigestData {
  to:            string;
  name?:         string;
  calories:      number;
  cal_goal:      number;
  water_glasses: number;
  water_goal:    number;
  meals_logged:  string[];
  streak:        number;
  suggested_meal?: string;
}

export function dailyDigestTemplate(d: DailyDigestData): { subject: string; html: string } {
  const calPct   = Math.round((d.calories / d.cal_goal) * 100);
  const waterPct = Math.round((d.water_glasses / d.water_goal) * 100);

  const html = layout(`
    <div style="padding:28px;">
      ${section('📊', "Today's Summary")}
      <h2 style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${BRAND.brown}; margin-bottom:4px;">
        ${d.name ? `Hey ${d.name}` : 'Good evening'} 👋
      </h2>
      <p style="font-size:13px; color:${BRAND.subtext}; margin-bottom:24px;">Here's how today went${d.streak > 1 ? ` · 🔥 ${d.streak}-day streak` : ''}.</p>

      <!-- Stats row -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="width:50%; padding-right:8px;">
            <div style="background:${BRAND.cream}; border-radius:14px; padding:16px; text-align:center;">
              <p style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:${BRAND.subtext}; margin-bottom:6px;">🔥 Calories</p>
              <p style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${calPct >= 90 ? BRAND.sage : calPct >= 60 ? BRAND.amber : BRAND.terra};">${d.calories}</p>
              <p style="font-size:10px; color:${BRAND.subtext};">of ${d.cal_goal} kcal · ${calPct}%</p>
              <div style="background:rgba(0,0,0,0.08); border-radius:999px; height:4px; margin-top:8px; overflow:hidden;">
                <div style="background:${BRAND.terra}; width:${Math.min(calPct,100)}%; height:100%; border-radius:999px;"></div>
              </div>
            </div>
          </td>
          <td style="width:50%; padding-left:8px;">
            <div style="background:rgba(10,40,64,0.96); border-radius:14px; padding:16px; text-align:center;">
              <p style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:rgba(56,189,248,0.6); margin-bottom:6px;">💧 Water</p>
              <p style="font-family:Georgia,serif; font-size:22px; font-weight:700; color:${BRAND.blue};">${d.water_glasses}</p>
              <p style="font-size:10px; color:rgba(56,189,248,0.5);">of ${d.water_goal} glasses · ${waterPct}%</p>
              <div style="background:rgba(255,255,255,0.1); border-radius:999px; height:4px; margin-top:8px; overflow:hidden;">
                <div style="background:${BRAND.blue}; width:${Math.min(waterPct,100)}%; height:100%; border-radius:999px;"></div>
              </div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Meals logged -->
      ${d.meals_logged.length ? `
        <p style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:${BRAND.subtext}; margin-bottom:10px;">🍽️ Meals logged</p>
        ${d.meals_logged.map(m => `<div style="padding:10px 12px; background:${BRAND.cream}; border-radius:10px; margin-bottom:6px; font-size:13px; color:${BRAND.brown};">✓ ${m}</div>`).join('')}
      ` : ''}

      <!-- Suggested meal for tomorrow -->
      ${d.suggested_meal ? `
        <div style="margin-top:20px; padding:16px; background:${BRAND.cream}; border-radius:14px;">
          <p style="font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.15em; color:${BRAND.subtext}; margin-bottom:6px;">🌅 Suggested for tomorrow</p>
          <p style="font-size:14px; font-weight:700; color:${BRAND.brown};">${d.suggested_meal}</p>
        </div>
      ` : ''}

      ${ctaButton('Open BuBu App', process.env.NEXT_PUBLIC_APP_URL ?? '#')}
    </div>
  `, `Your daily digest — ${d.calories}/${d.cal_goal} kcal`);

  return { subject: `📊 Your daily summary — ${calPct >= 90 ? 'Great day! 🎯' : 'Keep it up 💪'}`, html };
}

// ─────────────────────────────────────────────────────────────────────────────
// SENDER  (Resend — swap API key and it's yours)
// ─────────────────────────────────────────────────────────────────────────────

export interface SendOptions {
  to:      string;
  subject: string;
  html:    string;
  from?:   string;
}

export async function sendEmail(opts: SendOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = opts.from ?? process.env.EMAIL_FROM ?? 'BuBu NourishSelect <hello@bubu.app>';

  if (!apiKey) {
    // Fallback: hit your own /api/email route (works in client-side contexts too)
    try {
      const res = await fetch('/api/email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: opts.to, subject: opts.subject, html: opts.html }),
      });
      const json = await res.json();
      return res.ok ? { success: true } : { success: false, error: json.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.message ?? 'Resend error' };
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE SENDERS
// ─────────────────────────────────────────────────────────────────────────────

export async function sendMealEmail(data: MealEmailData) {
  const { subject, html } = mealEmailTemplate(data);
  return sendEmail({ to: data.to, subject, html });
}

export async function sendMarketReminder(data: MarketReminderData) {
  const { subject, html } = marketReminderTemplate(data);
  return sendEmail({ to: data.to, subject, html });
}

export async function sendHydrationNudge(data: HydrationNudgeData) {
  const { subject, html } = hydrationNudgeTemplate(data);
  return sendEmail({ to: data.to, subject, html });
}

export async function sendMilestone(data: MilestoneEmailData) {
  const { subject, html } = milestoneTemplate(data);
  return sendEmail({ to: data.to, subject, html });
}

export async function sendDailyDigest(data: DailyDigestData) {
  const { subject, html } = dailyDigestTemplate(data);
  return sendEmail({ to: data.to, subject, html });
}
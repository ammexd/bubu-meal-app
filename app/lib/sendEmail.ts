export type EmailType =
  | 'meal'
  | 'hydration'
  | 'digest'
  | 'milestone'
  | 'cal_nudge'
  | 'market_reminder'
  | 'raw';
 
export interface SendEmailOptions {
  type: EmailType;
  to:   string;
  data?: Record<string, unknown>;
  // For type: 'raw' only
  subject?: string;
  html?:    string;
}
 
export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const res  = await fetch('/api/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(opts),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error ?? 'Email failed' };
    return { success: true };
  } catch (err) {
    console.error('[sendEmail]', err);
    return { success: false, error: String(err) };
  }
}
 
// ─── Convenience senders ──────────────────────────────────────────────────────
 
export function sendMealEmail(to: string, data: {
  meal_name: string; meal_desc: string; calories: number;
  protein: number; carbs: number; fat: number;
  image_url?: string; healthy_tip: string;
}) { return sendEmail({ type: 'meal', to, data: { ...data, to } }); }
 
export function sendHydrationNudge(to: string, data: { glasses: number; goal: number; streak?: number }) {
  return sendEmail({ type: 'hydration', to, data });
}
 
export function sendCalNudge(to: string, data: { calories: number; cal_goal: number; suggested_meal?: string; custom_goal?: boolean }) {
  return sendEmail({ type: 'cal_nudge', to, data });
}
 
export function sendDailyDigest(to: string, data: {
  name?: string; calories: number; cal_goal: number;
  water: number; water_goal: number; meals: string[];
  streak: number; suggested_meal?: string;
  cal_source?: 'program' | 'profile' | 'tdee' | 'default' | 'custom';
}) { return sendEmail({ type: 'digest', to, data }); }
 
export function sendMilestone(to: string, data: {
  type: 'streak_7' | 'goal_hit' | 'program_done' | 'week_complete';
  streak?: number; cal_goal?: number; calories?: number; program_name?: string;
}) { return sendEmail({ type: 'milestone', to, data: { ...data } }); }
 
export function sendMarketReminder(to: string, data: {
  items: { name: string; category: string; quantity?: string }[];
  reminder_note?: string;
}) { return sendEmail({ type: 'market_reminder', to, data }); }
 
// test blow remove later
export async function testNourishEmailPipeline(targetEmail: string) {
  console.log('🚀 Igniting Resend API test pipeline...');
  
  const result = await sendEmail({
    type: 'raw', // Uses your flat raw type pipeline override
    to: targetEmail,
    subject: '🔥 Neural Forge Delivery Test',
    html: `
      <div style="background-color: #FAF5EC; padding: 30px; font-family: sans-serif;">
        <h1 style="color: #C9532A;">BuBu NourishSelect Operational</h1>
        <p>Your API network routing path is perfectly wired up to your backend route engine.</p>
        <hr style="border: none; border-top: 1px dashed #A67C52; margin: 20px 0;" />
        <p style="font-size: 11px; color: #8B6D52;">System check completed: ${new Date().toLocaleTimeString()}</p>
      </div>
    `
  });

  return result;
}
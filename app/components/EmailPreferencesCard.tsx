'use client';

// ══════════════════════════════════════════════════════════════════════════════
// EmailPreferencesCard.tsx  —  save as  app/components/EmailPreferencesCard.tsx
//
// Drop this inside the Settings sheet, replacing the plain email input.
// Gives users full control over which reminders they receive.
// All preferences save to the profiles table.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { saveProfile } from '../lib/db';
import type { Profile } from '../lib/db';

interface Props {
  dk:      boolean;
  sub:     string;
  inputCls:string;
  profile: Profile | null;
  email:   string;
  onEmailChange: (e: string) => void;
  onSaved?: () => void;
}

const REMINDER_OPTIONS = [
  {
    key:   'subscribed',
    icon:  '📊',
    label: 'Daily digest',
    desc:  'Your calories, water & tomorrow\'s meal — once a day',
  },
  {
    key:   'hydration_reminder',
    icon:  '💧',
    label: 'Hydration nudge',
    desc:  'A reminder if you\'re behind on water by afternoon',
  },
  {
    key:   'calorie_reminder',
    icon:  '🔥',
    label: 'Calorie reminder',
    desc:  'A nudge if you\'ve barely eaten by midday',
  },
  {
    key:   'milestone_emails',
    icon:  '🏆',
    label: 'Milestones & streaks',
    desc:  'When you hit a streak, goal, or program milestone',
  },
  {
    key:   'market_reminder',
    icon:  '🛒',
    label: 'Market list reminder',
    desc:  'A weekly reminder to check off your shopping list',
  },
] as const;

type ReminderKey = typeof REMINDER_OPTIONS[number]['key'];

// Profile extension — add these columns to your profiles table if missing:
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hydration_reminder BOOLEAN DEFAULT false;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS calorie_reminder   BOOLEAN DEFAULT false;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS milestone_emails   BOOLEAN DEFAULT false;
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS market_reminder    BOOLEAN DEFAULT false;

export function EmailPreferencesCard({ dk, sub, inputCls, profile, email, onEmailChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved ] = useState(false);

  // Local toggle state seeded from profile
  const [prefs, setPrefs] = useState<Record<ReminderKey, boolean>>({
    subscribed:          profile?.subscribed          ?? false,
    hydration_reminder:  (profile as any)?.hydration_reminder  ?? false,
    calorie_reminder:    (profile as any)?.calorie_reminder    ?? false,
    milestone_emails:    (profile as any)?.milestone_emails    ?? false,
    market_reminder:     (profile as any)?.market_reminder     ?? false,
  });

  const toggle = (key: ReminderKey) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveProfile({ email, ...prefs } as Partial<Profile>);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  };

  const anyEnabled = Object.values(prefs).some(Boolean);

  return (
    <div className="space-y-4">
      {/* Email input */}
      <div>
        <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => onEmailChange(e.target.value)}
          placeholder="your@email.com"
          className={`w-full p-3.5 rounded-2xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`}
        />
        {!email && (
          <p className={`text-[10px] ${sub} mt-1.5`}>
            Add your email to enable reminders
          </p>
        )}
      </div>

      {/* Reminder toggles */}
      <div>
        <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3 block`}>
          Reminder preferences
        </label>

        <div className="space-y-2">
          {REMINDER_OPTIONS.map(opt => {
            const active = prefs[opt.key];
            const disabled = !email;
            return (
              <button
                key={opt.key}
                onClick={() => !disabled && toggle(opt.key)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed
                  ${active
                    ? dk ? 'bg-[#C9532A]/12 border-[#C9532A]/30' : 'bg-[#FEE9DF] border-[#F5C9B8]'
                    : dk ? 'bg-white/4 border-white/8 hover:bg-white/8' : 'bg-[#FDF9F0] border-[#E0D4BC] hover:bg-[#F5EDD8]'}`}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-black ${active ? 'text-[#C9532A]' : ''}`}>{opt.label}</p>
                  <p className={`text-[10px] mt-0.5 ${sub}`}>{opt.desc}</p>
                </div>
                {/* Toggle pill */}
                <div className={`flex-shrink-0 w-10 h-5 rounded-full transition-all duration-300 relative
                  ${active ? 'bg-[#C9532A]' : dk ? 'bg-white/15' : 'bg-black/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300
                    ${active ? 'left-[22px]' : 'left-0.5'}`}/>
                </div>
              </button>
            );
          })}
        </div>

        {!email && (
          <p className={`text-[10px] ${sub} mt-2`}>
            ↑ Add your email above to enable reminders
          </p>
        )}
      </div>

      {/* Frequency note */}
      {anyEnabled && email && (
        <div className={`p-3.5 rounded-2xl text-[10px] leading-relaxed
          ${dk ? 'bg-white/4 border border-white/8 text-[#8B6D52]' : 'bg-[#FDF9F0] border border-[#E0D4BC] text-[#A67C52]'}`}>
          💡 Emails send daily at 8 AM UTC. You can turn off any reminder anytime from here.
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving || !email}
        className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40
          ${saved
            ? 'bg-[#5C7A5E] text-white'
            : 'bg-[#C9532A] hover:bg-[#A93F1F] text-white shadow-[0_4px_14px_rgba(201,83,42,0.28)]'}`}
      >
        {saved   ? '✅ Preferences saved!'
         : saving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…</span>
         : 'Save Email Preferences'}
      </button>
    </div>
  );
}
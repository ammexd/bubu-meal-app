'use client';

// ══════════════════════════════════════════════════════════════════════════════
// CalorieSection.tsx  —  save as  app/components/CalorieSection.tsx
//
// Fully self-contained calorie tracking section.
// Handles every goal state inline, no modals:
//
//   program   → shows program badge + "Cancel program" option
//   tdee      → shows "Body-computed" + edit + disable options
//   profile   → shows "Custom ✨" + edit + reset to TDEE + disable
//   default   → shows "Default 2,000" + edit + set body metrics prompt
//   disabled  → minimal tracker, no goal, "Add a goal" CTA
//
// All editing is inline — tap to open, tap save/discard to close.
// Feels like a native nutrition app, not a settings panel.
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { saveProfile, getProfile, cancelProgram, type Profile, type ProgramProgress } from '../lib/db';
import type { MealLog } from '../lib/db';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type GoalSource = 'program' | 'profile' | 'tdee' | 'default' | 'disabled';

interface Props {
  dk:              boolean;
  sub:             string;
  totalCal:        number;
  dailyCalGoal:    number;
  calGoalSource:   GoalSource;
  hasActiveProgram:boolean;
  programProgress: ProgramProgress | null;
  loggedMeals:     MealLog[];
  profile:         Profile | null;
  onGoalChange:    (goal: number, source: GoalSource) => void;
  onGoalDisable:   () => void;
  onSetProgram:    () => void;
  onRemoveMeal:    (i: number) => void;
  showToast:       (msg: string) => void;
}

// ─── SOURCE META ─────────────────────────────────────────────────────────────

const SOURCE_META: Record<GoalSource, { label: string; badge: string; color: string }> = {
  program:  { label: 'Active program',      badge: '🎯', color: '#C9532A' },
  tdee:     { label: 'Body-computed TDEE',  badge: '💎', color: '#D4870D' },
  profile:  { label: 'Your custom goal ✨', badge: '✨', color: '#7B6BA8' },
  default:  { label: 'Standard default',    badge: '📊', color: '#8B6D52' },
  disabled: { label: 'No goal set',         badge: '∞',  color: '#8B6D52' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pct(val: number, max: number) { return max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0; }

function motivationalLine(pct: number, disabled: boolean): string {
  if (disabled) return 'Tracking mode — no goal set';
  if (pct === 0)    return 'Log your first meal to get started 🍽️';
  if (pct < 25)     return 'Just getting started — keep going 💪';
  if (pct < 50)     return 'Good momentum! Keep eating well.';
  if (pct < 75)     return 'Halfway there! You\'re doing great ⚡';
  if (pct < 90)     return 'Almost at your goal — keep it up! 🌟';
  if (pct < 100)    return 'So close! One more meal to hit it 🎯';
  if (pct === 100)  return 'Goal reached! Amazing work today 🎉';
  return 'Over target — that\'s okay, adjust tomorrow.';
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function CalorieSection({
  dk, sub, totalCal, dailyCalGoal, calGoalSource, hasActiveProgram,
  programProgress, loggedMeals, profile,
  onGoalChange, onGoalDisable, onSetProgram, onRemoveMeal, showToast,
}: Props) {

  const [managePanelOpen, setManagePanelOpen] = useState(false);
  const [editMode,        setEditMode        ] = useState(false);
  const [editValue,       setEditValue       ] = useState(String(dailyCalGoal));
  const [saving,          setSaving          ] = useState(false);
  const [confirmDisable,  setConfirmDisable  ] = useState(false);
  const [confirmCancel,   setConfirmCancel   ] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDisabled = calGoalSource === 'disabled' || dailyCalGoal === 0;
  const calPct     = isDisabled ? 0 : pct(totalCal, dailyCalGoal);
  const calColor   = isDisabled ? '#8B6D52' : calPct < 50 ? '#5C7A5E' : calPct < 85 ? '#D4870D' : '#C9532A';
  const meta       = SOURCE_META[calGoalSource];
  const tdeeVal    = profile?.tdee ?? null;

  // Seed edit value when goal changes externally
  useEffect(() => {
    if (!editMode) setEditValue(String(dailyCalGoal));
  }, [dailyCalGoal, editMode]);

  useEffect(() => {
    if (editMode) inputRef.current?.focus();
  }, [editMode]);

  const handleOpenEdit = () => {
    setEditValue(String(dailyCalGoal || tdeeVal || 2000));
    setEditMode(true);
    setManagePanelOpen(true);
  };

  const handleSaveEdit = async () => {
    const val = parseInt(editValue);
    if (!val || val < 1000 || val > 10000) {
      showToast('⚠️ Set a goal between 1,000 and 10,000 kcal');
      return;
    }
    setSaving(true);
    await saveProfile({ daily_cal_goal: val });
    onGoalChange(val, 'profile');
    setSaving(false);
    setEditMode(false);
    setManagePanelOpen(false);
    showToast(`✅ Calorie goal updated to ${val.toLocaleString()} kcal`);
  };

  const handleResetToTDEE = async () => {
    if (!tdeeVal) { showToast('⚠️ Complete your body profile first'); return; }
    setSaving(true);
    await saveProfile({ daily_cal_goal: tdeeVal });
    onGoalChange(tdeeVal, 'tdee');
    setSaving(false);
    setManagePanelOpen(false);
    showToast(`✅ Reset to your TDEE: ${tdeeVal.toLocaleString()} kcal`);
  };

  const handleDisable = async () => {
    setSaving(true);
    await saveProfile({ daily_cal_goal: 0 } as any);
    onGoalDisable();
    setSaving(false);
    setConfirmDisable(false);
    setManagePanelOpen(false);
    showToast('Goal removed — tracking calories freely now');
  };

  const handleCancelProgram = async () => {
    setSaving(true);
    await cancelProgram();
    // Revert to profile TDEE or default
    const updated = await getProfile();
    const newGoal = updated?.tdee ?? 2000;
    await saveProfile({ daily_cal_goal: newGoal });
    onGoalChange(newGoal, updated?.tdee ? 'tdee' : 'default');
    setSaving(false);
    setConfirmCancel(false);
    setManagePanelOpen(false);
    showToast('Program cancelled — back to your regular goal');
  };

  const handleEnable = async () => {
    const goal = tdeeVal ?? 2000;
    await saveProfile({ daily_cal_goal: goal });
    onGoalChange(goal, tdeeVal ? 'tdee' : 'default');
    showToast(`✅ Goal set to ${goal.toLocaleString()} kcal`);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card       = dk ? 'bg-[#141008] border-white/6' : 'bg-white border-[#E8E0CC]';
  const cardGlow   = dk ? 'shadow-[0_2px_24px_rgba(0,0,0,0.4)]' : 'shadow-[0_4px_32px_rgba(28,16,8,0.06)]';
  const inp        = dk
    ? 'bg-white/8 border-white/15 text-[#F5EDD8] placeholder-white/30 focus:border-[#C9532A]'
    : 'bg-[#FDF9F0] border-[#E0D4BC] text-[#1C1008] focus:border-[#C9532A]';

  // ─── DISABLED STATE ────────────────────────────────────────────────────────
  if (isDisabled) {
    return (
      <section className={`${card} ${cardGlow} border rounded-3xl p-5`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-3.5 rounded-full bg-[#C9532A] flex-shrink-0" />
              <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${sub}`}>🔥 Today's Calories</p>
            </div>
            <p className="font-serif font-black text-3xl mt-1" style={{ color: '#D4870D' }}>
              {totalCal.toLocaleString()}
              <span className={`text-sm font-normal ml-2 ${sub}`}>kcal eaten</span>
            </p>
            <p className={`text-[10px] ${sub} mt-1`}>Tracking freely — no daily goal</p>
          </div>

          {/* Enable goal button */}
          <button onClick={handleEnable}
            className="flex-shrink-0 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-xl bg-[#C9532A]/10 text-[#C9532A] hover:bg-[#C9532A]/20 transition-all active:scale-95">
            + Add Goal
          </button>
        </div>

        {/* Logged meals */}
        {loggedMeals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-black/5">
            {groupMealChips(loggedMeals).map((chip, i) => (
              <MealChip key={i} chip={chip} dk={dk} sub={sub} color="#D4870D" onRemove={() => onRemoveMeal(chip.originalIndex)} />
            ))}
          </div>
        )}

        {/* Divider + set program CTA */}
        <div className="mt-4 pt-4 border-t border-black/5">
          <p className={`text-[10px] ${sub} mb-2`}>Want structured tracking?</p>
          <button onClick={onSetProgram}
            className="text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border border-[#C9532A]/25 text-[#C9532A] bg-[#C9532A]/5 hover:bg-[#C9532A]/10 transition-all active:scale-95">
            🎯 Start a nutrition program
          </button>
        </div>
      </section>
    );
  }

  // ─── ACTIVE GOAL STATE ─────────────────────────────────────────────────────
  return (
    <section className={`${card} ${cardGlow} border rounded-3xl overflow-hidden`}>
      <div className="p-5">
        {/* ── Header row ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-3.5 rounded-full bg-[#C9532A] flex-shrink-0" />
              <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${sub}`}>🔥 Today's Calories</p>
              {/* Source badge */}
              <span
                className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full cursor-pointer transition-all active:scale-95"
                style={{ background: `${meta.color}15`, color: meta.color }}
                onClick={() => setManagePanelOpen(v => !v)}
              >
                {meta.badge} {meta.label}
              </span>
            </div>

            {/* Goal display */}
            {totalCal === 0 ? (
              <p className={`text-xs mt-1 ${sub}`}>{motivationalLine(0, false)}</p>
            ) : (
              <p className="font-serif font-black text-2xl mt-1" style={{ color: calColor }}>
                {totalCal.toLocaleString()}
                <span className={`text-sm font-normal ml-1 ${sub}`}>/ {dailyCalGoal.toLocaleString()} kcal</span>
                <span className={`text-[11px] font-bold ml-2`} style={{ color: calColor }}>{calPct}%</span>
              </p>
            )}
          </div>

          {/* Ring or manage button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {totalCal > 0 && (
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="19" fill="none" stroke={dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="3.5" />
                  <circle cx="24" cy="24" r="19" fill="none" stroke={calColor} strokeWidth="3.5"
                    strokeDasharray={`${2 * Math.PI * 19}`}
                    strokeDashoffset={`${2 * Math.PI * 19 * (1 - Math.min(calPct / 100, 1))}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black" style={{ color: calColor }}>{calPct}%</span>
              </div>
            )}

            {/* Manage / edit trigger */}
            <button
              onClick={() => { setManagePanelOpen(v => !v); setEditMode(false); setConfirmDisable(false); setConfirmCancel(false); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] transition-all active:scale-90 ${managePanelOpen ? 'bg-[#C9532A] text-white' : dk ? 'bg-white/8 text-[#8B6D52] hover:bg-white/16' : 'bg-[#F5EDD8] text-[#A67C52] hover:bg-[#EDE0C8]'}`}
              aria-label="Manage goal"
            >
              {managePanelOpen ? '✕' : '⚙'}
            </button>
          </div>
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────────────── */}
        <div className={`h-1.5 rounded-full overflow-hidden mb-2 ${dk ? 'bg-white/6' : 'bg-[#F0E8D8]'}`}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${calPct}%`, background: `linear-gradient(90deg, ${calColor}88, ${calColor})` }} />
        </div>
        <p className={`text-[10px] ${sub} mb-1`}>{motivationalLine(calPct, false)}</p>

        {/* ── Program streaks ───────────────────────────────────────────────────── */}
        {programProgress && (
          <div className={`flex gap-3 mt-3 pt-3 border-t ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}`}>
            <div className="text-center">
              <p className="font-black text-sm text-[#D4870D]">🔥 {programProgress.calHitStreak}</p>
              <p className={`text-[8px] uppercase font-black ${sub}`}>Cal streak</p>
            </div>
            <div className="text-center">
              <p className="font-black text-sm text-[#38bdf8]">💧 {programProgress.waterHitStreak}</p>
              <p className={`text-[8px] uppercase font-black ${sub}`}>Water streak</p>
            </div>
            <div className="flex-1 text-right">
              <p className="font-black text-sm">{programProgress.daysRemaining}d left</p>
              <p className={`text-[8px] uppercase font-black ${sub}`}>{programProgress.completionPct}% done</p>
            </div>
          </div>
        )}

        {/* ── Logged meal chips ─────────────────────────────────────────────────── */}
        {loggedMeals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {groupMealChips(loggedMeals).map((chip, i) => (
              <MealChip key={i} chip={chip} dk={dk} sub={sub} color={calColor} onRemove={() => onRemoveMeal(chip.originalIndex)} />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          INLINE MANAGEMENT PANEL — expands below, no modal
      ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className="overflow-hidden transition-all duration-350 ease-out"
        style={{ maxHeight: managePanelOpen ? '400px' : '0px', opacity: managePanelOpen ? 1 : 0 }}
      >
        <div className={`border-t px-5 pb-5 pt-4 space-y-3 ${dk ? 'border-white/8 bg-white/3' : 'border-[#F0E8D8] bg-[#FDFAF5]'}`}>

          {/* Panel title */}
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>
            ⚙️ Manage your calorie goal
          </p>

          {/* ── EDIT MODE ────────────────────────────────────────────────────── */}
          {editMode ? (
            <div className="space-y-3">
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>
                  New daily target
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    className={`flex-1 px-4 py-3.5 rounded-2xl border text-lg font-black outline-none transition-all ${inp}`}
                    inputMode="numeric" min="1000" max="10000"
                    placeholder={String(dailyCalGoal)}
                  />
                  <span className={`text-[11px] font-bold ${sub} flex-shrink-0`}>kcal/day</span>
                </div>
                {tdeeVal && parseInt(editValue) !== tdeeVal && (
                  <p className={`text-[9px] ${sub} mt-1.5`}>
                    Your TDEE is <strong>{tdeeVal.toLocaleString()} kcal</strong> — a good starting point
                  </p>
                )}
                {parseInt(editValue) !== dailyCalGoal && parseInt(editValue) !== (profile?.tdee ?? 2000) && parseInt(editValue) > 0 && (
                  <p className={`text-[9px] mt-1.5 ${dk ? 'text-[#7B6BA8]/80' : 'text-[#7B6BA8]'}`}>
                    ✨ This will be marked as your custom preference
                  </p>
                )}
              </div>

              {/* Preset chips */}
              <div>
                <p className={`text-[9px] ${sub} mb-1.5`}>Quick presets:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    ...(tdeeVal ? [{ label: `TDEE (${tdeeVal})`, val: tdeeVal }] : []),
                    { label: '1,500 kcal', val: 1500 },
                    { label: '1,800 kcal', val: 1800 },
                    { label: '2,000 kcal', val: 2000 },
                    { label: '2,500 kcal', val: 2500 },
                    { label: '3,000 kcal', val: 3000 },
                  ].map(p => (
                    <button key={p.val} onClick={() => setEditValue(String(p.val))}
                      className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${parseInt(editValue) === p.val ? 'bg-[#C9532A] text-white' : dk ? 'bg-white/8 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={saving || !parseInt(editValue)}
                  className="flex-1 py-3 rounded-2xl font-black text-sm bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all active:scale-95 disabled:opacity-50">
                  {saving ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Saving…</span> : '✓ Save Goal'}
                </button>
                <button onClick={() => setEditMode(false)}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896]' : 'border-[#E8E2D2]'}`}>
                  Cancel
                </button>
              </div>
            </div>

          ) : confirmDisable ? (
            /* ── CONFIRM DISABLE ──────────────────────────────────────────── */
            <div className={`rounded-2xl p-4 border ${dk ? 'bg-[#C9532A]/8 border-[#C9532A]/20' : 'bg-[#FEE9DF] border-[#F5C9B8]'}`}>
              <p className="text-[11px] font-bold text-[#C9532A] mb-1">Remove your calorie goal?</p>
              <p className={`text-[10px] ${sub} mb-3 leading-relaxed`}>
                You'll still track calories eaten, but without a daily target. You can always add a goal back later.
              </p>
              <div className="flex gap-2">
                <button onClick={handleDisable} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#C9532A] text-white text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-50">
                  Yes, remove goal
                </button>
                <button onClick={() => setConfirmDisable(false)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896]' : 'border-[#E8E2D2]'}`}>
                  Keep it
                </button>
              </div>
            </div>

          ) : confirmCancel ? (
            /* ── CONFIRM CANCEL PROGRAM ──────────────────────────────────── */
            <div className={`rounded-2xl p-4 border ${dk ? 'bg-amber-500/8 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-[11px] font-bold text-amber-600 mb-1">Cancel your active program?</p>
              <p className={`text-[10px] ${sub} mb-3 leading-relaxed`}>
                Program streaks and check-ins will stop. Your goal will revert to your TDEE{tdeeVal ? ` (${tdeeVal.toLocaleString()} kcal)` : ''}.
              </p>
              <div className="flex gap-2">
                <button onClick={handleCancelProgram} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase transition-all active:scale-95 disabled:opacity-50">
                  Yes, cancel program
                </button>
                <button onClick={() => setConfirmCancel(false)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896]' : 'border-[#E8E2D2]'}`}>
                  Keep program
                </button>
              </div>
            </div>

          ) : (
            /* ── GOAL OPTIONS ─────────────────────────────────────────────── */
            <div className="space-y-2">
              {/* Current goal display */}
              <div className={`flex items-center justify-between p-3 rounded-xl ${dk ? 'bg-white/5' : 'bg-white border border-[#F0E8D8]'}`}>
                <div>
                  <p className={`text-[9px] font-black uppercase ${sub}`}>Current goal</p>
                  <p className="font-serif font-bold text-lg" style={{ color: meta.color }}>
                    {dailyCalGoal.toLocaleString()} <span className={`text-[10px] font-normal ${sub}`}>kcal/day</span>
                  </p>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-full`} style={{ background: `${meta.color}15`, color: meta.color }}>
                  {meta.badge} {meta.label}
                </span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                {/* Edit / adjust */}
                <button onClick={handleOpenEdit}
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all active:scale-95 border ${dk ? 'border-white/8 bg-white/5 text-[#D4B896] hover:bg-white/10' : 'border-[#E8E0CC] bg-white text-[#3D2010] hover:bg-[#FDF9F0]'}`}>
                  <span className="block text-base mb-0.5">✏️</span>
                  {calGoalSource === 'program' ? 'Adjust after program' : 'Edit target'}
                </button>

                {/* Reset to TDEE (shown when not already at TDEE) */}
                {tdeeVal && calGoalSource !== 'tdee' && calGoalSource !== 'program' && (
                  <button onClick={handleResetToTDEE} disabled={saving}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all active:scale-95 border ${dk ? 'border-white/8 bg-white/5 text-[#D4870D] hover:bg-white/10' : 'border-[#F0E4CC] bg-[#FFF8ED] text-[#D4870D] hover:bg-[#FFF0D8]'}`}>
                    <span className="block text-base mb-0.5">💎</span>
                    Reset to TDEE<br/>
                    <span className={`text-[8px] font-normal ${sub}`}>{tdeeVal.toLocaleString()} kcal</span>
                  </button>
                )}

                {/* Set/view program */}
                {!hasActiveProgram ? (
                  <button onClick={onSetProgram}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all active:scale-95 border ${dk ? 'border-[#C9532A]/25 bg-[#C9532A]/8 text-[#F5844C] hover:bg-[#C9532A]/15' : 'border-[#F5C9B8] bg-[#FEE9DF] text-[#C9532A] hover:bg-[#FDD9C8]'}`}>
                    <span className="block text-base mb-0.5">🎯</span>
                    Start a program
                  </button>
                ) : (
                  <button onClick={() => setConfirmCancel(true)}
                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all active:scale-95 border ${dk ? 'border-white/8 bg-white/5 text-amber-400 hover:bg-white/10' : 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
                    <span className="block text-base mb-0.5">⏹️</span>
                    Cancel program
                  </button>
                )}

                {/* Remove goal */}
                <button onClick={() => setConfirmDisable(true)}
                  className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all active:scale-95 border ${dk ? 'border-white/8 bg-white/5 text-[#8B6D52] hover:bg-white/10 hover:text-[#D4B896]' : 'border-[#E8E0CC] bg-white text-[#A67C52] hover:bg-[#F5EDD8]'}`}>
                  <span className="block text-base mb-0.5">✕</span>
                  Remove goal
                </button>
              </div>

              {/* TDEE info when at default */}
              {calGoalSource === 'default' && !tdeeVal && (
                <div className={`p-3 rounded-xl text-[10px] leading-relaxed ${dk ? 'bg-white/4 text-[#8B6D52]' : 'bg-[#FDF9F0] text-[#A67C52]'}`}>
                  💡 Complete your body profile in Settings to get a personalised calorie goal based on your TDEE.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── MEAL GROUPING ────────────────────────────────────────────────────────────
// Groups duplicate meal entries: "Suya (×3)" instead of "Suya Suya Suya"

interface MealChipData {
  name:          string;
  totalCal:      number;
  count:         number;
  originalIndex: number; // index of LAST occurrence (for removal)
}

function groupMealChips(meals: MealLog[]): MealChipData[] {
  const map = new Map<string, MealChipData>();
  meals.forEach((m, i) => {
    const name = m.name ?? 'Unknown';
    if (map.has(name)) {
      const ex = map.get(name)!;
      ex.count++;
      ex.totalCal += m.amount ?? 0;
      ex.originalIndex = i; // point to last occurrence
    } else {
      map.set(name, { name, count: 1, totalCal: m.amount ?? 0, originalIndex: i });
    }
  });
  return Array.from(map.values());
}

function MealChip({ chip, dk, sub, color, onRemove }: {
  chip:     MealChipData;
  dk:       boolean;
  sub:      string;
  color:    string;
  onRemove: () => void;
}) {
  const label = chip.name.length > 12 ? chip.name.slice(0, 12) + '…' : chip.name;
  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5 font-semibold transition-all ${dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
      {label}
      {chip.count > 1 && (
        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-black/10">×{chip.count}</span>
      )}
      <span className="font-black" style={{ color }}>{chip.totalCal}k</span>
      <button onClick={onRemove} className="opacity-35 hover:opacity-100 transition-opacity ml-0.5 leading-none">×</button>
    </span>
  );
}
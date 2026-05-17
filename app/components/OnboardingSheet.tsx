'use client';
 
import { useState, useEffect, useRef } from 'react';
import { completeOnboarding, computeBodyMetrics, saveProfile, type Profile, type BodyMetrics } from '../lib/db';
 
interface Props {
  dk:      boolean;
  onDone:  (profile: Profile) => void;
  onSkip?: () => void;
}
 
type GoalType      = 'lose' | 'maintain' | 'gain';
type Gender        = 'male' | 'female' | 'wahalla';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
 
const STEPS = ['gender', 'body', 'activity', 'goal', 'result'] as const;
type Step = typeof STEPS[number];
 
const ACTIVITY_OPTIONS = [
  { id: 'sedentary'  as ActivityLevel, icon: '🛋️', label: 'Sedentary',   desc: 'Desk job, little exercise'      },
  { id: 'light'      as ActivityLevel, icon: '🚶', label: 'Light',       desc: '1–3 light workouts/week'        },
  { id: 'moderate'   as ActivityLevel, icon: '🏃', label: 'Moderate',    desc: '3–5 moderate workouts/week'     },
  { id: 'active'     as ActivityLevel, icon: '💪', label: 'Active',      desc: '6–7 intense workouts/week'      },
  { id: 'very_active'as ActivityLevel, icon: '🔥', label: 'Very Active', desc: 'Physical job + daily training'  },
];
 
const GOAL_OPTIONS = [
  { id: 'lose'    as GoalType, icon: '📉', label: 'Lose Weight',   desc: '500 kcal deficit/day',  color: '#5C7A5E' },
  { id: 'maintain'as GoalType, icon: '⚖️', label: 'Stay Balanced', desc: 'Eat at your TDEE',      color: '#D4870D' },
  { id: 'gain'    as GoalType, icon: '📈', label: 'Build & Gain',  desc: '+300 kcal surplus/day', color: '#C9532A' },
];
 
// Height unit conversion helpers
function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}
function ftInToCm(feet: number, inches: number): number {
  return Math.round((feet * 30.48) + (inches * 2.54));
}
 
function BMIBar({ bmi, category }: { bmi: number; category: string }) {
  const pct   = Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100));
  const color = bmi < 18.5 ? '#38bdf8' : bmi < 25 ? '#5C7A5E' : bmi < 30 ? '#D4870D' : '#C9532A';
  return (
    <div className="space-y-2">
      <div className="relative h-3 rounded-full overflow-hidden bg-black/10">
        <div className="absolute inset-y-0 left-0 w-[25%] bg-[#38bdf8]/30 rounded-l-full" />
        <div className="absolute inset-y-0 left-[25%] w-[38%] bg-[#5C7A5E]/30" />
        <div className="absolute inset-y-0 left-[63%] w-[19%] bg-[#D4870D]/30" />
        <div className="absolute inset-y-0 left-[82%] right-0 bg-[#C9532A]/30 rounded-r-full" />
        <div className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-700"
          style={{ left: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest opacity-40">
        <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
      </div>
      <p className="text-center font-serif font-black text-2xl" style={{ color }}>
        {bmi} <span className="text-sm font-normal opacity-60">{category}</span>
      </p>
    </div>
  );
}
 
export function OnboardingSheet({ dk, onDone, onSkip }: Props) {
  const [step,           setStep         ] = useState<Step>('gender');
  const [age,            setAge          ] = useState('');
  const [heightCm,       setHeightCm     ] = useState('');
  const [weightKg,       setWeightKg     ] = useState('');
  const [gender,         setGender       ] = useState<Gender>('female');
  const [activityLevel,  setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goalType,       setGoalType     ] = useState<GoalType>('maintain');
  const [isSaving,       setIsSaving     ] = useState(false);
  const [metrics,        setMetrics      ] = useState<BodyMetrics | null>(null);
  const [closing,        setClosing      ] = useState(false);
 
  // Height unit toggle
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightFt,   setHeightFt  ] = useState('');
  const [heightIn,   setHeightIn  ] = useState('');
 
  // Calorie override
  const [showCalOverride,  setShowCalOverride ] = useState(false);
  const [customCalTarget,  setCustomCalTarget ] = useState<number | null>(null);
  const [calOverrideInput, setCalOverrideInput] = useState('');
 
  const sheetRef = useRef<HTMLDivElement>(null);
  const stepIdx  = STEPS.indexOf(step);
 
  // ── Height unit sync ──────────────────────────────────────────────────────
  const handleHeightUnitToggle = (unit: 'cm' | 'ft') => {
    if (unit === heightUnit) return;
    if (unit === 'ft' && heightCm) {
      const { feet, inches } = cmToFtIn(parseFloat(heightCm));
      setHeightFt(String(feet));
      setHeightIn(String(inches));
    }
    if (unit === 'cm' && heightFt) {
      const cm = ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0);
      setHeightCm(String(cm));
    }
    setHeightUnit(unit);
  };
 
  const effectiveHeightCm = heightUnit === 'cm'
    ? heightCm
    : String(ftInToCm(parseInt(heightFt) || 0, parseInt(heightIn) || 0));
 
  // ── Live metrics ──────────────────────────────────────────────────────────
  useEffect(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(effectiveHeightCm);
    const a = parseInt(age);
    if (!w || !h || !a || w < 20 || h < 100) { setMetrics(null); return; }
    const m = computeBodyMetrics({
      weight_kg: w, height_cm: h, age: a,
      gender, activity_level: activityLevel, goal_type: goalType,
    } as Profile);
    setMetrics(m);
    // Seed override input with suggested cal when metrics first computed
    if (m && !customCalTarget) setCalOverrideInput(String(m.suggestedCal));
  }, [weightKg, effectiveHeightCm, age, gender, activityLevel, goalType]);
 
  const handleDismiss = () => { setClosing(true); setTimeout(() => onSkip?.(), 280); };
  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) handleDismiss(); };
  const canAdvanceBody = parseFloat(effectiveHeightCm) > 0 && parseFloat(weightKg) > 0 && parseInt(age) > 0;
 
  const effectiveCalTarget = customCalTarget ?? metrics?.suggestedCal ?? 2000;
  const isCustomized       = customCalTarget !== null && metrics && customCalTarget !== metrics.suggestedCal;
 
  const handleComplete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const { profile } = await completeOnboarding({
      age:            parseInt(age),
      height_cm:      parseFloat(effectiveHeightCm),
      weight_kg:      parseFloat(weightKg),
      gender,
      activity_level: activityLevel,
      goal_type:      goalType,
    });
 
    // Apply custom calorie target AFTER trigger runs (trigger computes from TDEE,
    // but user's custom value should win)
    if (profile && isCustomized) {
      await saveProfile({ daily_cal_goal: customCalTarget! });
    }
 
    setIsSaving(false);
    if (profile) {
      setClosing(true);
      // Embed the final cal goal in the returned profile
      setTimeout(() => onDone({
        ...profile,
        daily_cal_goal: isCustomized ? customCalTarget! : profile.daily_cal_goal,
      }), 300);
    }
  };
 
  // Styles
  const bg    = dk ? 'bg-[#141008]' : 'bg-white';
  const txt   = dk ? 'text-[#F5EDD8]' : 'text-[#1C1008]';
  const sub   = dk ? 'text-[#8B6D52]' : 'text-[#A67C52]';
  const inp   = dk
    ? 'bg-white/6 border-white/12 text-[#F5EDD8] placeholder-white/25 focus:border-[#C9532A]'
    : 'bg-[#FDF9F0] border-[#E0D4BC] text-[#1C1008] placeholder-[#A67C52]/50 focus:border-[#C9532A]';
  const pill  = dk
    ? 'border-white/10 bg-white/4 text-[#D4B896] hover:bg-white/10'
    : 'border-[#E8E0CC] bg-white text-[#3D2010] hover:bg-[#FFF7F2]';
  const orange = 'bg-[#C9532A] border-[#C9532A] text-white shadow-[0_4px_14px_rgba(201,83,42,0.35)]';
 
  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col justify-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onClick={handleBackdrop}
    >
      <div
        ref={sheetRef}
        className={[
          'w-full sm:max-w-md flex flex-col',
          'rounded-t-[2.5rem] sm:rounded-[2.5rem]',
          'max-h-[94vh] overflow-hidden',
          bg, txt, 'border',
          dk ? 'border-white/8' : 'border-[#E8E0CC]',
          'shadow-[0_-8px_60px_rgba(0,0,0,0.4)]',
          closing ? 'animate-sheet-out' : 'animate-sheet-in',
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pt-4 pb-5 border-b ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}`}>
          <div className="flex justify-center mb-4 sm:hidden">
            <div className={`w-10 h-[3px] rounded-full ${dk ? 'bg-white/20' : 'bg-black/15'}`} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9532A] mb-1">💎 Body Profile</p>
              <h2 className="font-serif font-bold text-2xl leading-tight">
                {step === 'gender'   ? 'Tell me about you'     :
                 step === 'body'     ? 'Your measurements'     :
                 step === 'activity' ? 'Daily activity level'  :
                 step === 'goal'     ? "What's your goal?"     :
                                       'Your personalised targets'}
              </h2>
              <p className={`text-[11px] ${sub} mt-1`}>
                {step === 'result' ? 'Based on your body science — feel free to adjust below' : 'You can always update this in Settings'}
              </p>
            </div>
            <button onClick={handleDismiss}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-black transition-all active:scale-90 mt-1 ${dk ? 'bg-white/8 hover:bg-white/18 text-[#D4B896]' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}
              aria-label="Close">✕</button>
          </div>
 
          {/* Progress */}
          <div className={`h-1 rounded-full mt-4 overflow-hidden ${dk ? 'bg-white/8' : 'bg-[#F0E8D8]'}`}>
            <div className="h-full rounded-full bg-[#C9532A] transition-all duration-500 ease-out"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((s, i) => (
              <div key={s}>
                <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i <= stepIdx ? 'bg-[#C9532A]' : dk ? 'bg-white/15' : 'bg-black/10'}`} />
              </div>
            ))}
          </div>
        </div>
 
        {/* ── Content ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 space-y-5">
 
          {/* GENDER */}
          {step === 'gender' && (
            <div className="space-y-4 animate-step-in">
              <p className={`text-[11px] ${sub}`}>This helps us compute your BMR accurately</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { id: 'female' as Gender, icon: '👩🏿', label: 'Female' },
                  { id: 'male'   as Gender, icon: '👨🏿', label: 'Male'   },
                  { id: 'wahalla'  as Gender, icon: '🌈',  label: 'wahalla'  },
                ]).map(g => (
                  <button key={g.id} onClick={() => setGender(g.id)}
                    className={`py-6 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${gender === g.id ? orange : pill}`}>
                    <span className="text-3xl block mb-2">{g.icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-wide">{g.label}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>Your age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 24" inputMode="numeric" min="10" max="100"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all ${inp}`}/>
              </div>
            </div>
          )}
 
          {/* BODY */}
          {step === 'body' && (
            <div className="space-y-4 animate-step-in">
              <p className={`text-[11px] ${sub}`}>Used to calculate your BMI and daily calorie targets</p>
 
              {/* Height with unit toggle */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Height</label>
                  {/* Unit toggle */}
                  <div className={`flex rounded-xl overflow-hidden border text-[9px] font-black uppercase ${dk ? 'border-white/10' : 'border-[#E0D4BC]'}`}>
                    {(['cm', 'ft'] as const).map(u => (
                      <button key={u} onClick={() => handleHeightUnitToggle(u)}
                        className={`px-3 py-1.5 transition-all ${heightUnit === u ? 'bg-[#C9532A] text-white' : dk ? 'text-[#8B6D52]' : 'text-[#A67C52]'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
 
                {heightUnit === 'cm' ? (
                  <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)}
                    placeholder="e.g. 165" inputMode="decimal"
                    className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all ${inp}`}/>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)}
                        placeholder="Feet (e.g. 5)" inputMode="numeric"
                        className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all ${inp}`}/>
                      <p className={`text-[9px] ${sub} mt-1 text-center`}>ft</p>
                    </div>
                    <div>
                      <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)}
                        placeholder="Inches (e.g. 6)" inputMode="numeric" min="0" max="11"
                        className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all ${inp}`}/>
                      <p className={`text-[9px] ${sub} mt-1 text-center`}>in</p>
                    </div>
                  </div>
                )}
                {heightUnit === 'ft' && parseFloat(effectiveHeightCm) > 0 && (
                  <p className={`text-[10px] ${sub} mt-1.5 text-center`}>≈ {effectiveHeightCm} cm</p>
                )}
              </div>
 
              {/* Weight */}
              <div>
                <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>Weight (kg)</label>
                <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)}
                  placeholder="e.g. 68" inputMode="decimal"
                  className={`w-full px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all ${inp}`}/>
              </div>
 
              {/* Live BMI */}
              {metrics && (
                <div className={`p-4 rounded-2xl border animate-fade-in ${dk ? 'bg-white/4 border-white/8' : 'bg-[#FDF9F0] border-[#E8E0CC]'}`}>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3`}>Live BMI Preview</p>
                  <BMIBar bmi={metrics.bmi} category={metrics.bmiCategory} />
                </div>
              )}
            </div>
          )}
 
          {/* ACTIVITY */}
          {step === 'activity' && (
            <div className="space-y-2.5 animate-step-in">
              <p className={`text-[11px] ${sub} mb-1`}>How active are you on a typical week?</p>
              {ACTIVITY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setActivityLevel(opt.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] ${activityLevel === opt.id ? orange : pill}`}>
                  <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-black">{opt.label}</p>
                    <p className={`text-[10px] ${activityLevel === opt.id ? 'text-white/60' : sub}`}>{opt.desc}</p>
                  </div>
                  {activityLevel === opt.id && <span className="ml-auto text-white text-base flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
          )}
 
          {/* GOAL */}
          {step === 'goal' && (
            <div className="space-y-3 animate-step-in">
              <p className={`text-[11px] ${sub} mb-1`}>This sets your daily calorie target automatically</p>
              {GOAL_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setGoalType(opt.id)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.99] ${goalType === opt.id ? orange : pill}`}>
                  <span className="text-3xl flex-shrink-0">{opt.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black">{opt.label}</p>
                    <p className={`text-[10px] ${goalType === opt.id ? 'text-white/60' : sub}`}>{opt.desc}</p>
                  </div>
                  {goalType === opt.id && <span className="text-white text-base flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
          )}
 
          {/* RESULT */}
          {step === 'result' && metrics && (
            <div className="space-y-4 animate-step-in">
              <BMIBar bmi={metrics.bmi} category={metrics.bmiCategory} />
 
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Daily Burn (TDEE)', val: `${metrics.tdee}`,        unit: 'kcal',            color: '#D4870D', icon: '🔥' },
                  { label: isCustomized ? 'Your Custom Target' : 'Suggested Target',
                           val: `${effectiveCalTarget}`,                        unit: 'kcal',            color: '#C9532A', icon: isCustomized ? '✨' : '🎯' },
                  { label: 'Water Goal',         val: `${metrics.waterGoal}`,  unit: 'glasses',         color: '#38bdf8', icon: '💧' },
                  { label: 'BMI Score',          val: `${metrics.bmi}`,        unit: metrics.bmiCategory,
                    color: metrics.bmi < 18.5 ? '#38bdf8' : metrics.bmi < 25 ? '#5C7A5E' : '#D4870D',   icon: '📊' },
                ].map((s, i) => (
                  <div key={i} className={`p-4 rounded-2xl border relative overflow-hidden ${dk ? 'bg-white/4 border-white/8' : 'bg-[#FDF9F0] border-[#E8E0CC]'}`}>
                    <div className="absolute top-2 right-2 text-2xl opacity-15">{s.icon}</div>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-1`}>{s.label}</p>
                    <p className="font-serif font-black text-xl" style={{ color: s.color }}>
                      {s.val} <span className={`text-[9px] font-normal ${sub}`}>{s.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
 
              {/* ── Custom calorie override ───────────────────────────────── */}
              <div className={`rounded-2xl border overflow-hidden ${dk ? 'border-white/8' : 'border-[#E8E0CC]'}`}>
                <button
                  onClick={() => setShowCalOverride(!showCalOverride)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 text-sm transition-all ${dk ? 'hover:bg-white/5' : 'hover:bg-[#FDF9F0]'}`}>
                  <span className="font-bold text-[12px]">
                    {isCustomized ? '✨ Custom calorie target set' : 'Adjust my calorie target'}
                  </span>
                  <span className={`text-xs transition-transform duration-200 ${showCalOverride ? 'rotate-180' : ''}`}>▾</span>
                </button>
 
                {showCalOverride && (
                  <div className={`px-4 pb-4 border-t ${dk ? 'border-white/6 bg-white/3' : 'border-[#F0E8D8] bg-[#FDFAF5]'}`}>
                    <p className={`text-[10px] ${sub} mt-3 mb-3 leading-relaxed`}>
                      The app suggested <strong>{metrics.suggestedCal} kcal</strong> based on your TDEE.
                      You can override this with your own target.
                    </p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={calOverrideInput}
                        onChange={e => {
                          setCalOverrideInput(e.target.value);
                          const v = parseInt(e.target.value);
                          if (v >= 1200 && v <= 5000) setCustomCalTarget(v);
                        }}
                        placeholder={String(metrics.suggestedCal)}
                        inputMode="numeric" min="1200" max="5000"
                        className={`flex-1 px-4 py-3 rounded-xl border text-sm font-bold outline-none transition-all ${inp}`}
                      />
                      <span className={`text-xs font-bold ${sub} flex-shrink-0`}>kcal/day</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setCustomCalTarget(metrics.suggestedCal); setCalOverrideInput(String(metrics.suggestedCal)); }}
                        className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all active:scale-95 ${dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
                        Reset to suggested
                      </button>
                      {isCustomized && (
                        <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg ${dk ? 'bg-[#C9532A]/15 text-[#F5844C]' : 'bg-[#FEE9DF] text-[#C9532A]'}`}>
                          ✨ Custom: {customCalTarget} kcal
                        </span>
                      )}
                    </div>
                    <p className={`text-[9px] ${sub} mt-2 opacity-60`}>Min 1,200 · Max 5,000 kcal/day</p>
                  </div>
                )}
              </div>
 
              {/* Custom goal notice */}
              {isCustomized && (
                <div className={`p-3.5 rounded-2xl text-[11px] leading-relaxed border ${dk ? 'bg-white/4 border-white/8 text-[#D4B896]' : 'bg-[#F5EDD8] border-[#E8D8C0] text-[#5C3D1E]'}`}>
                  ✨ Your calorie goal is set to <strong>{customCalTarget} kcal</strong> — based on your personal preference. The app's suggested amount was {metrics.suggestedCal} kcal.
                </div>
              )}
 
              <div className={`p-4 rounded-2xl text-[11px] leading-relaxed ${dk ? 'bg-[#C9532A]/10 border border-[#C9532A]/20 text-[#F5844C]' : 'bg-[#FEE9DF] border border-[#F5C9B8] text-[#C9532A]'}`}>
                💎 These targets will be saved to your profile. Your calorie bar and water tracker update automatically.
              </div>
            </div>
          )}
 
          {step === 'result' && !metrics && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🤔</p>
              <p className={`text-sm ${sub}`}>Something looks off with your measurements — go back and check them.</p>
            </div>
          )}
        </div>
 
        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pb-8 pt-4 border-t ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}`}>
          <div className="flex gap-3">
            {stepIdx > 0 ? (
              <button onClick={() => setStep(STEPS[stepIdx - 1])}
                className={`px-5 py-3.5 rounded-2xl font-bold text-sm border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896] hover:bg-white/5' : 'border-[#E8E2D2] hover:bg-[#F5EDD8]'}`}>
                ← Back
              </button>
            ) : (
              <button onClick={handleDismiss}
                className={`px-5 py-3.5 rounded-2xl font-bold text-sm border transition-all active:scale-95 ${dk ? 'border-white/10 text-[#D4B896] hover:bg-white/5' : 'border-[#E8E2D2] hover:bg-[#F5EDD8]'}`}>
                Skip for now
              </button>
            )}
 
            {step !== 'result' ? (
              <button
                onClick={() => { if (step === 'body' && !canAdvanceBody) return; setStep(STEPS[stepIdx + 1]); }}
                disabled={step === 'body' && !canAdvanceBody}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 bg-[#C9532A] hover:bg-[#A93F1F] text-white shadow-[0_4px_14px_rgba(201,83,42,0.28)]">
                {step === 'goal' ? 'See My Results →' : 'Continue →'}
              </button>
            ) : (
              <button onClick={handleComplete} disabled={isSaving || !metrics}
                className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 bg-[#C9532A] hover:bg-[#A93F1F] text-white shadow-[0_4px_14px_rgba(201,83,42,0.28)]">
                {isSaving
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…</span>
                  : '💎 Save My Profile'}
              </button>
            )}
          </div>
          <button onClick={handleDismiss}
            className={`w-full text-center text-[10px] font-bold mt-3 py-2 transition-opacity hover:opacity-100 opacity-40 ${sub}`}>
            {step === 'result' ? 'Close without saving' : "I'll do this later"}
          </button>
        </div>
      </div>
 
      <style>{`
        @keyframes sheet-in  { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes sheet-out { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(24px) scale(0.97)} }
        @keyframes step-in   { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fade-in   { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        .animate-sheet-in  { animation: sheet-in  0.32s cubic-bezier(0.34,1.4,0.64,1) forwards; }
        .animate-sheet-out { animation: sheet-out 0.22s ease-in forwards; }
        .animate-step-in   { animation: step-in   0.25s ease-out forwards; }
        .animate-fade-in   { animation: fade-in   0.2s  ease-out forwards; }
      `}</style>
    </div>
  );
}
 
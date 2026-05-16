'use client';

// ══════════════════════════════════════════════════════════════════════════════
// ProgramSheet.tsx  —  save as  app/components/ProgramSheet.tsx
//
// Sheet for creating / managing a nutrition program.
// Fully closeable — backdrop click, ✕ button, and "Cancel" all dismiss it.
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import { createProgram } from '../lib/db';

interface Props {
  dk:           boolean;
  suggestedCal: number;
  onClose:      () => void;
  onCreate:     () => void;
}

type GoalType = 'lose' | 'maintain' | 'gain';
type ProgramType = 'weekly' | 'monthly' | 'custom';

const GOAL_OPTIONS: { id: GoalType; icon: string; label: string; desc: string; calOffset: number }[] = [
  { id: 'lose',     icon: '📉', label: 'Lose Weight',    desc: '−500 kcal from TDEE',  calOffset: -500 },
  { id: 'maintain', icon: '⚖️',  label: 'Stay Balanced',  desc: 'Eat at your TDEE',     calOffset:    0 },
  { id: 'gain',     icon: '📈', label: 'Build & Gain',   desc: '+300 kcal above TDEE', calOffset:  300 },
];

const PROGRAM_TYPES: { id: ProgramType; icon: string; label: string; days: number }[] = [
  { id: 'weekly',  icon: '📅', label: '1 Week',    days: 7  },
  { id: 'monthly', icon: '🗓', label: '1 Month',   days: 30 },
  { id: 'custom',  icon: '🎯', label: 'Custom',    days: 0  },
];

function addDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function ProgramSheet({ dk, suggestedCal, onClose, onCreate }: Props) {
  const [goalType,    setGoalType   ] = useState<GoalType>('maintain');
  const [progType,    setProgType   ] = useState<ProgramType>('weekly');
  const [customDays,  setCustomDays ] = useState('14');
  const [calTarget,   setCalTarget  ] = useState(suggestedCal);
  const [waterTarget, setWaterTarget] = useState(8);
  const [isSaving,    setIsSaving   ] = useState(false);
  const [closing,     setClosing    ] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Update calorie target when goal type changes
  useEffect(() => {
    const offset = GOAL_OPTIONS.find(g => g.id === goalType)?.calOffset ?? 0;
    setCalTarget(Math.max(1200, suggestedCal + offset));
  }, [goalType, suggestedCal]);

  const dismiss = () => {
    setClosing(true);
    setTimeout(onClose, 250);
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) dismiss();
  };

  const days = progType === 'custom' ? parseInt(customDays) || 14 :
               PROGRAM_TYPES.find(p => p.id === progType)!.days;

  const handleCreate = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const today    = new Date().toISOString().split('T')[0];
    const endDate  = addDays(days);

    const prog = await createProgram({
      title:          `${GOAL_OPTIONS.find(g => g.id === goalType)?.label} — ${PROGRAM_TYPES.find(p => p.id === progType)?.label}`,
      type:           progType,
      goal_type:      goalType,
      calorie_target: calTarget,
      water_target:   waterTarget,
      start_date:     today,
      end_date:       endDate,
    });

    setIsSaving(false);
    if (prog) {
      setClosing(true);
      setTimeout(onCreate, 300);
    }
  };

  // Styles
  const bg   = dk ? 'bg-[#141008]' : 'bg-white';
  const txt  = dk ? 'text-[#F5EDD8]' : 'text-[#1C1008]';
  const sub  = dk ? 'text-[#8B6D52]' : 'text-[#A67C52]';
  const inp  = dk
    ? 'bg-white/6 border-white/12 text-[#F5EDD8] placeholder-white/25 focus:border-[#C9532A]'
    : 'bg-[#FDF9F0] border-[#E0D4BC] text-[#1C1008] focus:border-[#C9532A]';
  const pill = dk
    ? 'border-white/10 bg-white/4 text-[#D4B896] hover:bg-white/10'
    : 'border-[#E8E0CC] bg-white text-[#3D2010] hover:bg-[#FFF7F2]';
  const orange = 'bg-[#C9532A] border-[#C9532A] text-white shadow-[0_4px_14px_rgba(201,83,42,0.32)]';

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[400] flex flex-col justify-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(14px)' }}
      onClick={handleBackdrop}
    >
      <div
        className={[
          'w-full sm:max-w-md flex flex-col',
          'rounded-t-[2.5rem] sm:rounded-[2.5rem]',
          'max-h-[90vh] overflow-hidden',
          bg, txt,
          'border', dk ? 'border-white/8' : 'border-[#E8E0CC]',
          'shadow-2xl',
          closing ? 'animate-sheet-out' : 'animate-sheet-in',
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex-shrink-0 px-6 pt-4 pb-5 border-b ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}`}>
          <div className="flex justify-center mb-4 sm:hidden">
            <div className={`w-10 h-[3px] rounded-full ${dk ? 'bg-white/20' : 'bg-black/15'}`} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9532A] mb-1">🎯 Nutrition Program</p>
              <h2 className="font-serif font-bold text-2xl">Set Your Goal</h2>
              <p className={`text-[11px] ${sub} mt-0.5`}>Your daily targets will update automatically</p>
            </div>
            <button onClick={dismiss}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-black transition-all active:scale-90 flex-shrink-0
                ${dk ? 'bg-white/8 hover:bg-white/18 text-[#D4B896]' : 'bg-[#F5EDD8] hover:bg-[#EDE0C8] text-[#5C3D1E]'}`}
              aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">

          {/* Goal type */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3 block`}>What's your goal?</label>
            <div className="space-y-2.5">
              {GOAL_OPTIONS.map(g => (
                <button key={g.id} onClick={() => setGoalType(g.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]
                    ${goalType === g.id ? orange : pill}`}>
                  <span className="text-2xl flex-shrink-0">{g.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-black">{g.label}</p>
                    <p className={`text-[10px] ${goalType === g.id ? 'text-white/60' : sub}`}>{g.desc}</p>
                  </div>
                  {goalType === g.id && <span className="text-white flex-shrink-0">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3 block`}>Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {PROGRAM_TYPES.map(p => (
                <button key={p.id} onClick={() => setProgType(p.id)}
                  className={`py-3.5 rounded-2xl border text-center transition-all active:scale-95
                    ${progType === p.id ? orange : pill}`}>
                  <span className="text-xl block mb-1">{p.icon}</span>
                  <p className="text-[10px] font-black">{p.label}</p>
                </button>
              ))}
            </div>
            {progType === 'custom' && (
              <div className="mt-3 flex items-center gap-3">
                <input type="number" value={customDays} onChange={e => setCustomDays(e.target.value)}
                  className={`flex-1 px-4 py-3 rounded-2xl border text-sm outline-none transition-all ${inp}`}
                  placeholder="14" min="1" max="365" inputMode="numeric" />
                <span className={`text-sm font-bold ${sub} flex-shrink-0`}>days</span>
              </div>
            )}
          </div>

          {/* Calorie target */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>
              Daily Calorie Target
            </label>
            <div className="flex items-center gap-3">
              <input type="number" value={calTarget}
                onChange={e => setCalTarget(Math.max(1200, parseInt(e.target.value)||1200))}
                className={`flex-1 px-4 py-3.5 rounded-2xl border text-sm outline-none transition-all font-black ${inp}`}
                inputMode="numeric" />
              <span className={`text-xs font-bold ${sub} flex-shrink-0`}>kcal/day</span>
            </div>
            <p className={`text-[10px] ${sub} mt-1.5`}>Min 1,200 kcal — you can always adjust this</p>
          </div>

          {/* Water target */}
          <div>
            <label className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2 block`}>
              Daily Water Target
            </label>
            <div className="flex gap-2 flex-wrap">
              {[6, 7, 8, 9, 10, 12].map(n => (
                <button key={n} onClick={() => setWaterTarget(n)}
                  className={`px-4 py-2.5 rounded-2xl border text-[11px] font-black transition-all active:scale-95
                    ${waterTarget === n ? orange : pill}`}>
                  {n} 🥛
                </button>
              ))}
            </div>
          </div>

          {/* Summary card */}
          <div className={`p-4 rounded-2xl border ${dk ? 'bg-white/4 border-white/8' : 'bg-[#FDF9F0] border-[#E8E0CC]'}`}>
            <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3`}>Program Summary</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Duration', val: `${days}d`, color: '#D4870D' },
                { label: 'Cal/day',  val: `${calTarget}`, color: '#C9532A' },
                { label: 'Water/day',val: `${waterTarget}×`, color: '#38bdf8' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="font-serif font-black text-xl" style={{ color: s.color }}>{s.val}</p>
                  <p className={`text-[9px] uppercase font-black ${sub}`}>{s.label}</p>
                </div>
              ))}
            </div>
            <p className={`text-[10px] ${sub} mt-3 text-center`}>
              Ends {new Date(addDays(days)).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 px-6 pb-8 pt-4 border-t ${dk ? 'border-white/6' : 'border-[#F0E8D8]'}`}>
          <div className="flex gap-3">
            <button onClick={dismiss}
              className={`px-5 py-3.5 rounded-2xl font-bold text-sm border transition-all active:scale-95
                ${dk ? 'border-white/10 text-[#D4B896] hover:bg-white/5' : 'border-[#E8E2D2] hover:bg-[#F5EDD8]'}`}>
              Cancel
            </button>
            <button onClick={handleCreate} disabled={isSaving}
              className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 bg-[#C9532A] hover:bg-[#A93F1F] text-white shadow-[0_4px_14px_rgba(201,83,42,0.28)]">
              {isSaving
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…
                  </span>
                : '🎯 Start Program →'}
            </button>
          </div>
          <button onClick={dismiss}
            className={`w-full text-center text-[10px] font-bold mt-3 py-1.5 opacity-35 hover:opacity-70 transition-opacity ${sub}`}>
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sheet-in  { from{opacity:0;transform:translateY(28px) scale(0.97)} to{opacity:1;transform:none} }
        @keyframes sheet-out { from{opacity:1;transform:none} to{opacity:0;transform:translateY(20px) scale(0.97)} }
        .animate-sheet-in  { animation: sheet-in  0.3s cubic-bezier(0.34,1.4,0.64,1) forwards; }
        .animate-sheet-out { animation: sheet-out 0.22s ease-in forwards; }
      `}</style>
    </div>
  );
}
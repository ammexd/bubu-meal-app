'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ImageState = 'default' | 'wrong' | 'correct';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [greeting, setGreeting]       = useState('');
  const [shaking, setShaking]         = useState(false);
  const [imgState, setImgState]       = useState<ImageState>('default');
  const [imgBounce, setImgBounce]     = useState(false);

  const IMAGE_MAP: Record<ImageState, string> = {
    default: '/bubu.png',
    wrong:   '/s-me.png',
    correct: '/s-ag.png',
  };

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening');
    if (typeof window !== 'undefined' && localStorage.getItem('bubu_logged_in') === 'true') {
      router.push('/');
    }
  }, [router]);

  const triggerBounce = () => {
    setImgBounce(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setImgBounce(true));
    });
    setTimeout(() => setImgBounce(false), 700);
  };

  const verifyAccess = () => {
    if (password.trim() === 'LimitlessBubu123!') {
      setError(false);
      setImgState('correct');
      triggerBounce();
      setTimeout(() => setShowWarning(true), 700);
    } else {
      setError(true);
      setImgState('wrong');
      setShaking(true);
      triggerBounce();
      setTimeout(() => setShaking(false), 400);
      setTimeout(() => setImgState('default'), 2000);
    }
  };

  const continueToApp = () => {
    localStorage.setItem('bubu_logged_in', 'true');
    router.push('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verifyAccess();
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen text-white p-6"
      style={{ background: 'radial-gradient(circle at top, #1e293b, #020617)' }}
    >
      {!showWarning ? (

        /* ── LOGIN CARD ─────────────────────────────────────────────── */
        <div
          className={`max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl text-center transition-all duration-500 ${shaking ? 'animate-shake' : ''}`}
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-yellow-400/80 text-sm mb-2 uppercase tracking-widest">{greeting}</p>

          {/* ── Avatar ── */}
          <div className="relative inline-block mb-6">
            <div
              className={`absolute inset-0 blur-2xl rounded-full transition-colors duration-500 ${
                imgState === 'correct' ? 'bg-green-400 opacity-30' :
                imgState === 'wrong'   ? 'bg-red-400 opacity-30'   :
                                         'bg-yellow-400 opacity-20'
              }`}
            />
            <img
              key={imgState}
              src={IMAGE_MAP[imgState]}
              alt="Bubu avatar"
              className={`relative w-28 h-28 rounded-full object-cover border-2 transition-all duration-300 ${
                imgState === 'correct' ? 'border-green-400/60 shadow-[0_0_24px_rgba(74,222,128,0.4)]' :
                imgState === 'wrong'   ? 'border-red-400/60   shadow-[0_0_24px_rgba(248,113,113,0.4)]' :
                                         'border-white/20'
              } ${imgBounce ? 'animate-bounce-once' : ''}`}
            />
            {imgState === 'correct' && (
              <span className="absolute inset-0 rounded-full border-2 border-green-400/50 animate-ping" />
            )}
          </div>

          <h1 className="text-3xl font-bold mb-2">
            {imgState === 'correct' ? '✨ Welcome back!' : 'Welcome, Bubu'}
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            {imgState === 'wrong'
              ? "Hmm, that doesn't look right…"
              : imgState === 'correct'
              ? 'Access granted 🎉'
              : 'Enter your access key'}
          </p>

          {/* ── Password field with eye toggle ── */}
          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (imgState !== 'default') setImgState('default');
                setError(false);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Access Key..."
              className="w-full bg-white/5 border border-white/10 py-4 pl-6 pr-14 rounded-2xl text-center text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/30 transition-all"
            />

            {/* Eye toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(p => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/80 hover:bg-white/8 transition-all active:scale-90"
            >
              {showPassword ? (
                /* Eye-off — hide */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                /* Eye — show */
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                  className="w-5 h-5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-3 animate-fade-in">
              ❌ That's not quite right — try again!
            </p>
          )}

          <button
            onClick={verifyAccess}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-yellow-400/50 transition-all active:scale-95"
          >
            Unlock →
          </button>

          <div className="mt-6 text-[10px] text-slate-500 uppercase">
            Private Instance • Bubu Only
          </div>
        </div>

      ) : (

        /* ── SUCCESS / WARNING MODAL ─────────────────────────────────── */
        <div
          className="max-w-md w-full rounded-3xl p-8 text-center animate-modal-in"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-25 rounded-full" />
            <img
              src="/s-ag.png"
              alt="Welcome"
              className="relative w-32 h-32 rounded-full object-cover border-2 border-yellow-400/50 shadow-[0_0_32px_rgba(250,204,21,0.35)]"
            />
            <span className="absolute bottom-1 right-1 text-xl">✨</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Hey Bubu! 💛</h2>
          <p className="text-yellow-400/80 text-xs uppercase tracking-widest mb-4">
            Your personal nutrition space
          </p>

          <p className="text-slate-300 text-sm leading-relaxed mb-2">
            This app was hand-built <span className="text-yellow-400 font-semibold">just for you</span> —
            your food culture, your vibes, your hydration goals.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            It knows you love Nigerian food, that Indomie is a mood, and that you probably need to drink more water. 💧
          </p>

          <div className="flex gap-2 justify-center flex-wrap mb-6 text-xs">
            {['🍛 Nigerian-first', '💧 Hydration tracking', '🔔 Email reminders', '🤩 Vibe matching'].map(tag => (
              <span key={tag} className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 text-slate-400 text-xs p-3 rounded-xl mb-6 leading-relaxed">
            By continuing, you confirm you understand this is a private experience built specifically for Bubu. 💎
          </div>

          <button
            onClick={continueToApp}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-yellow-400/50 transition-all active:scale-95 text-base"
          >
            Let's eat! 🍽️
          </button>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-8px); }
          75%       { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }

        @keyframes bounce-once {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.18); }
          65%  { transform: scale(0.93); }
          100% { transform: scale(1); }
        }
        .animate-bounce-once { animation: bounce-once 0.6s cubic-bezier(0.34,1.56,0.64,1); }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 0.25s ease; }

        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.94) translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        .animate-modal-in { animation: modal-in 0.45s cubic-bezier(0.34,1.56,0.64,1); }
      `}</style>
    </div>
  );
}
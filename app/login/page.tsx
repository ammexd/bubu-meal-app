'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

type ImageState = 'default' | 'wrong' | 'correct';
type Screen = 'login' | 'v2';

const MASTER_EMAIL = 'legacy@bubu.com';
const MASTER_PASS = 'LimitlessBubu123!';

const V2_NODES = [
  { id: 'brain', label: 'Food Database', icon: '🧠', desc: 'Saved favorites, preferences, and cultural meal options', hud: 'Profile Mode: Active', x: 50, y: 15, delay: 0 },
  { id: 'body', label: 'Body Metrics', icon: '📊', desc: 'BMI, TDEE, and weight tracking history records', hud: 'Daily Target: 1,850 kcal', x: 84, y: 36, delay: 80 },
  { id: 'market', label: 'Shopping List', icon: '🛒', desc: 'Weekly ingredients, grocery items, and market lists', hud: 'List Status: Ready', x: 74, y: 72, delay: 160 },
  { id: 'program', label: 'Diet Plans', icon: '🎯', desc: 'Weekly nutrition schedules and custom dietary targets', hud: 'Plan: Active Track', x: 26, y: 72, delay: 240 },
  { id: 'email', label: 'Notifications', icon: '💌', desc: 'Email alerts for hydration reminders and daily goals', hud: 'Alerts: Connected', x: 16, y: 36, delay: 320 },
];

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('login');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [imgState, setImgState] = useState<ImageState>('default');
  const [imgBounce, setImgBounce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [hudMessage, setHudMessage] = useState('DASHBOARD LOADING');
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [typedChars, setTypedChars] = useState(0);
  
  const HEADLINE = 'NourishSelect V2';
  const IMAGE_MAP: Record<ImageState, string> = {
    default: '/bubu.png',
    wrong: '/s-me.png',
    correct: '/s-ag.png',
  };

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) {
      setGreeting('Good Morning');
      setHudMessage('STATUS: WAITING FOR BREAKFAST LOGS');
    } else if (h < 18) {
      setGreeting('Good Afternoon');
      setHudMessage('STATUS: WAITING FOR LUNCH LOGS');
    } else {
      setGreeting('Good Evening');
      setHudMessage('STATUS: TOTALING DAILY NUTRITION');
    }

    const checkActiveSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session && localStorage.getItem('bubu_logged_in') === 'true') {
        setImgState('correct');
        setScreen('v2');
      }
      setLoading(false);
    };
    checkActiveSession();
  }, [router]);

  useEffect(() => {
    if (screen !== 'v2') return;

    V2_NODES.forEach(node => {
      setTimeout(() => {
        setVisibleNodes(prev => new Set([...prev, node.id]));
      }, 600 + node.delay);
    });

    let i = 0;
    const typer = setInterval(() => {
      i++;
      setTypedChars(i);
      if (i >= HEADLINE.length) clearInterval(typer);
    }, 60);

    return () => clearInterval(typer);
  }, [screen]);

  const triggerBounce = () => {
    setImgBounce(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setImgBounce(true)));
    setTimeout(() => setImgBounce(false), 700);
  };

  const verifyAccess = async () => {
    if (loading) return;
    const typed = password.trim();
    if (typed !== MASTER_PASS) { 
      setError(true); 
      setImgState('wrong'); 
      return; 
    }
    setLoading(true); 
    setError(false);
    try {
      await supabase.auth.signOut();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: MASTER_EMAIL, password: MASTER_PASS,
      });
      if (authError) { 
        setError(true); 
        setImgState('wrong'); 
        return; 
      }
      localStorage.setItem('bubu_logged_in', 'true');
      setImgState('correct');
      triggerBounce();
      setTimeout(() => setScreen('v2'), 900);
    } catch { 
      setError(true); 
      setImgState('wrong'); 
    } finally { 
      setLoading(false); 
    }
  };

  const continueToApp = () => router.replace('/');
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verifyAccess();
  };

  // ─── SCREEN TWO: V2 MAIN APP DASHBOARD MENU ───────────────────────────────
  if (screen === 'v2') {
    const activeFeature = activeNode ? V2_NODES.find(n => n.id === activeNode) : null;
    return (
      <div className="fixed inset-0 overflow-hidden text-white select-none" style={{ background: '#020408', fontFamily: "sans-serif" }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,83,42,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(56,189,248,0.04) 0%, transparent 60%), #020408' }}/>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(201,83,42,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(201,83,42,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        
        {['top-4 left-4 border-t border-l', 'top-4 right-4 border-t border-r', 'bottom-4 left-4 border-b border-l', 'bottom-4 right-4 border-b border-r'].map((cls, i) => (
          <div key={i} className={`absolute w-8 h-8 ${cls} border-[#C9532A]/30`}/>
        ))}

        {/* TOP STATUS HEADER WITH STANDARD PROFESSIONAL LABELS */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-20 w-full text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9532A] animate-pulse"/>
            <span className="text-[9px] tracking-[0.3em] uppercase text-[#C9532A] font-black">Dashboard Layout Active</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#C9532A] animate-pulse" style={{ animationDelay: '0.5s' }}/>
          </div>
          <span className="text-[7.5px] tracking-[0.15em] uppercase text-white/30 font-bold">
            {activeFeature ? `Selected View: ${activeFeature.hud}` : hudMessage}
          </span>
        </div>

        <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 py-12 gap-4 overflow-hidden">
          <div className="text-center space-y-1">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[#C9532A] font-black mb-1">Application Loading</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {HEADLINE.slice(0, typedChars)}
              <span className="inline-block w-0.5 h-8 bg-[#C9532A] ml-1 align-middle animate-[blink_1s_step-end_infinite]"/>
            </h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mt-2">Private User Settings Profile</p>
          </div>

          {/* CENTRAL APP NAVIGATION ORBIT */}
          <div className="relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] flex items-center justify-center my-2 flex-shrink-0">
            <div className="absolute w-[84%] h-[84%] rounded-full border border-[#C9532A]/10 animate-[spin_160s_linear_infinite]" />
            <div className="absolute w-[52%] h-[52%] rounded-full border border-dashed border-[#C9532A]/10 animate-[spin_40s_linear_infinite_reverse]" />
            
            {/* CENTER USER AVATAR COMPONENT */}
            <div className="absolute w-[24%] h-[24%] rounded-full flex items-center justify-center relative z-20 flex-shrink-0">
              <div className="absolute inset-0 blur-xl rounded-full bg-gradient-to-tr from-[#C9532A]/30 to-amber-500/10 opacity-80" />
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#C9532A]/40 bg-[#020408] shadow-[0_0_25px_rgba(201,83,42,0.25)] flex items-center justify-center transition-all duration-300">
                <img src="/s-ag.png" alt="User Profile Avatar" className="w-full h-full object-cover select-none pointer-events-none scale-[1.02]" />
              </div>
              <div className="absolute inset-[-4px] rounded-full border border-dashed border-[#C9532A]/30 animate-[spin_50s_linear_infinite]" />
            </div>

            {V2_NODES.map(node => (
              <button
                key={node.id}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-30"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  opacity: visibleNodes.has(node.id) ? 1 : 0,
                  transform: `translate(-50%, -50%) scale(${visibleNodes.has(node.id) ? 1 : 0.4})`,
                  transitionDelay: `${node.delay}ms`,
                }}
              >
                <div className={`relative flex flex-col items-center gap-1 transition-transform duration-200 ${activeNode === node.id ? 'scale-110' : ''}`}>
                  <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center relative transition-all duration-300 ${activeNode === node.id ? 'bg-[#C9532A]/20 shadow-[0_0_25px_rgba(201,83,42,0.4)] border-[#C9532A]' : 'bg-white/5 border-white/10 hover:border-white/20'} border`}>
                    {activeNode === node.id && <div className="absolute inset-0 rounded-full border border-[#C9532A]/40 animate-ping"/>}
                    <span className="text-xl"><div className="select-none">{node.icon}</div></span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-wider text-center max-w-[70px] sm:max-w-[75px] transition-colors duration-200 leading-tight" style={{ color: activeNode === node.id ? '#C9532A' : 'rgba(255,255,255,0.4)' }}>
                    {node.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* FEATURE DESCRIPTION DESCRIPTION TEXT */}
          <div className="min-h-[55px] w-full max-w-sm flex items-center justify-center text-center px-4 flex-shrink-0">
            {activeFeature ? (
              <div className="flex flex-col items-center justify-center gap-0.5 px-5 py-2 rounded-xl border border-[#C9532A]/30 bg-[#C9532A]/10 animate-[fadeUp_0.15s_ease-out] w-full">
                <p className="text-[8px] font-black uppercase text-[#C9532A] tracking-widest mb-0.5">{activeFeature.label}</p>
                <p className="text-[11px] font-bold tracking-wide text-amber-100 leading-normal">{activeFeature.desc}</p>
              </div>
            ) : (
              <div className="space-y-0.5 animate-[fadeUp_0.2s_ease-out]">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C9532A]">🎯 NUTRITION DASHBOARD</p>
                <p className="text-[10px] text-white/40 max-w-[290px] leading-relaxed mx-auto font-medium">
                  Track your personal meal profiles, calorie targets, and grocery shopping lists seamlessly.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2 w-full max-w-xs flex-shrink-0">
            {/* CLEAN PROFESSIONAL CALL TO ACTION BUTTON */}
            <button onClick={continueToApp} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 bg-gradient-to-r from-[#C9532A] to-[#A93F1F] shadow-[0_0_30px_rgba(201,83,42,0.3)] relative overflow-hidden group">
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/0 via-white/10 to-white/0" style={{ transform: 'skewX(-20deg)' }} />
              <span className="relative">Enter Application</span>
            </button>
            <p className="text-[8px] tracking-[0.3em] uppercase text-white/15">System Version 2.0.0</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN ONE: ACCOUNT SIGN IN CHASSIS ──────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen text-white p-6 overflow-hidden" style={{ background: 'radial-gradient(ellipse at top, #1e293b 0%, #020617 60%)' }}>
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
      
      <div className="relative w-full max-w-sm">
        <div className="rounded-[2.5rem] p-8 shadow-2xl text-center relative border border-white/5 bg-white/[0.02] backdrop-blur-xl">
          {['top-6 left-6 border-t border-l', 'top-6 right-6 border-t border-r', 'bottom-6 left-6 border-b border-l', 'bottom-6 right-6 border-b border-r'].map((cls, i) => (
            <div key={i} className={`absolute w-4 h-4 ${cls} border-white/10`}/>
          ))}

          <p className="text-amber-400/60 text-[9px] mb-3 uppercase tracking-[0.3em] font-bold">{greeting}</p>
          
          <div className="relative inline-block mb-5">
            <div className={`absolute inset-0 blur-2xl rounded-full transition-all duration-700 ${imgState==='correct' ? 'bg-green-400/30' : imgState==='wrong' ? 'bg-red-400/30' : 'bg-amber-400/10'}`}/>
            <img key={imgState} src={IMAGE_MAP[imgState]} alt="User Profile" className={`relative w-24 h-24 rounded-full object-cover border-2 transition-all duration-300 ${imgState==='correct' ? 'border-green-400/60 shadow-[0_0_25px_rgba(74,222,128,0.4)]' : imgState==='wrong' ? 'border-red-400/60 shadow-[0_0_25px_rgba(248,113,113,0.4)]' : 'border-white/10'} ${imgBounce ? 'animate-[bounceOnce_0.6s_ease-in-out]' : ''}`}/>
          </div>

          <h1 className="text-xl font-bold mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            {imgState==='correct' ? 'Access Granted' : 'Account Login'}
          </h1>
          <p className="text-white/30 text-[10px] mb-6 tracking-wide uppercase">
            {imgState==='wrong' ? 'Incorrect Password' : imgState==='correct' ? 'Loading Profile' : 'Private Dashboard Access'}
          </p>

          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); if(imgState!=='default') setImgState('default'); setError(false); }}
              onKeyDown={handleKeyDown}
              placeholder="••••••••••••"
              disabled={loading}
              className="w-full py-3.5 text-center text-sm text-white placeholder-white/10 outline-none rounded-xl border border-white/5 bg-white/[0.03] transition-all focus:border-amber-500/30 tracking-[0.2em] font-mono disabled:opacity-40"
            />
            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>

          {error && <p className="text-red-400/80 text-[10px] mb-3 tracking-wide uppercase font-bold">⚠ Sign In Failed — Please Check Credentials</p>}

          <button onClick={verifyAccess} disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-xs tracking-[0.15em] uppercase transition-all active:scale-[0.98] bg-gradient-to-r from-amber-400 to-orange-500 text-neutral-950 shadow-[0_4px_20px_rgba(245,158,11,0.15)] hover:shadow-[0_4px_25px_rgba(245,158,11,0.3)] disabled:opacity-40">
            {loading ? 'Verifying Account...' : 'Sign In'}
          </button>
          
          <div className="mt-5 text-[8px] tracking-[0.3em] uppercase text-white/10 font-bold">Protected Instance Portal</div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @keyframes bounceOnce { 0%, 100% { transform: scale(1); } 30% { transform: scale(1.12); } 60% { transform: scale(0.96); } }
      `}</style>
    </div>
  );
}

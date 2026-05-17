'use client';

// ══════════════════════════════════════════════════════════════════════════════
// MarketSheet.tsx  —  save as  app/components/MarketSheet.tsx
//
// Premium market list with:
//  • View A: Draft selector (select items → generate)
//  • View B: Generated snapshot with expandable screenshot preview
//  • Disclosure pattern: "Attached Preview ▾" expands inline preview
//  • Lightbox: fullscreen zoom with download on click
//  • Hidden printable component used for clean PNG export
//  • No checkboxes or toggles — everything is content-driven
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { createMarketSnapshot, toggleMarketItem, addMarketItem, getLatestMarketPlan } from '../lib/db';
import type { MarketPlan, MarketCategory, MarketItem, Profile } from '../lib/db';
import type { Meal } from '../lib/foodBrain';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface DraftItem {
  key:      string;
  name:     string;
  category: MarketCategory;
  quantity: string;
  source:   'meal_plan' | 'profile' | 'manual';
  selected: boolean;
}

interface Props {
  dk:              boolean;
  sub:             string;
  inputCls:        string;
  marketPlan:      MarketPlan | null;
  weeklyPlan:      Record<string, Record<string, Meal>> | null;
  profile:         Profile | null;
  email:           string;
  onPlanGenerated: (plan: MarketPlan) => void;
  onClearPlan:     () => void;
  onEmailList:     () => void;
  showToast:       (msg: string) => void;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const CAT_META: Record<MarketCategory, { icon: string; label: string; color: string }> = {
  protein:    { icon: '🥩', label: 'Protein',    color: '#C9532A' },
  groceries:  { icon: '🛒', label: 'Groceries',  color: '#D4870D' },
  vegetables: { icon: '🥦', label: 'Vegetables', color: '#5C7A5E' },
  fruits:     { icon: '🍎', label: 'Fruits',     color: '#C9532A' },
  dairy:      { icon: '🥛', label: 'Dairy',      color: '#38bdf8' },
  snacks:     { icon: '🍿', label: 'Snacks',     color: '#D4870D' },
  toiletries: { icon: '🪥', label: 'Toiletries', color: '#7B6BA8' },
  hygiene:    { icon: '🧴', label: 'Hygiene',    color: '#5C7A5E' },
  household:  { icon: '🏠', label: 'Household',  color: '#8B6D52' },
  other:      { icon: '📦', label: 'Other',      color: '#A67C52' },
};

const CAT_ORDER: MarketCategory[] = [
  'protein','groceries','vegetables','fruits','dairy',
  'snacks','toiletries','hygiene','household','other',
];

// ─── UTILITY ─────────────────────────────────────────────────────────────────

function categorise(name: string): MarketCategory {
  const k = name.toLowerCase();
  if (/chicken|beef|fish|turkey|lamb|pork|egg|prawn|shrimp|sardine|goat|liver/.test(k)) return 'protein';
  if (/milk|yogurt|cheese|cream|butter/.test(k))                                        return 'dairy';
  if (/spinach|tomato|onion|pepper|carrot|cabbage|okra|yam|plantain|cassava|ugu|ewedu|waterleaf/.test(k)) return 'vegetables';
  if (/mango|banana|orange|watermelon|pineapple|pawpaw|guava|lime|lemon/.test(k))       return 'fruits';
  if (/rice|garri|flour|pasta|noodle|bread|beans|lentil|maize|corn|oat/.test(k))        return 'groceries';
  return 'groceries';
}

function parseQty(qty: string): { count: number; unit: string } | null {
  const m = (qty ?? '').trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  return { count: parseFloat(m[1]), unit: m[2].trim().toLowerCase() };
}

function mergeItems<T extends { name: string; quantity: string }>(items: T[]): T[] {
  const map = new Map<string, T & { _count: number; _unit: string }>();
  for (const item of items) {
    const key = item.name.toLowerCase().replace(/\s*\(.*?\)/g,'').replace(/[^a-z0-9\s]/g,'').trim();
    if (!map.has(key)) {
      const p = parseQty(item.quantity ?? '1');
      map.set(key, { ...item, _count: p?.count ?? 1, _unit: p?.unit ?? '' });
    } else {
      const ex = map.get(key)!;
      const p  = parseQty(item.quantity ?? '1');
      if (p && p.unit === ex._unit) {
        ex._count += p.count;
        (ex as any).quantity = `${ex._count} ${ex._unit}`.trim();
      }
    }
  }
  return Array.from(map.values()).map(({ _count, _unit, ...rest }) => rest as unknown as T);
}

function buildProfileEssentials(profile: Profile | null): Omit<DraftItem, 'key' | 'selected'>[] {
  const items: Omit<DraftItem, 'key' | 'selected'>[] = [
    { name:'Drinking Water (sachet/bottle)', category:'groceries',  quantity:'2 packs', source:'profile' },
    { name:'Toothpaste',                     category:'toiletries', quantity:'1 tube',  source:'profile' },
    { name:'Toothbrush',                     category:'toiletries', quantity:'1',       source:'profile' },
    { name:'Bar Soap / Body Wash',           category:'hygiene',    quantity:'2 bars',  source:'profile' },
    { name:'Tissue / Toilet Roll',           category:'household',  quantity:'1 pack',  source:'profile' },
  ];
  if (profile?.gender === 'female') {
    items.push(
      { name:'Sanitary Pads',   category:'hygiene',    quantity:'1 pack', source:'profile' },
      { name:'Facial Cleanser', category:'hygiene',    quantity:'1',      source:'profile' },
      { name:'Body Lotion',     category:'toiletries', quantity:'1',      source:'profile' },
    );
  }
  if (profile?.goal_type === 'gain' || profile?.goal_type === 'lose') {
    items.push(
      { name:'Eggs (crate)',              category:'protein', quantity:'1 crate', source:'profile' },
      { name:'Groundnut / Peanut Butter', category:'protein', quantity:'1 jar',  source:'profile' },
    );
  }
  return items;
}

// ─── PRINTABLE DOCUMENT (hidden, used for clean export) ───────────────────────

function PrintableDocument({
  items, title, date,
}: {
  items: MarketItem[];
  title: string;
  date:  string;
}) {
  const byCategory = CAT_ORDER.reduce<Record<string, MarketItem[]>>((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div style={{
      width: '560px',
      background: '#FBF6EE',
      padding: '40px 36px 48px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', borderBottom: '1.5px solid rgba(28,16,8,0.08)', paddingBottom: '20px' }}>
        <p style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A67C52', marginBottom: '4px' }}>BuBu NourishSelect 💎</p>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1C1008', margin: '0 0 4px', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          {title}
        </h1>
        <p style={{ fontSize: '11px', color: '#A67C52', margin: 0 }}>Generated {date} · {items.length} items total</p>
      </div>

      {/* Categories */}
      {Object.entries(byCategory).map(([cat, catItems]) => {
        const meta = CAT_META[cat as MarketCategory];
        return (
          <div key={cat} style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>{meta.icon}</span>
              <p style={{
                fontSize: '9px', fontWeight: 800, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: meta.color, margin: 0,
              }}>{meta.label}</p>
              <div style={{ flex: 1, height: '1px', background: 'rgba(28,16,8,0.06)' }} />
            </div>
            {catItems.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '2px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '4px',
                    border: `1.5px solid ${meta.color}`,
                    background: item.checked ? meta.color : 'transparent',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.checked && <span style={{ fontSize: '8px', color: '#fff', fontWeight: 800 }}>✓</span>}
                  </div>
                  <p style={{
                    fontSize: '13px', color: item.checked ? '#A67C52' : '#1C1008',
                    margin: 0, textDecoration: item.checked ? 'line-through' : 'none',
                    fontWeight: 500,
                  }}>{item.name}</p>
                </div>
                {item.quantity && (
                  <p style={{ fontSize: '11px', color: '#A67C52', margin: 0, fontWeight: 600 }}>{item.quantity}</p>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        marginTop: '28px', paddingTop: '16px',
        borderTop: '1px solid rgba(28,16,8,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontSize: '10px', color: '#A67C52', margin: 0 }}>BuBu NourishSelect · Your nutrition companion</p>
        <p style={{ fontSize: '10px', color: '#C9532A', margin: 0, fontWeight: 700 }}>
          {items.filter(i => !i.checked).length} remaining
        </p>
      </div>
    </div>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose, onDownload }: { url: string; onClose: () => void; onDownload: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[600] flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', animation: 'lbIn 0.2s ease-out forwards' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-black transition-all active:scale-90"
        aria-label="Close preview"
      >✕</button>

      {/* Image */}
      <div
        className="relative max-w-lg w-full mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ animation: 'lbImgIn 0.25s cubic-bezier(0.34,1.4,0.64,1) forwards' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Market list preview" className="w-full" style={{ display: 'block' }} />
        {/* Overlay gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <p className="text-white/50 text-[11px] font-bold">Your market list · BuBu NourishSelect</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onDownload}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_4px_16px_rgba(201,83,42,0.4)]"
        >
          📥 Save to Device
        </button>
        <button
          onClick={onClose}
          className="px-5 py-3 rounded-2xl bg-white/8 hover:bg-white/16 text-white text-[11px] font-black uppercase tracking-wider transition-all active:scale-95"
        >
          Close
        </button>
      </div>

      <p className="text-white/20 text-[10px] mt-3">Press Esc or tap outside to close</p>

      <style>{`
        @keyframes lbIn    { from{opacity:0} to{opacity:1} }
        @keyframes lbImgIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ─── ATTACHED PREVIEW DISCLOSURE ──────────────────────────────────────────────

function AttachedPreview({
  items, dk, sub,
}: {
  items: MarketItem[];
  dk:    boolean;
  sub:   string;
}) {
  const printRef   = useRef<HTMLDivElement>(null);
  const [open,     setOpen    ] = useState(false);
  const [loading,  setLoading ] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showLight, setShowLight  ] = useState(false);

  const generatePreview = useCallback(async () => {
    if (previewUrl || !printRef.current) return;
    setLoading(true);
    try {
      await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(r));
      const url = await toPng(printRef.current, {
        quality:         1,
        pixelRatio:      2,
        backgroundColor: '#FBF6EE',
        fontEmbedCSS:    '',
        filter: (node: Element) => !['LINK','SCRIPT'].includes(node.tagName),
        style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
      });
      setPreviewUrl(url);
    } catch (err) {
      console.error('[AttachedPreview]', err);
    }
    setLoading(false);
  }, [previewUrl]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !previewUrl) await generatePreview();
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.download = `BuBu-Market-${new Date().toISOString().split('T')[0]}.png`;
    a.href = previewUrl;
    a.click();
  };

  const today = new Date().toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      {/* Hidden printable component — only used for toPng */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none', zIndex: -1 }}>
        <div ref={printRef}>
          <PrintableDocument items={items} title="Weekly Market List" date={today} />
        </div>
      </div>

      {/* Disclosure row */}
      <div className={`rounded-2xl overflow-hidden border transition-all duration-300 ${dk ? 'border-white/8' : 'border-[#E0D4BC]'}`}>
        {/* Toggle header */}
        <button
          onClick={handleToggle}
          className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 group ${dk ? 'hover:bg-white/4' : 'hover:bg-[#FDF9F0]'}`}
        >
          {/* Document icon */}
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${dk ? 'bg-white/6' : 'bg-[#F5EDD8]'}`}>
            <span className="text-sm">📋</span>
          </div>

          <div className="flex-1 text-left min-w-0">
            <p className="text-[12px] font-bold leading-none">
              Attached Preview
              {previewUrl && <span className="ml-1.5 text-[8px] font-black uppercase tracking-wider text-[#5C7A5E] bg-[#5C7A5E]/10 px-1.5 py-0.5 rounded-full">Ready</span>}
            </p>
            <p className={`text-[10px] mt-0.5 ${sub}`}>
              {open ? 'Tap to collapse' : `Clean export of your ${items.length} items`}
            </p>
          </div>

          {/* Chevron */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${open ? 'rotate-180' : ''} ${dk ? 'bg-white/6 text-[#8B6D52]' : 'bg-[#F5EDD8] text-[#A67C52]'}`}>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Expandable content */}
        <div
          className="overflow-hidden transition-all duration-400 ease-out"
          style={{
            maxHeight: open ? '600px' : '0px',
            opacity:   open ? 1 : 0,
          }}
        >
          <div className={`border-t ${dk ? 'border-white/6' : 'border-[#F0E8D8]'} p-4`}>
            {loading ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-[#C9532A] border-t-transparent animate-spin" />
                <p className={`text-[11px] ${sub}`}>Rendering export…</p>
              </div>
            ) : previewUrl ? (
              <div className="space-y-3">
                {/* Mini preview — clickable */}
                <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>Tap to view full screen</p>
                <button
                  onClick={() => setShowLight(true)}
                  className="w-full rounded-xl overflow-hidden border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group relative"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Market list preview" className="w-full object-cover max-h-64" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all duration-200">
                    <div className="w-10 h-10 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all duration-200">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg">🔍</span>
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#C9532A] hover:bg-[#A93F1F] text-white transition-all active:scale-95"
                  >
                    💾 Save Image
                  </button>
                  <button
                    onClick={() => { setPreviewUrl(null); generatePreview(); }}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#5C3D1E]'}`}
                  >
                    ↺
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLight && previewUrl && (
        <Lightbox url={previewUrl} onClose={() => setShowLight(false)} onDownload={handleDownload} />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function MarketSheet({
  dk, sub, inputCls, marketPlan, weeklyPlan, profile,
  email, onPlanGenerated, onClearPlan, onEmailList, showToast,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [newName,    setNewName   ] = useState('');
  const [newCat,     setNewCat    ] = useState<MarketCategory>('groceries');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat,  setNewItemCat ] = useState<MarketCategory>('groceries');

  // ── Initial draft ──────────────────────────────────────────────────────────
  const initialDraft = useMemo<DraftItem[]>(() => {
    const raw: Omit<DraftItem, 'key' | 'selected'>[] = [];

    if (weeklyPlan) {
      const seen = new Set<string>();
      Object.values(weeklyPlan).forEach((day: any) =>
        Object.values(day).forEach((meal: any) =>
          (meal.ingredients ?? []).forEach((ing: string) => {
            if (!seen.has(ing.toLowerCase())) {
              seen.add(ing.toLowerCase());
              raw.push({ name: ing, category: categorise(ing), quantity: '1 pack', source: 'meal_plan' });
            }
          })
        )
      );
    }

    buildProfileEssentials(profile).forEach(e => raw.push(e));
    return mergeItems(raw).map((item, i) => ({ ...item, key: `${item.source}-${i}`, selected: true }));
  }, [weeklyPlan, profile]);

  const [draftItems, setDraftItems] = useState<DraftItem[]>(initialDraft);

  useEffect(() => {
    if (!marketPlan) setDraftItems(initialDraft);
  }, [initialDraft, marketPlan]);

  const toggleDraft = (key: string) =>
    setDraftItems(prev => prev.map(i => i.key === key ? { ...i, selected: !i.selected } : i));

  const addManualDraft = () => {
    if (!newName.trim()) return;
    setDraftItems(prev => [...prev, {
      key: `manual-${Date.now()}`, name: newName.trim(),
      category: newCat, quantity: '1', source: 'manual', selected: true,
    }]);
    setNewName('');
  };

  const handleGenerate = async () => {
    const selected = draftItems.filter(i => i.selected);
    if (!selected.length) { showToast('⚠️ Select at least one item'); return; }
    setGenerating(true);
    try {
      const snapshot = await createMarketSnapshot(
        selected.map(({ name, category, quantity, source }) => ({
          name, category, quantity,
          source: source === 'manual' ? 'manual' : 'auto',
          checked: false,
        }))
      );
      if (snapshot) {
        onPlanGenerated(snapshot);
        showToast(`✅ ${snapshot.items?.length ?? 0} items in your list!`);
      } else {
        showToast('❌ Could not save — check connection');
      }
    } catch { showToast('❌ Something went wrong'); }
    finally { setGenerating(false); }
  };

  const handleToggleItem = async (itemId: string, current: boolean) => {
    onPlanGenerated({ ...marketPlan!, items: marketPlan!.items?.map(i => i.id === itemId ? { ...i, checked: !current } : i) });
    await toggleMarketItem(itemId, !current);
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !marketPlan?.id) return;
    const trimmed = newItemName.trim();
    onPlanGenerated({ ...marketPlan!, items: [...(marketPlan!.items ?? []), { name: trimmed, category: newItemCat, checked: false, source: 'manual' }] });
    setNewItemName('');
    await addMarketItem(marketPlan!.id, { name: trimmed, category: newItemCat, checked: false, source: 'manual' });
    const fresh = await getLatestMarketPlan();
    if (fresh) onPlanGenerated(fresh);
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card    = dk ? 'bg-white/4 border-white/8'          : 'bg-[#FDF9F0] border-[#E0D4BC]';
  const cardSel = dk ? 'bg-[#C9532A]/12 border-[#C9532A]/30' : 'bg-[#FEE9DF] border-[#F5C9B8]';
  const muted   = dk ? 'bg-white/6 border border-white/8 text-[#D4B896]' : 'bg-[#F5EDD8] border border-[#E0D4BC] text-[#5C3D1E]';

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW A — DRAFT
  // ══════════════════════════════════════════════════════════════════════════
  if (!marketPlan) {
    const selectedCount  = draftItems.filter(i => i.selected).length;
    const mealPlanItems  = draftItems.filter(i => i.source === 'meal_plan');
    const profileItems   = draftItems.filter(i => i.source === 'profile');
    const manualItems    = draftItems.filter(i => i.source === 'manual');

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#C9532A]">📋 Draft · Selection</p>
              <p className="font-serif font-bold text-base mt-1">{selectedCount} item{selectedCount !== 1 ? 's' : ''} selected</p>
              <p className={`text-[10px] ${sub} mt-0.5`}>Deselect anything you don't need, then finalize.</p>
            </div>
            <span className={`text-[8px] font-black uppercase px-2.5 py-1.5 rounded-full border flex-shrink-0 ${dk ? 'border-amber-400/30 bg-amber-400/10 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-600'}`}>
              Draft
            </span>
          </div>
        </div>

        {/* Meal plan items */}
        {mealPlanItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>📅 From Meal Plan ({mealPlanItems.filter(i => i.selected).length}/{mealPlanItems.length})</p>
              <button onClick={() => setDraftItems(prev => prev.map(i => i.source === 'meal_plan' ? { ...i, selected: !mealPlanItems.every(x => x.selected) } : i))}
                className={`text-[8px] font-black uppercase ${sub} hover:text-[#C9532A] transition-colors`}>
                {mealPlanItems.every(i => i.selected) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1.5">
              {mealPlanItems.map(item => (
                <DraftRow key={item.key} item={item} dk={dk} sub={sub} card={card} cardSel={cardSel}
                  onToggle={() => toggleDraft(item.key)} onRemove={() => setDraftItems(prev => prev.filter(i => i.key !== item.key))} />
              ))}
            </div>
          </div>
        )}

        {/* Profile essentials */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-[9px] font-black uppercase tracking-widest ${sub}`}>🪥 Essentials ({profileItems.filter(i => i.selected).length}/{profileItems.length})</p>
            <button onClick={() => setDraftItems(prev => prev.map(i => i.source === 'profile' ? { ...i, selected: !profileItems.every(x => x.selected) } : i))}
              className={`text-[8px] font-black uppercase ${sub} hover:text-[#C9532A] transition-colors`}>
              {profileItems.every(i => i.selected) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-1.5">
            {profileItems.map(item => (
              <DraftRow key={item.key} item={item} dk={dk} sub={sub} card={card} cardSel={cardSel}
                onToggle={() => toggleDraft(item.key)} onRemove={() => setDraftItems(prev => prev.filter(i => i.key !== item.key))} />
            ))}
          </div>
        </div>

        {/* Manual additions */}
        {manualItems.length > 0 && (
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-2`}>✏️ Your Additions ({manualItems.length})</p>
            <div className="space-y-1.5">
              {manualItems.map(item => (
                <DraftRow key={item.key} item={item} dk={dk} sub={sub} card={card} cardSel={cardSel}
                  onToggle={() => toggleDraft(item.key)} onRemove={() => setDraftItems(prev => prev.filter(i => i.key !== item.key))} />
              ))}
            </div>
          </div>
        )}

        {/* Add to draft */}
        <div className={`rounded-2xl border p-4 ${card}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3`}>➕ Add to Draft</p>
          <div className="flex gap-2 mb-2.5">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addManualDraft()}
              placeholder="e.g. Groundnut oil, Shampoo…"
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`} />
            <button onClick={addManualDraft} disabled={!newName.trim()}
              className="px-4 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 disabled:opacity-40">
              Add
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CAT_ORDER.map(cat => (
              <button key={cat} onClick={() => setNewCat(cat)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all active:scale-95 ${newCat === cat ? 'bg-[#C9532A] text-white' : dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
                {CAT_META[cat].icon} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button onClick={handleGenerate} disabled={generating || selectedCount === 0}
          className="w-full py-5 text-sm font-black uppercase rounded-2xl transition-all active:scale-95 disabled:opacity-60 bg-[#C9532A] hover:bg-[#A93F1F] text-white shadow-[0_6px_20px_rgba(201,83,42,0.32)]">
          {generating
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Creating list…</span>
            : `🤖 Finalize My Market List (${selectedCount} items)`}
        </button>

        {!weeklyPlan && <p className={`text-[10px] text-center ${sub} opacity-60`}>💡 Generate a weekly meal plan first for ingredient suggestions.</p>}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW B — GENERATED SNAPSHOT
  // ══════════════════════════════════════════════════════════════════════════

  const checkedCount = marketPlan.items?.filter(i => i.checked).length ?? 0;
  const totalCount   = marketPlan.items?.length ?? 0;
  const progressPct  = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const allDone      = totalCount > 0 && checkedCount === totalCount;

  return (
    <div className="space-y-4">

      {/* ── Progress header ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 ${card}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-widest ${allDone ? 'text-[#5C7A5E]' : 'text-[#C9532A]'}`}>
              {allDone ? '✅ Complete' : '🛒 Shopping'}
            </p>
            <p className="font-serif font-bold text-base mt-0.5">
              {allDone ? '🎉 All items checked!' : `${totalCount - checkedCount} item${totalCount - checkedCount !== 1 ? 's' : ''} remaining`}
            </p>
            <p className={`text-[10px] ${sub} mt-0.5`}>
              {new Date(marketPlan.week_start ?? '').toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}
            </p>
          </div>

          {/* Progress ring */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="19" fill="none" stroke={dk ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="3.5" />
              <circle cx="24" cy="24" r="19" fill="none" stroke="#5C7A5E" strokeWidth="3.5"
                strokeDasharray={`${2 * Math.PI * 19}`}
                strokeDashoffset={`${2 * Math.PI * 19 * (1 - progressPct / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#5C7A5E]">{progressPct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-1.5 rounded-full overflow-hidden ${dk ? 'bg-white/8' : 'bg-[#F0E8D8]'}`}>
          <div className="h-full rounded-full bg-[#5C7A5E] transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <p className={`text-[9px] font-bold mt-1.5 ${sub}`}>{checkedCount} of {totalCount} done</p>
      </div>

      {/* ── Action row ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5">
        <button onClick={onEmailList} className={`flex-1 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 ${muted}`}>📩 Email</button>
        <button onClick={() => { onClearPlan(); setDraftItems(initialDraft); }}
          className={`flex-1 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 border ${dk ? 'border-[#C9532A]/30 bg-[#C9532A]/10 text-[#F5844C]' : 'border-[#F5C9B8] bg-[#FEE9DF] text-[#C9532A]'}`}>
          🔄 New List
        </button>
      </div>

      {/* ── Items by category ────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {CAT_ORDER.map(cat => {
          const catItems = (marketPlan.items ?? []).filter(i => i.category === cat);
          if (!catItems.length) return null;
          const meta = CAT_META[cat];
          const doneCount = catItems.filter(i => i.checked).length;
          const allCatDone = doneCount === catItems.length;

          return (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{meta.icon}</span>
                <p className={`text-[9px] font-black uppercase tracking-widest`} style={{ color: meta.color }}>{meta.label}</p>
                <div className={`flex-1 h-px ${dk ? 'bg-white/8' : 'bg-[#F0E8D8]'}`} />
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${allCatDone ? 'bg-[#5C7A5E]/15 text-[#5C7A5E]' : dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
                  {allCatDone ? '✓ Done' : `${catItems.length - doneCount} left`}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <button
                    key={item.id ?? item.name}
                    onClick={() => item.id && handleToggleItem(item.id, item.checked ?? false)}
                    disabled={!item.id}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 active:scale-[0.99] group
                      ${item.checked
                        ? dk ? 'border-white/4 bg-white/2 opacity-45' : 'border-[#F0E8D8] bg-[#FDFAF5] opacity-40'
                        : dk ? 'border-white/8 bg-white/4 hover:bg-white/8' : 'border-[#E8E0CC] bg-white hover:border-[#C9532A]/20 hover:bg-[#FFF7F2]'}`}
                  >
                    {/* Checkbox area */}
                    <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${item.checked ? 'border-[#5C7A5E] bg-[#5C7A5E]' : `border-[${meta.color}]/30 group-hover:border-[${meta.color}]/60`}`}
                      style={{ borderColor: item.checked ? '#5C7A5E' : `${meta.color}40` }}>
                      {item.checked && <span className="text-white text-[9px] font-black">✓</span>}
                    </div>

                    <span className={`text-sm flex-1 leading-snug font-medium transition-all ${item.checked ? 'line-through text-inherit' : ''}`}>
                      {item.name}
                    </span>

                    {item.quantity && (
                      <span className={`text-[10px] font-bold flex-shrink-0 tabular-nums ${sub}`}>{item.quantity}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add item ────────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 ${card}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${sub} mb-3`}>➕ Add Item</p>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input value={newItemName} onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddItem()}
              placeholder="e.g. Groundnut oil, Shampoo…"
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-[#C9532A] transition-all ${inputCls}`} />
            <button onClick={handleAddItem} disabled={!newItemName.trim()}
              className="px-4 bg-[#C9532A] hover:bg-[#A93F1F] text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 disabled:opacity-40">
              Add
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CAT_ORDER.map(cat => (
              <button key={cat} onClick={() => setNewItemCat(cat)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all active:scale-95 ${newItemCat === cat ? 'bg-[#C9532A] text-white' : dk ? 'bg-white/6 text-[#D4B896]' : 'bg-[#F5EDD8] text-[#8B5E3C]'}`}>
                {CAT_META[cat].icon} {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Attached Preview Disclosure ──────────────────────────────────────── */}
      <AttachedPreview items={marketPlan.items ?? []} dk={dk} sub={sub} />
    </div>
  );
}

// ─── DRAFT ROW ────────────────────────────────────────────────────────────────

function DraftRow({ item, dk, sub, card, cardSel, onToggle, onRemove }: {
  item: DraftItem; dk: boolean; sub: string; card: string; cardSel: string;
  onToggle: () => void; onRemove: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${item.selected ? cardSel : card}`} onClick={onToggle}>
      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.selected ? 'bg-[#C9532A] border-[#C9532A]' : dk ? 'border-white/20' : 'border-black/20'}`}>
        {item.selected && <span className="text-white text-[9px] font-black">✓</span>}
      </div>
      <span className={`text-[12px] font-semibold flex-1 leading-snug ${item.selected ? '' : 'opacity-40 line-through'}`}>{item.name}</span>
      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${sub} ${dk ? 'bg-white/6' : 'bg-[#F5EDD8]'}`}>{item.quantity}</span>
      <button onClick={e => { e.stopPropagation(); onRemove(); }}
        className={`text-sm leading-none opacity-20 hover:opacity-70 transition-opacity flex-shrink-0 ${sub}`}>×</button>
    </div>
  );
}
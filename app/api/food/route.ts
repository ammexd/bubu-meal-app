// // app/api/food/route.ts
// // ─── HYBRID IMAGE ENGINE ──────────────────────────────────────────────────────
// // Strategy: Google Custom Search (primary) → Unsplash (fallback) → placeholder
// // Supports `index` param so the "Regenerate 💎" button cycles through results
// // ─────────────────────────────────────────────────────────────────────────────

// import { NextRequest, NextResponse } from 'next/server';

// // ── Types ─────────────────────────────────────────────────────────────────────
// interface ImageResult {
//   url: string;
//   source: 'google' | 'unsplash' | 'placeholder';
//   alt: string;
//   total: number;
// }

// // ── In-memory cache (persists per cold-start, ~5 min effective TTL on edge) ──
// const cache = new Map<string, { results: string[]; ts: number }>();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// // ── Google Custom Search ───────────────────────────────────────────────────────
// async function googleImageSearch(query: string): Promise<string[]> {
//   const key = process.env.GOOGLE_SEARCH_API_KEY;
//   const cx  = process.env.GOOGLE_CX; // Custom Search Engine ID

//   if (!key || !cx) return [];

//   // Check cache first
//   const cached = cache.get(query);
//   if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.results;

//   try {
//     const url = new URL('https://www.googleapis.com/customsearch/v1');
//     url.searchParams.set('key',        key);
//     url.searchParams.set('cx',         cx);
//     url.searchParams.set('q',          `${query} food dish plated`);
//     url.searchParams.set('searchType', 'image');
//     url.searchParams.set('num',        '8');           // up to 10 per request
//     url.searchParams.set('imgType',    'photo');
//     url.searchParams.set('safe',       'active');
//     url.searchParams.set('imgSize',    'large');
//     url.searchParams.set('fileType',   'jpg|png|webp');
//     // Prefer food/cooking sites for accuracy
//     url.searchParams.set('siteSearch', 'seriouseats.com,food52.com,allrecipes.com,cookinglight.com');
//     url.searchParams.set('siteSearchFilter', 'e'); // 'e' = exclude (we want all sites but these show up first)

//     const res  = await fetch(url.toString());
//     if (!res.ok) return [];

//     const data = await res.json() as {
//       items?: Array<{ link?: string; image?: { contextLink?: string } }>;
//     };

//     const urls = (data.items ?? [])
//       .map(item => item.link ?? '')
//       .filter(Boolean);

//     cache.set(query, { results: urls, ts: Date.now() });
//     return urls;
//   } catch {
//     return [];
//   }
// }

// // ── Unsplash fallback ─────────────────────────────────────────────────────────
// async function unsplashSearch(query: string, index = 0): Promise<string | null> {
//   const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
//   if (!key) return null;

//   try {
//     const res = await fetch(
//       `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food')}&orientation=landscape&per_page=6`,
//       { headers: { Authorization: `Client-ID ${key}` } }
//     );
//     if (!res.ok) return null;

//     const data = await res.json() as {
//       results?: Array<{ urls?: { regular?: string } }>;
//     };

//     const photos = data?.results ?? [];
//     const pick   = photos[Math.min(index, photos.length - 1)];
//     const img    = pick?.urls?.regular;
//     return img ? `${img}&w=800&h=500&fit=crop&q=80` : null;
//   } catch {
//     return null;
//   }
// }

// // ── Route Handler ─────────────────────────────────────────────────────────────
// export async function GET(req: NextRequest): Promise<NextResponse<ImageResult>> {
//   const { searchParams } = new URL(req.url);
//   const query  = searchParams.get('q')?.trim();
//   const index  = Math.max(0, parseInt(searchParams.get('index') ?? '0', 10));

//   if (!query) {
//     return NextResponse.json(
//       { url: '', source: 'placeholder', alt: 'Food', total: 0 },
//       { status: 400 }
//     );
//   }

//   // ── 1. Try Google Custom Search ────────────────────────────────────────────
//   const googleResults = await googleImageSearch(query);
//   if (googleResults.length > 0) {
//     const safeIndex = index % googleResults.length;
//     return NextResponse.json({
//       url:    googleResults[safeIndex],
//       source: 'google',
//       alt:    query,
//       total:  googleResults.length,
//     });
//   }

//   // ── 2. Fallback: Unsplash ──────────────────────────────────────────────────
//   const unsplashUrl = await unsplashSearch(query, index);
//   if (unsplashUrl) {
//     return NextResponse.json({
//       url:    unsplashUrl,
//       source: 'unsplash',
//       alt:    query,
//       total:  6,
//     });
//   }

//   // ── 3. Last resort: placeholder ───────────────────────────────────────────
//   return NextResponse.json({
//     url:    `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=500&fit=crop&q=70`,
//     source: 'placeholder',
//     alt:    query,
//     total:  1,
//   });
// }

// // Cache is keyed per-query. POST allows forced refresh.
// export async function POST(req: NextRequest): Promise<NextResponse> {
//   const { query } = await req.json() as { query?: string };
//   if (query) cache.delete(query);
//   return NextResponse.json({ cleared: true });
// }


import { NextRequest, NextResponse } from 'next/server';
import * as googlethis from 'googlethis';

// ─── 1. GOOGLE ENGINE (Primary) ───────────────────────────────
async function googleImageSearch(query: string): Promise<string[]> {
  try {
    const results = await googlethis.image(
      `${query} food photography dish`,
      {
        safe: true,
      }
    );

    return results
      .map((item: any) => item.url)
      .filter(Boolean);

  } catch (err) {
    console.error('[Google Engine Error]', err);
    return [];
  }
}

// ─── 2. UNSPLASH ENGINE (Fallback) ────────────────────────────
async function unsplashSearch(
  query: string,
  index = 0
): Promise<string | null> {

  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query + ' food'
      )}&orientation=landscape&per_page=6`,
      {
        headers: {
          Authorization: `Client-ID ${key}`,
        },
      }
    );

    const data = await res.json();

    const photos = data?.results ?? [];

    if (!photos.length) return null;

    const pick = photos[index % photos.length];

    return pick?.urls?.regular
      ? `${pick.urls.regular}&w=900&q=80`
      : null;

  } catch (err) {
    console.error('[Unsplash Engine Error]', err);
    return null;
  }
}

// ─── 3. HYBRID ROUTE ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const query = searchParams.get('q')?.trim();

  const index = Math.max(
    0,
    parseInt(searchParams.get('index') ?? '0', 10)
  );

  if (!query) {
    return NextResponse.json(
      {
        url: '',
        source: 'placeholder',
        total: 0,
      },
      { status: 400 }
    );
  }

  // 💎 LAYER 1 — GOOGLETHIS
  const googleResults = await googleImageSearch(query);

  if (googleResults.length > 0) {
    return NextResponse.json({
      url: googleResults[index % googleResults.length],
      source: 'google',
      total: googleResults.length,
    });
  }

  // 💎 LAYER 2 — UNSPLASH
  const unsplashUrl = await unsplashSearch(query, index);

  if (unsplashUrl) {
    return NextResponse.json({
      url: unsplashUrl,
      source: 'unsplash',
      total: 6,
    });
  }

  // 💎 LAYER 3 — FALLBACK PLACEHOLDER
  return NextResponse.json({
    url: '/fallback-food.jpg',
    source: 'placeholder',
    total: 1,
  });
}
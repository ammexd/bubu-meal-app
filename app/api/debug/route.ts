// app/api/debug/route.ts

import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {

  const profiles = await supabase
    .from('profiles')
    .select('*');

  const logs = await supabase
    .from('logs')
    .select('*');

  const foodPrefs = await supabase
    .from('food_preferences')
    .select('*');

  const imageCache = await supabase
    .from('food_image_cache')
    .select('*');

  return NextResponse.json({
    profiles: profiles.data,
    logs: logs.data,
    food_preferences: foodPrefs.data,
    food_image_cache: imageCache.data,
  });
}
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Environment Variables. Authentication will not work.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export const getOptimizedImageUrl = (url: string, _width: number = 800) => {
  // Return original URL for now as Supabase Image Transformations might be disabled/unsupported on this project
  // preventing broken images.
  // if (url && typeof url === 'string' && url.includes('/storage/v1/object/public/')) {
  //   return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&resize=cover&format=webp`;
  // }
  return url;
};

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Configuration:', {
  url: supabaseUrl ? 'URL is set' : 'URL is missing',
  key: supabaseAnonKey ? 'Key is set' : 'Key is missing'
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

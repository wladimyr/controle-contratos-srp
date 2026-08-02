
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sssaepolvrfafqttrvth.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

/ Adicionado a palavra 'export' para que o App.tsx consiga importar
export const supabase = createClient(supabaseUrl, supabaseKey);
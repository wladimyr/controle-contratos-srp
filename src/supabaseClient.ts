
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sssaepolvrfafqttrvth.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FlcG9sdnJmYWZxdHRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDE1MzUsImV4cCI6MjEwMTIxNzUzNX0.pabLfKw9-d2zHsLxl4XWCRk_fM001BEzqH2X5tYamag';
const supabase = createClient(supabaseUrl, supabaseKey)

/ Adicionado a palavra 'export' para que o App.tsx consiga importar
export const supabase = createClient(supabaseUrl, supabaseKey);
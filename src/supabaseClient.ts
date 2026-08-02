import { createClient } from '@supabase/supabase-js';

<<<<<<< HEAD
const supabaseUrl = 'sb_publishable_r_sssaepolvrfafqttrvth'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FlcG9sdnJmYWZxdHRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDE1MzUsImV4cCI6MjEwMTIxNzUzNX0.pabLfKw9-d2zHsLxl4XWCRk_fM001BEzqH2X5tYamag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
=======
// Tenta pegar do ambiente (.env); se não encontrar, usa a URL/Key direta
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://controle-contratos-srp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FlcG9sdnJmYWZxdHRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDE1MzUsImV4cCI6MjEwMTIxNzUzNX0.pabLfKw9-d2zHsLxl4XWCRk_fM001BEzqH2X5tYamag';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
>>>>>>> 27931b8 (atualizando codigo e layout)

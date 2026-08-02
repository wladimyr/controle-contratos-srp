import { createClient } from '@supabase/supabase-js'
<<<<<<< HEAD
const supabaseUrl = 'https://sssaepolvrfafqttrvth.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
=======

const supabaseUrl = 'sb_publishable_r_sssaepolvrfafqttrvth'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FlcG9sdnJmYWZxdHRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDE1MzUsImV4cCI6MjEwMTIxNzUzNX0.pabLfKw9-d2zHsLxl4XWCRk_fM001BEzqH2X5tYamag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
>>>>>>> f336a4d (atualizando codigo e layout)

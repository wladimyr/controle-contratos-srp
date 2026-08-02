import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'sssaepolvrfafqttrvth'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FlcG9sdnJmYWZxdHRydnRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NDE1MzUsImV4cCI6MjEwMTIxNzUzNX0.pabLfKw9-d2zHsLxl4XWCRk_fM001BEzqH2X5tYamag'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

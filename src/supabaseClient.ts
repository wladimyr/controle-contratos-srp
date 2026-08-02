TypeScript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sssaepolvrfafqttrvth.supabase.co'
const supabasePublishableKey = 'sb_publishable_r_sFpCqDIxIlEylStuSGfw_dM_TveSA'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
import { createClient } from '@supabase/supabase-js'

// Supabase project URL and publishable key are public client configuration.
const url = 'https://axednjikcambzbkxyqpp.supabase.co'
const key = 'sb_publishable_Vysddy5_b0uZ3iKgnkDTIw_X5O1pBEd'

export const isSupabaseConfigured = true
export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 10 } },
})

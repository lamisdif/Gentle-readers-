import { createClient } from '@supabase/supabase-js'

// ضعي هنا رابط مشروعك من Supabase
const supabaseUrl = 'https://fsximdllrhglabxbqvay.supabase.co'

// ضعي هنا مفتاح anon
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

// هذا هو العميل اللي رح نستخدمه في أي مكان في الموقع
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

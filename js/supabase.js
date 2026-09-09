// ============================================================
// SUPABASE CLIENT INITIALIZATION
// Equipment Borrowing & Return Monitoring System
// ============================================================

// *** IMPORTANT: Replace these with your actual Supabase credentials ***
const SUPABASE_URL = 'https://eljixsujkesiyrducbhd.supabase.co';      // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsaml4c3Vqa2VzaXlyZHVjYmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTYxMjgsImV4cCI6MjEwNDQ3MjEyOH0.Q4dyT90oTINOj9QC81ykN4v1_GE6lTtr-vF90uNvhLs';  // Your anon/public key

// Import Supabase from CDN (loaded in HTML via <script> tag)
const { createClient } = supabase;

// Initialize the Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabaseClient;

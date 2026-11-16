/* ===== Supabase credentials =====
   Override with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local if needed. */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://dbhsgszrnpovdxfqvswf.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiaHNnc3pybnBvdmR4ZnF2c3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjI2MDYsImV4cCI6MjEwMzk5ODYwNn0.DyMgmsCzugOVuipvpy3qYI7hoe27My25wnrBq-iamxA";
export const BUCKET = "reel-videos"; // keep whatever bucket you already created
export const MAX_MB = 50;

export const configured =
  SUPABASE_URL.includes(".supabase.co") &&
  !SUPABASE_URL.includes("YOUR-PROJECT") &&
  SUPABASE_ANON_KEY.length > 20;

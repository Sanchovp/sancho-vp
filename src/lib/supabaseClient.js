import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rwgjcshisoljccikhtgq.supabase.co";
// Chave pública (anon) — segura para expor no front-end. Todo acesso a dados
// é controlado por Row Level Security no banco.
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2pjc2hpc29samNjaWtodGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjkzOTIsImV4cCI6MjEwMzQ0NTM5Mn0._-OrUCqiV76bcAKQu9d7fSVh6o5be8wJrRWr1wntDjc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_ANON_KEY };

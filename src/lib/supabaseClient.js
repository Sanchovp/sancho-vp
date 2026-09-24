import { createClient } from "@supabase/supabase-js";

// Configuração via variáveis de ambiente do Vite (veja .env.example e docs/DEPLOY.md).
// Os valores padrão abaixo são a URL e a chave PÚBLICA (anon) do projeto de produção:
// ela é segura para expor no front-end, pois todo acesso a dados é controlado por
// Row Level Security no banco e por checagem de usuário nas Edge Functions.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://rwgjcshisoljccikhtgq.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3Z2pjc2hpc29samNjaWtodGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NjkzOTIsImV4cCI6MjEwMzQ0NTM5Mn0._-OrUCqiV76bcAKQu9d7fSVh6o5be8wJrRWr1wntDjc";

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cabeçalhos para chamar Edge Functions em nome do usuário logado.
// As funções exigem o JWT da sessão (não a chave anon) para identificar o usuário
// e verificar se ele pertence à empresa informada.
export async function functionHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
    apikey: SUPABASE_ANON_KEY,
  };
}

# Sancho VP

Conselho executivo de IA para pequenas e médias empresas, com três personas:

- **Sancho** — Vice-Presidente Executivo, consolida leituras e recomenda decisões
- **Sávio** — Consultor Financeiro (DRE, margens, valuation, fluxo de caixa)
- **Sandra** — Secretária Executiva (prazos, contratos, agenda, follow-ups)

## Stack

- React + Vite (front-end)
- Supabase Edge Function `sancho-chat` (proxy seguro para a API da Anthropic)

## Rodando localmente

```bash
npm install
npm run dev
```

## Deploy

Este repositório está pronto para deploy automático via Vercel ou Netlify:
a cada push na branch `main`, o site é republicado.

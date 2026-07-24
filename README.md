# Blancs Insurance — Website (Next.js)

## Local setup
```bash
cd web
npm install
cp .env.local.example .env.local   # then fill in your Supabase keys
npm run dev
```
Visit `http://localhost:3000/en` (also `/es` and `/ht`).

## Deploy to Vercel
```bash
npm install -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```
Then point `blancsins.com` at the Vercel deployment (Vercel's dashboard gives
exact DNS records to add at your registrar).

## Folder structure
```
web/
  app/
    layout.tsx              minimal root layout
    [locale]/
      layout.tsx             locale-aware layout (Header/Footer + messages)
      page.tsx                Home
      agents/page.tsx         Agent directory
      services/page.tsx       Services overview
      contact/page.tsx        Quote request form
    globals.css
  components/                Header, Hero, ServicesGrid, AgentsGrid,
                              QuoteForm, Footer, LanguageSwitcher,
                              WaveSeal, Seal (design-system pieces)
  messages/                  en.json, es.json, ht.json
  lib/                       agents.ts (static directory), supabase.ts
  i18n.ts, middleware.ts     next-intl routing config
```

Run `../docs/schema.sql` against your Supabase project before going live —
it creates the `quote_requests` table this site writes to, plus RLS
policies and the agent seed data.

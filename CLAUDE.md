# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is
A single-page static art site for Isabelle du Toit's **Requiem** series. Everything
lives in `index.html` (all CSS/JS/HTML inline) plus `public/artworks/*`. No build
step, no framework, no server. `vercel.json` is `{"outputDirectory":"."}`.

## Origin & the frozen twin (read this before touching anything)
This repo started as a **byte-identical clone** of the original companion site at
`h:\requiem`, which is deployed at **https://isabelledutoit.vercel.app** and is in
active use by galleries. That original is **frozen**:
- Never edit, redeploy, or re-point `h:\requiem` or its Vercel project
  (`isabelledutoit`, on Emile's own Hobby account). It is unrelated to this repo.
- This repo (`requiemseries`) is independent: Isabelle's own Vercel Hobby account,
  GitHub `isabelledutoit/requiemseries`, served at **requiem.isabelledutoit.com**.

## Deploy
Git-connected auto-deploy on Isabelle's Vercel Hobby account: push to `main` →
production. Preview deployments are disabled. Custom domain
`requiem.isabelledutoit.com` (GoDaddy CNAME → Vercel).

## Roadmap (phased)
- **Phase 1 (done):** identical clone live at the subdomain.
- **Phase 2:** add a top navbar (Contact, Portfolio, + more) — static-first.
- **Phase 3 (maybe):** convert to a Next.js app so Isabelle can upload artworks
  (DB + auth + uploads). Separate plan; Hobby stays non-commercial (personal showcase).

## Known follow-ups
- The footer QR link (`index.html`, the `.footer-qr` anchor) and `public/isabelledutoit_qr.png`
  still point at `isabelledutoit.vercel.app`; re-point to `requiem.isabelledutoit.com`
  when Emile confirms.
- No `<link rel="canonical">` / OpenGraph tags yet; add pointing at the new domain if
  SEO indexing becomes a goal.

## Editing notes
See `README.md` for the slide/cipher/tokenizer structure, how to swap paintings, and
the hidden audio easter egg.

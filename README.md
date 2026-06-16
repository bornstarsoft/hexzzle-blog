# Hexzzle

Hexzzle is a Hugo + Phaser static web game site for Cloudflare Pages.

## Local development

```bash
npm install
npm run build
hugo server
```

## Validation

```bash
npm test
npm run build
hugo --gc --minify
git diff --check
```

Existing posts remain under `/posts/<slug>/`; the main navigation focuses on the game pages.

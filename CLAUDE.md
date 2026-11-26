# Lanternfall

Browser action RPG: Vite 8 + three.js, plain ES modules (no TypeScript). Node >= 22.12.

## Commands
- `npm run dev`: run locally at http://localhost:5173. Do NOT use VS Code Live Server: the bare `import 'three'` needs Vite to resolve it, so Live Server shows a black screen.
- `npm test`: Vitest, tests in `tests/**/*.test.js`
- `npm run lint`: ESLint
- `npm run build` → `dist/` · `npm run build:single` → `dist-single/index.html` (one file, opens from disk)

## Layout
`src/main.js` entry · `src/scenes.js` · `src/config.js` · `src/game/` logic · `src/render/` three.js · `src/ui/` · `src/audio/` · `src/platform/`

## Conventions
- Run `npm test` and `npm run lint` before committing.
- Pushing to `main` deploys to GitHub Pages (`.github/workflows/`).

# Repository Guidelines

## Project Structure & Module Organization
This Next.js 15 workspace uses the App Router in `app/` for UI entry points and layout composition. Shared business use cases live in `application/` (e.g. `application/proyecto/CreateProyecto.ts`), while pure domain models and enums are grouped under `domain/`. Infrastructure adapters that talk to Supabase and other services sit in `infrastructure/` (such as `infrastructure/repositories/UserRepository.ts`). Reusable React logic belongs in `hooks/`, and static assets/icons go in `public/`. Keep generated typings and config in the root (`next.config.ts`, `tailwind.config.js`).

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` to launch the local server with Turbopack. `npm run build` performs the production bundle and should stay clean before merging. Run `npm start` to verify the built output. `npm run lint` executes the repository ESLint config; treat warnings as blockers and prefer `npm run lint -- --fix` for mechanical cleanups.

## Coding Style & Naming Conventions
Write components and hooks in TypeScript with 2-space indentation. React components and exported hooks follow PascalCase (e.g. `PizarraCanvas`) and camelCase (`usePizarra`). Domain entities retain their Spanish business names to mirror Supabase schemas; avoid anglicizing existing types. Favor functional components, Tailwind utility classes, and colocate view-specific helpers next to the route that consumes them. Allow ESLint and the Next.js preset to guide import order and dependency rules—run lint before pushing.

## Testing Guidelines
A formal test runner is not yet wired; when adding coverage, colocate files as `*.test.ts` or `*.test.tsx` beside the code under test and prefer React Testing Library for UI behavior. While automation is introduced, manually exercise critical flows (`npm run dev` + Supabase sandbox) and document scenarios in the PR description. High-risk logic in `application/` or `domain/` should include lightweight unit tests or story-like harnesses similar to `application/pizarra/test-pizarra.tsx`.

## Commit & Pull Request Guidelines
Keep commit subjects short (≤50 chars) and present tense, matching the existing style (`card en pizarra`, `Add Supabase authentication and user context`). Group related changes and avoid mixing refactors with feature work. Every PR should describe the change, list manual test notes, link relevant issues, and include screenshots or screen recordings for UI updates. Ensure CI-critical commands (`npm run build`, `npm run lint`) succeed before requesting review.

## Security & Configuration Tips
Store Supabase keys in `.env.local` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit secrets or personal data—add new environment variables to `README.md` and notify reviewers when rotations are needed.

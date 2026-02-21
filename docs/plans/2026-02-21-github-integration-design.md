# GitHub Integration Design

## Goal

Connect the variantform dashboard to GitHub repos so that Git is the source of truth. The dashboard reads base configs and overrides from the repo, and writes overrides back as commits. No more manual paste or Supabase-stored config data.

## Decisions

| Decision | Choice |
|----------|--------|
| Write mode | Direct commit to branch |
| Data source of truth | Git (not Supabase) |
| Repo scope | Only repos with `variantform init` already run |
| Project model | One project = one repo |
| Auth approach | GitHub App |

## Architecture

### Two Auth Layers

| Layer | Purpose | Mechanism |
|-------|---------|-----------|
| User identity | Login, session | Existing Supabase GitHub OAuth (unchanged) |
| Repo access | Read/write files in repos | GitHub App installation token |

User logs in with OAuth (identity). User installs the GitHub App on their repo (access). These are independent — revoking repo access doesn't log the user out.

### GitHub App

Register a GitHub App ("Variantform") with permissions:
- `contents: read & write` — read files, create commits
- `metadata: read` — list repos

Installation flow:
1. User clicks "Connect Repo" in dashboard
2. Redirected to GitHub App install page
3. User selects which repos to grant access to
4. GitHub redirects back with `installation_id`
5. Dashboard stores `installation_id` in Supabase linked to user/project
6. Backend uses App private key + `installation_id` to mint short-lived tokens

### Supabase Schema

**Keep `vf_projects`** with new columns:
- `github_repo` (text) — e.g., `owner/repo`
- `github_installation_id` (bigint) — GitHub App installation ID
- `default_branch` (text) — e.g., `main`

**Drop these tables** (data comes from Git):
- `vf_surfaces` — surfaces come from `.variantform.yaml` in the repo
- `vf_variants` — variants are directories under `variants/`
- `vf_overrides` — overrides are files in `variants/<name>/`

`vf_projects` becomes a thin mapping: user → repo → installation.

### Data Flow

**Reading** (user opens a project):
```
Dashboard → Next.js API route → GitHub API (installation token)
```
1. Fetch `.variantform.yaml` → surface definitions
2. Fetch each base config file (surface paths)
3. List `variants/` directories → variant names
4. For each variant, fetch override files matching surface paths

**Writing** (user saves an override):
1. User edits in Monaco editor, clicks Save
2. API route creates/updates file via GitHub Contents API
3. Commit message: `variantform: update <variant>/<surface-path>`
4. Dashboard refreshes from repo

**Deleting** an override:
- Delete file via GitHub API, commit message: `variantform: remove <variant>/<surface-path>`

### Backend API Routes

All routes authenticate user via Supabase session, look up `installation_id`, mint GitHub token, call GitHub API.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/install` | POST | Handle App installation callback, store `installation_id` |
| `/api/github/repos` | GET | List repos the App has access to |
| `/api/projects/[id]/surfaces` | GET | Read `.variantform.yaml` + fetch base configs |
| `/api/projects/[id]/variants` | GET | List variant directories |
| `/api/projects/[id]/variants/[name]` | GET | Fetch all overrides for a variant |
| `/api/projects/[id]/variants/[name]/[surface]` | PUT | Save override (commit to repo) |
| `/api/projects/[id]/variants/[name]/[surface]` | DELETE | Delete override (commit to repo) |
| `/api/projects/[id]/variants` | POST | Create a new variant |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `GITHUB_APP_ID` | From GitHub App registration |
| `GITHUB_APP_PRIVATE_KEY` | PEM key from App registration |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase calls |

### UI Changes

**Dashboard page** — "New Project" becomes a repo picker:
- Click "Connect Repo" → GitHub App install flow → select repo → project created

**Project overview** — Surfaces panel is now read-only (driven by `.variantform.yaml`). Variants panel reads from `variants/` dir. "Create Variant" still works via API.

**Variant editor** — Same three-pane layout. Base config loaded from repo. Save writes to repo. Small "last commit" indicator added.

**Remove** — Manual base_content textarea, surface creation form, override CRUD from Supabase.

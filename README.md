# Variantform

Git-native overlay tool for managing per-client SaaS product variants.

Keep one codebase. Ship customized versions to every client. No branch hell.

## How it works

Your base config files live in their normal locations. Per-client overrides live in `variants/<client>/` as delta files. Variantform merges base + overrides on demand using [JSON Merge Patch (RFC 7396)](https://datatracker.ietf.org/doc/html/rfc7396).

```
my-saas/
├── config/
│   ├── features.json          ← base (shared by all)
│   └── theme.json
├── variants/
│   ├── acme/
│   │   └── config/
│   │       └── features.json  ← only the delta: { "max_projects": 50 }
│   └── globex/
│       └── config/
│           ├── features.json
│           └── theme.json
└── .variantform.yaml          ← declares which files are customizable
```

New keys added to the base flow through to all variants automatically. The `validate` command catches stale overrides when the base changes.

## Install

```bash
npm install -g variantform
```

## Quick start

```bash
# 1. Initialize in your project
variantform init -s config/features.json:json:merge -s config/theme.json:json:replace

# 2. Create a client variant
variantform create acme

# 3. Add an override (only the keys that differ)
echo '{ "max_projects": 50, "time_tracking": true }' > variants/acme/config/features.json

# 4. See the resolved config
variantform resolve acme config/features.json

# 5. Check all variants
variantform status

# 6. See what acme overrides
variantform diff acme

# 7. Validate all overrides are still valid
variantform validate
```

## Commands

| Command | Description |
|---------|-------------|
| `init -s <surface...>` | Initialize variantform with declared surfaces |
| `create <client>` | Create a new client variant directory |
| `resolve <client> [surface]` | Output resolved config (base + overrides) |
| `status` | List all variants with override counts |
| `diff <client>` | Show which keys a variant overrides |
| `validate` | Check for stale keys, parse errors, extraneous files |

## Merge strategies

- **`merge`** (default): Deep merge override on top of base. Only delta keys needed. `null` deletes a key.
- **`replace`**: Override completely replaces the base file. Use for files where partial overrides don't make sense.

## Surface declaration

In `.variantform.yaml`:

```yaml
surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge
  - path: "config/theme.json"
    format: json
    strategy: replace
  - path: "config/workflows/*.yaml"
    format: yaml
    strategy: merge
```

Glob patterns are supported for surfaces.

## Why not...

| Alternative | Problem |
|-------------|---------|
| Feature flags (LaunchDarkly) | Runtime complexity, not config-level |
| Branch per client | Merge conflicts, rebase hell at scale |
| Kustomize | Kubernetes-specific, not general purpose |
| Copy-paste configs | Drift, no upstream sync |

## License

MIT

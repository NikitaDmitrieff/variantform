# Variantform Design Document

**Date**: 2026-02-20
**Status**: Approved (Revised after adversarial review)
**Author**: Nikita Dmitrieff + Claude

## Problem

SaaS vendors with enterprise clients face growing pressure to offer per-client customization. Today, this is managed with ad-hoc git branches, scattered feature flags, and manual processes. No dedicated tool exists to manage a portfolio of client-specific product variants from a single source of truth.

As AI makes software cheaper to build, the number of custom variants per vendor will grow. The tooling gap will widen.

## Landscape Analysis

### Existing Solutions (and Why They Fall Short)

| Category | Examples | Limitation |
|----------|----------|------------|
| Feature flags | LaunchDarkly, Unleash, Flagsmith, OpenFeature | Toggles and multi-variate flags per segment. Cannot manage entire configuration profiles per client as versioned, auditable artifacts. |
| White-label platforms | GoHighLevel, DashClicks, ActiveCampaign | Cosmetic-only customization (logo, colors). Product behavior is identical. |
| Multi-tenant architecture | AWS SaaS patterns, Azure SQL tenancy | Solves data isolation, not product differentiation. |
| Plugin/extension systems | Shopify Extensions, Backstage Templates | Requires each client to build their own extensions. |
| Configuration overlays | Kustomize, Helm, Jsonnet | Designed for Kubernetes manifests, not SaaS product configuration. Right pattern, wrong domain. |
| Git workflow tools | Graphite, GitButler, Mergify | No concept of "client variants" or "customization surfaces." |

### The Gap

No tool lets a SaaS vendor say: "Here's my core product config. Client A gets these overrides. Client B gets different ones. All variants live in one repo, are version-controlled, validated, and I can resolve any variant's full config on demand."

### Architecture Decision: Overlays, Not Branches

Early design considered a branch-per-client approach (each client gets a git branch with config deltas, synced via rebase). Adversarial review revealed critical flaws:

1. **Branch-per-client is a known anti-pattern** -- widely documented as unmanageable at scale.
2. **Git custom merge drivers don't work on hosted platforms** -- GitLab explicitly doesn't support them in MRs. GitHub has similar limitations.
3. **Rebase at scale has cascading failure modes** -- partial sync states, squash-merge incompatibility, dirty working trees.
4. **The Kubernetes community already solved this** -- Kustomize uses base + overlay folders, not branches. Same pattern, proven at scale.

**Variantform uses an overlay architecture** inspired by Kustomize, adapted for SaaS product configuration. All variants live as folders in the same repo, on the same branch. No branches, no rebase, no merge drivers.

## Solution: Variantform

A git-native overlay tool for managing per-client SaaS product variants.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Base** | The default configuration files in their normal repo locations |
| **Surface** | A declared file where per-client overrides are allowed |
| **Variant** | A named client with override files in `variants/<client>/` |
| **Override** | A file containing only the keys that differ from the base (JSON Merge Patch semantics) |
| **Resolve** | The process of merging base + overrides to produce final config for a client |

### Key Invariants

1. Variants only override declared surfaces -- the tool validates this.
2. Overrides are deltas, not full copies -- only what differs from base is stored.
3. Upstream improvements propagate automatically -- new keys in base flow through without any override changes.
4. All variants are visible in one checkout -- no branch switching, easy to audit and review.

### Repository Structure

```
my-saas/
├── src/                              # Application code (never overridden)
├── config/
│   ├── features.json                 # BASE: default product config
│   ├── theme.json                    # BASE: default theme
│   └── workflows/
│       └── default.yaml              # BASE: default workflow
├── variants/
│   ├── acme/
│   │   └── config/
│   │       └── features.json         # OVERRIDE: only Acme's deltas
│   ├── globex/
│   │   └── config/
│   │       ├── features.json         # OVERRIDE: Globex's deltas
│   │       └── theme.json            # OVERRIDE: Globex's theme
│   └── initech/
│       └── config/
│           └── features.json         # OVERRIDE: Initech's deltas
├── .variantform.yaml                 # Surface declarations
└── package.json
```

### Surface Declaration

```yaml
# .variantform.yaml
surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge       # deep merge: override contains only deltas

  - path: "config/theme.json"
    format: json
    strategy: replace     # full replace: override is the complete file

  - path: "config/workflows/*.yaml"
    format: yaml
    strategy: merge
```

**Strategies:**
- `merge` (default): Deep merge override on top of base. Uses JSON Merge Patch (RFC 7396) semantics -- `null` values in override mean "delete this key." New keys in base flow through automatically.
- `replace`: Override file completely replaces the base. Good for themes, CSS, or any file where partial override doesn't make sense.

### Override Example

Base `config/features.json`:
```json
{
  "kanban": true,
  "gantt": true,
  "time_tracking": false,
  "max_projects": 10,
  "ai_assistant": false
}
```

Acme's override `variants/acme/config/features.json`:
```json
{
  "time_tracking": true,
  "max_projects": 50
}
```

Resolved output for Acme:
```json
{
  "kanban": true,
  "gantt": true,
  "time_tracking": true,
  "max_projects": 50,
  "ai_assistant": false
}
```

When the base adds `"ai_assistant": true`, Acme automatically gets it -- no sync, no rebase, no conflict.

### CLI Commands

```bash
variantform init                          # Set up .variantform.yaml and variants/ directory
variantform create <client-name>          # Create a new variant directory
variantform resolve <client> [surface]    # Output the merged config for a client
variantform status                        # Show all variants and their override state
variantform diff <client>                 # Show what overrides differ from base
variantform validate                      # Check all overrides are valid against current base
```

### How "Upstream Sync" Works (It's Automatic)

With overlays, there's no explicit sync step. When the base config changes on `main`:

| Base change | Override behavior | Action needed |
|-------------|-------------------|---------------|
| New key added | Flows through automatically | None |
| Existing key value changed | Override's delta still applies on top | None |
| Key removed that no override touches | Works fine | None |
| Key removed that an override modified | Override references non-existent key | `validate` catches this |
| Key renamed | Override references old name | `validate` catches this |

The `validate` command catches the rare cases where manual intervention is needed. No more rebase, no more merge conflicts, no more cascading failures.

## Product Architecture

### Two Layers

**Layer 1: Open-Source CLI** (`variantform`)
- Overlay engine with JSON/YAML deep merge
- Validation, resolution, and status reporting
- MIT or Apache 2.0 licensed
- Works with any git host, any CI/CD

**Layer 2: Variantform Cloud** (commercial SaaS)
- GitHub/GitLab App + web dashboard
- Auto-validates on push to main
- Visual variant status dashboard
- AI-suggested override generation ("make Acme's config HIPAA-compliant")
- Override drift alerts over time
- Team permissions (who can edit which variant)
- Structured audit trail

### Feature Split

| Feature | CLI (Free) | Cloud (Paid) |
|---------|-----------|-------------|
| Create/manage variants | Yes | Yes |
| Resolve (merge base + overrides) | Yes | Yes + API |
| Validate overrides | Yes | Auto on push |
| Status overview | Terminal | Visual dashboard |
| Diff overrides vs base | Yes | Side-by-side visual diff |
| CI/CD integration | CLI in pipeline | Webhook + API |
| Override suggestions | No | AI-powered |
| Variant health history | No | Yes |
| Team permissions | No | Yes |
| Audit log | Git log | Structured trail |

## Business Model

**Target customer**: B2B SaaS companies (Series A+) with 5-20 enterprise clients demanding per-client customization.

**Go-to-market**: Open-source CLI drives adoption. Engineers discover it, try it, bring it to their team. Cloud upgrade for dashboard, AI suggestions, and audit trail.

**Pricing**: Per-variant per-month ($50-200/mo for a typical 10-variant setup).

**Timing thesis**: AI makes customization cheaper -> vendors say "yes" more -> variants proliferate -> need infrastructure to manage them -> Variantform.

## Competitive Positioning

- **vs. Feature flags** (LaunchDarkly): Complementary. Flags toggle features at runtime; Variantform manages entire config profiles per client as versioned artifacts in your repo. Use both.
- **vs. Kustomize/Helm**: Same overlay pattern, but designed for SaaS product config, not Kubernetes manifests. Simpler, more focused, with SaaS-specific features (variant health, client naming, CI/CD integration).
- **vs. Branch-per-client**: Variantform replaces this anti-pattern with a cleaner overlay model. Migration path: collapse client branches into overlay folders.
- **vs. Dev platforms** (Backstage): Different problem (scaffolding new services vs. managing variants of one).

## Risks

1. **Market timing** (medium): Thesis depends on AI accelerating customization demand. Mitigated by existing pain in B2B SaaS today.
2. **"Just use feature flags" objection** (high): Need clear content marketing showing the gap flags can't fill -- versioned config profiles, git-tracked, auditable, per-client.
3. **"Just use Kustomize" objection** (medium): Kustomize is for K8s manifests, not SaaS config. But the pattern is similar enough that some users might repurpose it. Differentiate on SaaS-specific features.
4. **Adoption friction** (medium): Requires retrofitting repos with surface declarations and migrating existing per-client configs into overlay folders. Mitigated by `variantform init` wizard.
5. **Override complexity at scale** (low for V1): With 100+ variants, the `variants/` directory gets large. Mitigated by tooling (status, validate) and the fact that override files are small (just deltas).

## Growth Vectors

- AI-powered override generation ("generate a HIPAA-compliant config overlay")
- Per-variant deployment management (resolve + deploy in one step)
- Variant template marketplace ("healthcare overlay", "enterprise overlay")
- Config schema evolution (detect breaking changes in base that affect overrides)
- Acquisition target for GitHub, GitLab, or LaunchDarkly

## Starting Scope (V1)

- Configuration-level customization only
- 5-20 client variants per vendor
- CLI tool with 6 core commands (init, create, resolve, status, diff, validate)
- JSON and YAML deep merge with RFC 7396 semantics
- merge and replace strategies per surface
- Validation against current base
- SaaS vendor's internal team as primary user

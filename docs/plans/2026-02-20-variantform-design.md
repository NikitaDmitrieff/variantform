# Variantform Design Document

**Date**: 2026-02-20
**Status**: Approved
**Author**: Nikita Dmitrieff + Claude

## Problem

SaaS vendors with enterprise clients face a growing pressure to offer per-client customization. Today, this is managed with ad-hoc git branches, scattered feature flags, and manual processes. No dedicated tool exists to manage a portfolio of client-specific product variants from a single source of truth.

As AI makes software cheaper to build, the number of custom variants per vendor will grow. The tooling gap will widen.

## Landscape Analysis

### Existing Solutions (and Why They Fall Short)

| Category | Examples | Limitation |
|----------|----------|------------|
| Feature flags | LaunchDarkly, Unleash, Flagsmith, OpenFeature | Binary on/off toggles. Cannot manage entire configuration profiles per client. |
| White-label platforms | GoHighLevel, DashClicks, ActiveCampaign | Cosmetic-only customization (logo, colors). Product behavior is identical. |
| Multi-tenant architecture | AWS SaaS patterns, Azure SQL tenancy | Solves data isolation, not product differentiation. |
| Plugin/extension systems | Shopify Extensions, Backstage Templates | Requires each client to build their own extensions. |
| Software Product Line (SPL) | S.P.L.O.T., FeatureIDE | Academic, complex, not designed for modern CI/CD. |
| Git workflow tools | Graphite, GitButler, Mergify | No concept of "client variants" or "customization surfaces." |

### The Gap

No tool lets a SaaS vendor say: "Here's my core product. Client A gets these config overrides. Client B gets different ones. I manage all variants from one source of truth, and upstream improvements propagate cleanly."

Companies do branch-per-client today, but with no dedicated tooling. The pain is real and recognized.

## Solution: Variantform

A git-native tool for managing per-client SaaS product variants.

### Core Concepts

| Concept | Git Equivalent | Variantform |
|---------|---------------|-------------|
| Source of truth | `main` branch | **Core product** |
| Client variant | Feature branch | **Variant branch** (contains only config deltas) |
| Customizable file | File | **Surface** (declared location where variants may diverge) |
| Core improvement | Commit to `main` | **Upstream change** (auto-propagated to variants) |
| Conflict | Merge conflict | **Drift** (variant customization collides with upstream change) |

### Key Invariants

1. Variants never modify core code -- they only touch declared surfaces.
2. Upstream always flows forward -- variants rebase onto latest `main`.
3. Conflicts are surfaced immediately with context about affected clients.

### Surface Declaration

Vendors declare customization surfaces in `.variantform.yaml`:

```yaml
surfaces:
  - path: "config/features.json"
    format: json
  - path: "config/theme.json"
    format: json
  - path: "config/workflows/*.yaml"
    format: yaml
```

Only files matching these patterns are allowed to differ across variant branches. The tool flags modifications outside declared surfaces as violations.

### Format-Aware Merging

Instead of raw git text merging, Variantform registers custom git merge drivers (via `.gitattributes`) that understand file formats:

- **JSON**: deep-merge objects. New keys from upstream flow in; existing overrides preserved; same-key conflicts flagged explicitly.
- **YAML**: same as JSON.
- **Other files**: fall back to standard git merge.

This dramatically reduces false conflicts. When `main` adds a new feature flag, it merges cleanly alongside existing client overrides.

### CLI Commands

```bash
variantform create <client-name>     # Create variant branch
variantform edit <client> <file>     # Edit a variant's config
variantform sync                     # Rebase all variants onto latest main
variantform status                   # Show sync state of all variants
variantform diff <client>            # Show overrides vs main
```

The CLI orchestrates regular git commands. No new VCS. Developers can always fall back to raw git.

## Product Architecture

### Two Layers

**Layer 1: Open-Source CLI** (`variantform`)
- Git-native engine with format-aware merge drivers
- MIT or Apache 2.0 licensed
- Works with any git host (GitHub, GitLab, Bitbucket)

**Layer 2: Variantform Cloud** (commercial SaaS)
- GitHub/GitLab App + web dashboard
- Auto-triggers sync on push to main
- Visual variant status dashboard
- AI-assisted conflict resolution
- Drift metrics and trend graphs over time
- Team permissions (who can edit which variant)
- Structured audit trail

### Feature Split

| Feature | CLI (Free) | Cloud (Paid) |
|---------|-----------|-------------|
| Create/manage variant branches | Yes | Yes |
| Format-aware merge | Yes | Yes |
| Manual sync | Yes | Auto on push |
| Status overview | Terminal | Visual dashboard |
| Conflict resolution | Manual | AI-suggested |
| Drift detection | `diff` command | Alerts + metrics |
| Variant health history | No | Yes |
| Team permissions | No | Yes |
| Audit log | Git log | Structured trail |

## Business Model

**Target customer**: B2B SaaS companies (Series A+) with 5-20 enterprise clients demanding per-client customization.

**Go-to-market**: Open-source CLI drives adoption. Engineers discover it, try it, bring it to their team. Cloud upgrade for dashboard, AI merge, and audit trail.

**Pricing**: Per-variant per-month ($50-200/mo for a typical 10-variant setup).

**Timing thesis**: AI makes customization cheaper → vendors say "yes" more → variants proliferate → need infrastructure to manage them → Variantform.

## Competitive Positioning

- **vs. Feature flags** (LaunchDarkly): Complementary. Flags toggle features; Variantform manages entire config profiles per client, versioned and synced.
- **vs. Merge automation** (Mergify): General-purpose merge tools with no variant awareness.
- **vs. Dev platforms** (Backstage): Different problem (scaffolding new services vs. managing variants of one).
- **vs. Git workflow tools** (Graphite): No concept of client variants or customization surfaces.

## Risks

1. **Market timing** (medium): Thesis depends on AI accelerating customization demand. Mitigated by existing pain in B2B SaaS today.
2. **"Just use feature flags" objection** (high): Need clear content marketing showing the gap flags can't fill. Config drift, audit trails, sync management.
3. **Git branch scaling** (low for V1): Config-only branches are lightweight. Problem only at 100+ variants with code-level divergence.
4. **Platform risk** (medium): CLI is git-native (host-agnostic). Cloud should support GitHub + GitLab + Bitbucket from start.
5. **Adoption friction** (medium): Requires retrofitting repos with surface declarations. Mitigated by `variantform init` wizard.

## Growth Vectors

- AI-native conflict resolution as a differentiator
- Per-variant deployment management (variant → auto-deploy to environment)
- Variant template marketplace (e.g., "healthcare-compliant config overlay")
- Acquisition target for GitHub, GitLab, or LaunchDarkly

## Starting Scope (V1)

- Configuration-level customization only
- 5-20 client variants per vendor
- CLI tool with 5 core commands
- JSON and YAML format-aware merge drivers
- GitHub integration for Cloud layer
- SaaS vendor's internal team as primary user

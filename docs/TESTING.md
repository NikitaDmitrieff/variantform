# Variantform — End-to-End Testing Guide

## Prerequisites

- Node.js 18+
- npm or npx

## 1. Install

```bash
git clone https://github.com/NikitaDmitrieff/variantform.git
cd variantform
npm install
npm run build
```

## 2. Run the test suite

```bash
npm test
```

All 64 tests should pass across 12 test files covering merge logic, security, glob matching, and every CLI command.

## 3. Manual CLI walkthrough

Create a temporary project and test the full lifecycle:

```bash
# Set up a test project
mkdir /tmp/vf-test && cd /tmp/vf-test
mkdir -p config
echo '{"dark_mode":false,"max_users":100,"beta":["analytics"]}' > config/features.json
echo '{"primary":"#000","font":"inter"}' > config/theme.json

# Initialize variantform
npx /path/to/variantform/dist/cli.js init

# Edit .variantform.yaml to declare surfaces:
cat > .variantform.yaml << 'EOF'
surfaces:
  - path: "config/features.json"
    format: json
    strategy: merge
  - path: "config/theme.json"
    format: json
    strategy: merge
EOF

# Create a variant
npx /path/to/variantform/dist/cli.js create acme

# Add an override
mkdir -p variants/acme/config
echo '{"dark_mode":true,"max_users":500}' > variants/acme/config/features.json

# Resolve — should merge base + override
npx /path/to/variantform/dist/cli.js resolve acme

# Check status
npx /path/to/variantform/dist/cli.js status

# See what acme overrides
npx /path/to/variantform/dist/cli.js diff acme

# Validate all variants
npx /path/to/variantform/dist/cli.js validate

# Clean up
rm -rf /tmp/vf-test
```

## 4. Expected results

| Command    | What to check                                           |
|------------|---------------------------------------------------------|
| `init`     | Creates `.variantform.yaml` and `variants/` directory   |
| `create`   | Creates `variants/acme/` directory                      |
| `resolve`  | Outputs merged JSON: `dark_mode: true`, `max_users: 500`, `beta: ["analytics"]` |
| `status`   | Shows `acme` with 1 override, 0 undeclared              |
| `diff`     | Shows `dark_mode` and `max_users` as overridden keys    |
| `validate` | Reports 0 errors, 0 warnings                           |

## 5. Test the landing page locally

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

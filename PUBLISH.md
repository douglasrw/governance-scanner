# Publishing to npm

## Prerequisites

- Node.js >= 18
- npm account with publish access

## Steps

### 1. Authenticate

```bash
npm login
```

Enter your npm username, password, and OTP if 2FA is enabled.

### 2. Verify the package

```bash
npm pack --dry-run
```

Confirm the tarball contains only: dist/, README.md, LICENSE, package.json.

### 3. Publish

```bash
npm publish
```

### 4. Verify

```bash
npx governance-scanner --help
```

Should display the help text. First-time npx may take a few seconds to fetch.

### 5. Check npm registry

Visit: https://www.npmjs.com/package/governance-scanner

## Subsequent releases

1. Bump version: `npm version patch` (or `minor`/`major`)
2. Push the tag: `git push origin --tags`
3. The GitHub Action at `.github/workflows/publish.yml` will auto-publish on version tags.

Alternatively, publish manually: `npm publish`.

## Setting up automated publishing

Add your npm token as a GitHub repository secret:

1. Generate a token: https://www.npmjs.com/settings/~/tokens (Automation type)
2. Go to https://github.com/douglasrw/governance-scanner/settings/secrets/actions
3. Add secret: Name = `NPM_TOKEN`, Value = your token
4. Push a version tag: `git tag v1.0.1 && git push origin v1.0.1`

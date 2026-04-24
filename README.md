# Granular for VSCode

Snippets, inline lint diagnostics, and quick-create commands for `@granularjs/core` projects.

Diagnostics are powered by [`@granularjs/lint`](https://www.npmjs.com/package/@granularjs/lint) (or the umbrella [`@granularjs/cli`](https://www.npmjs.com/package/@granularjs/cli)). Install one of them in your project:

```bash
npm install --save-dev @granularjs/lint
# or
npm install --save-dev @granularjs/cli
```

## Features

- 11 snippets for common Granular patterns: `gsig`, `gstate`, `gderive`, `gafter`, `gcompute`, `gwhen`, `glist`, `gboot`, `gform`, `gcls`, `gdev`.
- Inline diagnostics from `granular-lint` on save.
- `Granular: Create New App` command (uses the local `granular create` / `create-granular-app` CLI).

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `granular.lint.enable` | `true` | Run the granular linter on save and report inline diagnostics. |
| `granular.lint.cliPath` | `""` | Optional path to the linter CLI. Falls back to `node_modules/.bin/granular-lint`, then `node_modules/.bin/granular`. |
| `granular.lint.runOn` | `"save"` | When to run the linter (`save` or `change`). |

## Build

```bash
npm install
npm run vsix              # compile + produce a .vsix (no token needed)
```

That writes a file named `granular-vscode-<version>.vsix` in the project root (version comes from `package.json`). Use it whenever the Marketplace web UI does not offer **Download Extension** (that link is easy to miss or absent depending on account and layout).

### Cursor, VSCodium, and other Open-VSX–based editors

[Cursor](https://cursor.com/docs/configuration/extensions) (and similar forks) use the [Open VSX](https://open-vsx.org/) registry for in-app search, not the Microsoft Visual Studio Marketplace. An extension published only on the Marketplace will not show up in the Cursor extensions search until it is also published to Open VSX (see below).

Until then, install from the local VSIX: **Command Palette** → **Extensions: Install from VSIX…** → pick the file produced by `npm run vsix`. Updates installed this way do not auto-update from a store until you publish to Open VSX or reinstall a newer VSIX.

## Publish to the Marketplace

1. Create a [Personal Access Token](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows) in Azure DevOps with **Marketplace → Manage** scope.
2. Copy `.env.example` to `.env` and set `VSCE_PAT=...` (`.env` is never committed).
3. The `publisher` field in `package.json` is **`zerobytes`** — it must match [your publisher on the Marketplace](https://marketplace.visualstudio.com/manage/publishers/zerobytes).
4. From a clean git tree:

```bash
./release.sh patch   # or minor | major
```

The script runs `npm ci`, compiles, bumps the version with `npm version`, then runs `vsce publish` using the token from `.env`.

You can also export the token only for one session: `export VSCE_PAT='...'` and run `./release.sh patch` without a `.env` file.

## Publish to Open VSX (optional, for Cursor search)

When you want the extension to appear in Cursor’s built-in search (and in VSCodium / other Open-VSX clients):

1. Create an account at [open-vsx.org](https://open-vsx.org/) (Eclipse Foundation) if you do not have one.
2. Create a **Personal Access Token** under [User settings → Access tokens](https://open-vsx.org/user-settings/tokens).
3. From this directory, after `npm run vsix` (or right after a successful `vsce publish` to Microsoft), run:

```bash
npx -y ovsx publish ./granular-vscode-$(node -p "require('./package.json').version").vsix -p YOUR_OPEN_VSX_TOKEN
```

Alternatively publish from source (same `publisher` / `name` as `package.json`):

```bash
npx -y ovsx publish -p YOUR_OPEN_VSX_TOKEN
```

Use the **same** `publisher` and extension `name` as on the Microsoft Marketplace so the extension id stays `zerobytes.granular-vscode` everywhere. You can wire Open VSX into CI or `release.sh` later if you want a single command for both registries.

## Develop

Open this folder in VSCode and press F5 to launch an Extension Development Host.

## Lint output format

The extension parses lines of the form:

```
<file>:<line>:<col> [rule-name] message
```

This matches the JSON output of `granular-lint --format=json <path>` (or `granular lint --format=json <path>`).

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
npm run compile           # tsc -p .
npx -y @vscode/vsce package   # produce a .vsix (no token needed)
```

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

## Develop

Open this folder in VSCode and press F5 to launch an Extension Development Host.

## Lint output format

The extension parses lines of the form:

```
<file>:<line>:<col> [rule-name] message
```

This matches the JSON output of `granular-lint --format=json <path>` (or `granular lint --format=json <path>`).

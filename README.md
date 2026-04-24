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
npx -y vsce package       # produce a .vsix
```

## Develop

Open this folder in VSCode and press F5 to launch an Extension Development Host.

## Lint output format

The extension parses lines of the form:

```
<file>:<line>:<col> [rule-name] message
```

This matches the JSON output of `granular-lint --format=json <path>` (or `granular lint --format=json <path>`).

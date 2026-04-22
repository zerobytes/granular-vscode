# Granular for VSCode

Snippets, inline lint diagnostics, and quick-create commands for `@granularjs/core` projects.

## Features

- 11 snippets for common Granular patterns: `gsig`, `gstate`, `gderive`, `gafter`, `gcompute`, `gwhen`, `glist`, `gboot`, `gform`, `gcls`, `gdev`.
- Inline diagnostics from `granular lint` on save.
- `Granular: Create New App` command (uses the local `granular create` CLI).

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `granular.lint.enable` | `true` | Run granular lint on save and report inline diagnostics. |
| `granular.lint.cliPath` | `""` | Optional path to the granular CLI. Falls back to local `node_modules/.bin/granular`. |
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

This matches the output of `granular lint <path>`.

import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const DIAGNOSTICS_SOURCE = 'granular';

interface LintFinding {
  rule: string;
  message: string;
  file: string;
  line: number;
  column: number;
  severity?: 'error' | 'warning' | 'info';
}

function resolveLintCliPath(workspaceFolder: vscode.WorkspaceFolder | undefined): string | null {
  const cfg = vscode.workspace.getConfiguration('granular');
  const explicit = cfg.get<string>('lint.cliPath');
  if (explicit && fs.existsSync(explicit)) return explicit;
  if (!workspaceFolder) return null;
  const candidates = [
    path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'granular-lint'),
    path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'granular'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveGranularCliPath(workspaceFolder: vscode.WorkspaceFolder | undefined): string | null {
  if (!workspaceFolder) return null;
  const candidates = [
    path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'granular'),
    path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'create-granular-app'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseFindings(stdout: string, workspaceRoot: string): LintFinding[] {
  let parsed: Array<{ filePath: string; messages: Array<{ ruleId: string; message: string; line: number; column: number; severity: 'error' | 'warning' | 'info' }> }>;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return [];
  }
  const findings: LintFinding[] = [];
  for (const fileResult of parsed) {
    if (!fileResult || !Array.isArray(fileResult.messages)) continue;
    const filePath = path.isAbsolute(fileResult.filePath)
      ? fileResult.filePath
      : path.resolve(workspaceRoot, fileResult.filePath);
    for (const m of fileResult.messages) {
      findings.push({
        rule: m.ruleId,
        message: m.message,
        file: filePath,
        line: Math.max(0, (m.line ?? 1) - 1),
        column: Math.max(0, (m.column ?? 1) - 1),
        severity: m.severity ?? 'warning',
      });
    }
  }
  return findings;
}

function runCli(cliPath: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function buildLintArgs(cliPath: string, target: string): string[] {
  const base = path.basename(cliPath).toLowerCase();
  const isUmbrella = base === 'granular' || base === 'granular.cmd';
  return isUmbrella
    ? ['lint', '--format', 'json', '--no-color', target]
    : ['--format', 'json', '--no-color', target];
}

function severityToVscode(s: 'error' | 'warning' | 'info' | undefined): vscode.DiagnosticSeverity {
  if (s === 'error') return vscode.DiagnosticSeverity.Error;
  if (s === 'info') return vscode.DiagnosticSeverity.Information;
  return vscode.DiagnosticSeverity.Warning;
}

async function lintTarget(diagnostics: vscode.DiagnosticCollection, target: string, workspace: vscode.WorkspaceFolder) {
  const cli = resolveLintCliPath(workspace);
  if (!cli) return;
  const result = await runCli(cli, buildLintArgs(cli, target), workspace.uri.fsPath);
  const findings = parseFindings(result.stdout, workspace.uri.fsPath);
  const byFile = new Map<string, vscode.Diagnostic[]>();
  for (const f of findings) {
    const range = new vscode.Range(f.line, f.column, f.line, f.column + 1);
    const diag = new vscode.Diagnostic(range, `[${f.rule}] ${f.message}`, severityToVscode(f.severity));
    diag.source = DIAGNOSTICS_SOURCE;
    diag.code = f.rule;
    const list = byFile.get(f.file) ?? [];
    list.push(diag);
    byFile.set(f.file, list);
  }
  diagnostics.clear();
  for (const [file, diags] of byFile) {
    diagnostics.set(vscode.Uri.file(file), diags);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTICS_SOURCE);
  context.subscriptions.push(diagnostics);

  const lintActiveDocument = async () => {
    const doc = vscode.window.activeTextEditor?.document;
    if (!doc) return;
    const ws = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!ws) return;
    if (!vscode.workspace.getConfiguration('granular').get<boolean>('lint.enable')) return;
    await lintTarget(diagnostics, doc.uri.fsPath, ws);
  };

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const cfg = vscode.workspace.getConfiguration('granular');
      if (!cfg.get<boolean>('lint.enable')) return;
      if (cfg.get<string>('lint.runOn') !== 'save') return;
      const ws = vscode.workspace.getWorkspaceFolder(doc.uri);
      if (!ws) return;
      await lintTarget(diagnostics, doc.uri.fsPath, ws);
    }),
    vscode.workspace.onDidChangeTextDocument(async (e) => {
      const cfg = vscode.workspace.getConfiguration('granular');
      if (!cfg.get<boolean>('lint.enable')) return;
      if (cfg.get<string>('lint.runOn') !== 'change') return;
      const ws = vscode.workspace.getWorkspaceFolder(e.document.uri);
      if (!ws) return;
      await lintTarget(diagnostics, e.document.uri.fsPath, ws);
    }),
    vscode.commands.registerCommand('granular.lint.runActive', lintActiveDocument),
    vscode.commands.registerCommand('granular.lint.runWorkspace', async () => {
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      await lintTarget(diagnostics, ws.uri.fsPath, ws);
    }),
    vscode.commands.registerCommand('granular.create', async () => {
      const name = await vscode.window.showInputBox({ prompt: 'Granular app name' });
      if (!name) return;
      const variant = await vscode.window.showQuickPick(['default', 'jsx', 'ssr'], { placeHolder: 'Template' });
      if (!variant) return;
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      const cli = resolveGranularCliPath(ws);
      const term = vscode.window.createTerminal({ name: 'Granular Create', cwd: ws.uri.fsPath });
      term.show();
      const flag = variant === 'default' ? '' : ` --${variant}`;
      if (cli && path.basename(cli).toLowerCase().startsWith('granular')) {
        term.sendText(`node "${cli}" create ${name}${flag}`);
      } else if (cli) {
        term.sendText(`node "${cli}" ${name}${flag}`);
      } else {
        term.sendText(`npx -y @granularjs/cli create ${name}${flag}`);
      }
    }),
  );
}

export function deactivate() {}

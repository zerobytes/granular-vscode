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

const LINE_REGEX = /^\s*([^\s].+?):(\d+):(\d+)\s+(\[[^\]]+\])\s+(.+)$/;

function resolveCliPath(workspaceFolder: vscode.WorkspaceFolder | undefined): string | null {
  const cfg = vscode.workspace.getConfiguration('granular');
  const explicit = cfg.get<string>('lint.cliPath');
  if (explicit && fs.existsSync(explicit)) return explicit;
  if (!workspaceFolder) return null;
  const local = path.join(workspaceFolder.uri.fsPath, 'node_modules', '.bin', 'granular');
  if (fs.existsSync(local)) return local;
  return null;
}

function parseFindings(stdout: string): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(LINE_REGEX);
    if (!m) continue;
    const [, file, ln, col, ruleTag, message] = m;
    findings.push({
      rule: ruleTag.replace(/[[\]]/g, ''),
      message: message.trim(),
      file,
      line: Math.max(0, parseInt(ln, 10) - 1),
      column: Math.max(0, parseInt(col, 10) - 1),
      severity: 'warning',
    });
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

async function lintTarget(diagnostics: vscode.DiagnosticCollection, target: string, workspace: vscode.WorkspaceFolder) {
  const cli = resolveCliPath(workspace);
  if (!cli) return;
  const result = await runCli(cli, ['lint', target], workspace.uri.fsPath);
  const findings = parseFindings(result.stdout);
  const byFile = new Map<string, vscode.Diagnostic[]>();
  for (const f of findings) {
    const range = new vscode.Range(f.line, f.column, f.line, f.column + 1);
    const diag = new vscode.Diagnostic(range, `[${f.rule}] ${f.message}`, vscode.DiagnosticSeverity.Warning);
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
      const tmpl = await vscode.window.showQuickPick(['basic', 'router', 'ssr', 'ui'], { placeHolder: 'Template' });
      if (!tmpl) return;
      const ws = vscode.workspace.workspaceFolders?.[0];
      if (!ws) return;
      const cli = resolveCliPath(ws);
      if (!cli) {
        vscode.window.showErrorMessage('granular CLI not found. Install @granularjs/core in this workspace.');
        return;
      }
      const term = vscode.window.createTerminal({ name: 'Granular Create', cwd: ws.uri.fsPath });
      term.show();
      term.sendText(`node "${cli}" create ${name} --template ${tmpl}`);
    }),
  );
}

export function deactivate() {}

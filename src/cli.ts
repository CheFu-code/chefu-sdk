#!/usr/bin/env node
import { ChefuClient } from './client.js';

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const colors = {
  reset: '\u001B[0m',
  bold: '\u001B[1m',
  dim: '\u001B[2m',
  cyan: '\u001B[36m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  red: '\u001B[31m',
  magenta: '\u001B[35m',
  blue: '\u001B[34m',
};

const style = (code: string, text: string) => (useColor ? `${code}${text}${colors.reset}` : text);
const printInfo = (msg: string) => console.log(style(colors.cyan, '›') + ' ' + style(colors.bold, msg));
const printSuccess = (msg: string) => console.log(style(colors.green, '✓') + ' ' + style(colors.bold, msg));
const printWarn = (msg: string) => console.log(style(colors.yellow, '⚠') + ' ' + style(colors.bold, msg));
const printError = (msg: string) => console.error(style(colors.red, '✖') + ' ' + style(colors.bold, msg));

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .split('\n')
    .map((line) => style(colors.dim, line))
    .join('\n');
}

function printJson(value: unknown): void {
  console.log(prettyJson(value));
}

function renderBox(title: string, lines: string[]): void {
  const content = lines.map((line) => line.replace(/\t/g, '    '));
  const width = Math.max(title.length + 2, ...content.map((line) => line.length), 32) + 2;
  const top = `┌${'─'.repeat(width - 2)}┐`;
  const middle = `│ ${title.padEnd(width - 4, ' ')} │`;
  const separator = `├${'─'.repeat(width - 2)}┤`;
  const bottom = `└${'─'.repeat(width - 2)}┘`;

  console.log(top);
  console.log(style(colors.magenta, middle));
  console.log(separator);
  for (const line of content) {
    const padded = line.padEnd(width - 4, ' ');
    console.log(`│ ${padded} │`);
  }
  console.log(bottom);
}

function renderExamples(): void {
  const examples = [
    'chefu login --email user@chefu.co.za --password secret',
    'chefu whoami',
    'chefu apps list',
    'chefu apps register --appId flow --name "My App" --owner user@chefu.co.za --type confidential',
    'chefu apps approve --client-id CLIENT_ID --approved-by admin@chefu.co.za',
    'chefu apps rotate-secret --client-id CLIENT_ID',
    'chefu logout',
  ];

  renderBox('Examples', examples.map((example) => style(colors.blue, example)));
}

function normalizeAppRows(input: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(input)) return input.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') as Record<string, unknown>[];
  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const candidates = ['apps', 'items', 'data', 'results'];
    for (const key of candidates) {
      const value = obj[key];
      if (Array.isArray(value)) {
        return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') as Record<string, unknown>[];
      }
    }
  }
  return [];
}

function renderAppTable(input: unknown): void {
  const rows = normalizeAppRows(input);
  if (!rows.length) {
    printWarn('No apps found.');
    return;
  }

  const data = rows.map((app) => {
    const object = app as Record<string, unknown>;
    const appId = String(object.appId ?? object.client_id ?? object.clientId ?? object.id ?? '—');
    const name = String(object.name ?? '—');
    const type = String(object.clientType ?? object.type ?? object.kind ?? '—');
    const status = String(object.status ?? 'pending');
    return [appId, name, type, status] as const;
  });

  const headers = ['APP ID', 'NAME', 'TYPE', 'STATUS'];
  const columns = headers.map((_, index) => [headers[index], ...data.map((row) => row[index])]);
  const widths = columns.map((column) => Math.max(...column.map((cell) => String(cell).length)));
  const horizontal = widths.map((width) => '─'.repeat(width + 2)).join('─┼─');
  const formatRow = (row: string[]) => `│ ${row.map((cell, i) => String(cell).padEnd(widths[i], ' ')).join(' │ ')} │`;

  console.log(`┌─${horizontal}─┐`);
  console.log(formatRow(headers));
  console.log(`├─${horizontal}─┤`);
  for (const row of data) {
    console.log(formatRow(row.map((cell) => String(cell))));
  }
  console.log(`└─${horizontal}─┘`);
}

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json') || args.includes('-j');
const filteredArgs = args.filter((arg: string) => arg !== '--json' && arg !== '-j');

const usage = `
${style(colors.magenta, 'Chefu SDK CLI')}

${style(colors.dim, 'Usage:')}
  ${style(colors.blue, 'chefu login')} --email user@chefu.co.za --password secret
  ${style(colors.blue, 'chefu whoami')}
  ${style(colors.blue, 'chefu apps list')}
  ${style(colors.blue, 'chefu apps register')} --appId flow --name "My App" --owner user@chefu.co.za --type confidential --redirect-uri "https://app.example.com/callback" --scope "openid,profile,email"
  ${style(colors.blue, 'chefu apps approve')} --client-id CLIENT_ID --approved-by admin@chefu.co.za
  ${style(colors.blue, 'chefu apps rotate-secret')} --client-id CLIENT_ID
  ${style(colors.blue, 'chefu logout')}

${style(colors.dim, 'Flags:')}
  --json, -j  ${style(colors.dim, 'Output raw JSON')}
`;

function parseFlags(raw: string[]) {
    const result: Record<string, string | boolean> = {};
    for (let index = 0; index < raw.length; index += 1) {
        const token = raw[index];
        if (!token.startsWith('--') && !token.startsWith('-')) {
            continue;
        }

        const key = token.replace(/^--?/, '');
        const next = raw[index + 1];
        if (next && !next.startsWith('-')) {
            result[key] = next;
            index += 1;
        } else {
            result[key] = true;
        }
    }
    return result;
}

function asCommandArgs(raw: string[]) {
    const result: string[] = [];
    for (let i = 0; i < raw.length; i += 1) {
        const token = raw[i];
        if (token === '--json' || token === '-j') continue;
        result.push(token);
    }
    return result;
}

async function main() {
    const commandArgs = asCommandArgs(filteredArgs);
    const flags = parseFlags(commandArgs);
    const command = commandArgs[0];
    const baseURL = process.env.CHEFU_API_BASE_URL || 'https://api.chefu.co.za';

    const requiresAuth = ['whoami', 'logout', 'apps'];
    if (!command || command === 'help' || command === '--help' || command === '-h') {
        renderBox('Chefu SDK CLI', [
            '',
            'Usage:',
            '  chefu login --email user@chefu.co.za --password secret',
            '  chefu whoami',
            '  chefu apps list',
            '  chefu apps register --appId flow --name "My App" --owner user@chefu.co.za --type confidential --redirect-uri "https://app.example.com/callback" --scope "openid,profile,email"',
            '  chefu apps approve --client-id CLIENT_ID --approved-by admin@chefu.co.za',
            '  chefu apps rotate-secret --client-id CLIENT_ID',
            '  chefu logout',
            '',
            'Flags:',
            '  --json, -j  Output raw JSON',
        ]);
        renderExamples();
        return;
    }

    const client = new ChefuClient({ baseURL });

    if (requiresAuth.includes(command) && !process.env.CHEFU_TOKEN) {
        const storedToken = process.env.CHEFU_TOKEN || '';
        if (!storedToken) {
            renderBox('Not authenticated', [
                style(colors.yellow, 'No active session found.'),
                '',
                style(colors.blue, 'Run: chefu login --email <email> --password <password>'),
                style(colors.dim, 'or set CHEFU_API_BASE_URL for a different environment.'),
            ]);
            process.exitCode = 1;
            return;
        }
    }

    try {
        if (command === 'login') {
            const email = String(flags['email'] || '');
            const password = String(flags['password'] || '');
            if (!email || !password) throw new Error('Missing email or password.');

            const result = await client.login({ email, password });
            if (jsonFlag) {
                printJson({ ok: true, ...result });
            } else {
                printSuccess('Logged in successfully.');
                printInfo(`User: ${email}`);
            }
            return;
        }

        if (command === 'logout') {
            const result = await client.logout();
            if (jsonFlag) {
                printJson(result);
            } else {
                printSuccess('Logged out.');
            }
            return;
        }

        if (command === 'whoami') {
            const result = await client.whoami();
            if (jsonFlag) {
                printJson(result);
            } else {
                printJson(result);
            }
            return;
        }

        if (command === 'apps') {
            const action = commandArgs[1];
            if (action === 'list') {
                const result = await client.apps.list();
                if (jsonFlag) {
                    printJson(result);
                } else {
                    renderBox('Apps', [
                        style(colors.cyan, 'Fetched app registry'),
                    ]);
                    renderAppTable(result);
                }
                return;
            }

            if (action === 'register') {
                const payload = {
                    appId: String(flags['appId'] || ''),
                    name: String(flags['name'] || ''),
                    owner: String(flags['owner'] || ''),
                    redirectUris: String(flags['redirect-uri'] || flags['redirectUri'] || '')
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean),
                    allowedScopes: String(flags['scope'] || '')
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean),
                    grantTypes: String(flags['grant-type'] || '')
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean),
                    clientType: (String(flags['type'] || 'public') === 'confidential' ? 'confidential' : 'public') as 'confidential' | 'public',
                    status: String(flags['status'] || 'pending') as 'pending' | 'approved' | 'revoked',
                };

                const result = await client.apps.register(payload);
                if (jsonFlag) {
                    printJson(result);
                } else {
                    printSuccess('App registered.');
                    renderBox('Registration response', [prettyJson(result)]);
                }
                return;
            }

            if (action === 'approve') {
                const clientId = String(flags['client-id'] || flags['clientId'] || '');
                const approvedBy = String(flags['approved-by'] || flags['approvedBy'] || 'admin@chefu.co.za');
                const result = await client.apps.approve(clientId, approvedBy);
                if (jsonFlag) {
                    printJson(result);
                } else {
                    printSuccess('App approved.');
                    renderBox('Approval response', [prettyJson(result)]);
                }
                return;
            }

            if (action === 'rotate-secret') {
                const clientId = String(flags['client-id'] || flags['clientId'] || '');
                const result = await client.apps.rotateSecret(clientId);
                if (jsonFlag) {
                    printJson(result);
                } else {
                    printSuccess('Secret rotated.');
                    renderBox('Rotation response', [prettyJson(result)]);
                }
                return;
            }
        }

        console.log(usage.trim());
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (jsonFlag) {
            printJson({ ok: false, error: message });
        } else {
            printError(message);
        }
        process.exitCode = 1;
    }
}

main();

#!/usr/bin/env node
import { ChefuClient } from './client.js';

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json') || args.includes('-j');
const filteredArgs = args.filter((arg: string) => arg !== '--json' && arg !== '-j');

const usage = `
Chefu SDK CLI

Usage:
  chefu login --email user@chefu.co.za --password secret
  chefu whoami
  chefu apps list
  chefu apps register --appId flow --name "My App" --owner user@chefu.co.za --type confidential --redirect-uri "https://app.example.com/callback" --scope "openid,profile,email"
  chefu apps approve --client-id CLIENT_ID --approved-by admin@chefu.co.za
  chefu apps rotate-secret --client-id CLIENT_ID
  chefu logout

Flags:
  --json, -j  Output raw JSON
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
  const baseURL = process.env.CHEFU_API_BASE_URL || 'http://localhost:3000';

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(usage.trim());
    return;
  }

  const client = new ChefuClient({ baseURL });

  try {
    if (command === 'login') {
      const email = String(flags['email'] || '');
      const password = String(flags['password'] || '');
      if (!email || !password) throw new Error('Missing email or password.');

      const result = await client.login({ email, password });
      if (jsonFlag) {
        console.log(JSON.stringify({ ok: true, ...result }, null, 2));
      } else {
        console.log('✓ Logged in successfully.');
        console.log(`User: ${email}`);
      }
      return;
    }

    if (command === 'logout') {
      const result = await client.logout();
      if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('✓ Logged out.');
      }
      return;
    }

    if (command === 'whoami') {
      const result = await client.whoami();
      if (jsonFlag) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      return;
    }

    if (command === 'apps') {
      const action = commandArgs[1];
      if (action === 'list') {
        const result = await client.apps.list();
        console.log(JSON.stringify(result, null, 2));
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
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (action === 'approve') {
        const clientId = String(flags['client-id'] || flags['clientId'] || '');
        const approvedBy = String(flags['approved-by'] || flags['approvedBy'] || 'admin@chefu.co.za');
        const result = await client.apps.approve(clientId, approvedBy);
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (action === 'rotate-secret') {
        const clientId = String(flags['client-id'] || flags['clientId'] || '');
        const result = await client.apps.rotateSecret(clientId);
        console.log(JSON.stringify(result, null, 2));
        return;
      }
    }

    console.log(usage.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonFlag) {
      console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    } else {
      console.error(`✖ ${message}`);
    }
    process.exitCode = 1;
  }
}

main();

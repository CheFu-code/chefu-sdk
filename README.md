# @chefu/sdk

Official SDK for Chefu authentication and app management.

## Install

```bash
npm i @chefu-code/sdk
```

## Usage

```ts
import { ChefuClient } from '@chefu-code/sdk';

const client = new ChefuClient({
  baseURL: 'https://api.chefu.co.za',
});

const login = await client.login({
  email: 'admin@chefu.co.za',
  password: 'secret',
});

console.log(login.token);

const me = await client.whoami();
console.log(me);
```

## CLI

```bash
npx chefu login --email admin@chefu.co.za --password secret
npx chefu whoami
npx chefu apps list
```

## Environment

```bash
export CHEFU_API_BASE_URL=https://api.chefu.co.za
```

![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) plugin

# @seneca/azure-env

[![npm version](https://img.shields.io/npm/v/@seneca/azure-env.svg)](https://npmjs.com/package/@seneca/azure-env)
[![build](https://github.com/senecajs/seneca-azure-env/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-azure-env/actions/workflows/build.yml)

Add the secrets of an [Azure Key
Vault](https://learn.microsoft.com/azure/key-vault/) to the variables
of [@seneca/env](https://github.com/senecajs/seneca-env). When
`@seneca/env` starts, this plugin reads every secret of the vault and
adds it, by name, to `seneca.context.SenecaEnv.var`. It works with
Seneca 4. Seneca 3 users stay on `@seneca/azure-env@0.0.3`.

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

## Install

```sh
npm install seneca@^4 @seneca/env @seneca/azure-env
```

The plugin needs Seneca 4 and `@seneca/env` 0.6 (peer dependencies
`seneca` `^4.0.0` and `@seneca/env` `^0.6.0`) and Node.js 24 or later.
It depends on `@azure/identity` and `@azure/keyvault-secrets`.

## Quick Example

```js
const Seneca = require('seneca')

const seneca = Seneca()
  .use('@seneca/azure-env', {
    keyVault: { url: 'https://my-vault.vault.azure.net/' },
  })
  .use('@seneca/env', {
    var: { SHOP_NAME: String },
  })

seneca.ready(function () {
  const env = this.context.SenecaEnv.var
  // Every secret of the vault is a variable, for example:
  console.log(env['shop-api-key'])
})
```

Load this plugin before `@seneca/env`. The vault is read once, when
`@seneca/env` starts. A secret has the same name as the variable it
becomes; a secret replaces a variable of the same name from a file or
from `process.env`.

## Credentials

The plugin signs in with `DefaultAzureCredential` from
`@azure/identity`, which tries a chain of credentials, such as
environment variables, a managed identity and a signed in Azure CLI.
The identity needs permission to list and read the secrets of the
vault.
See the
[`DefaultAzureCredential` documentation](https://learn.microsoft.com/javascript/api/@azure/identity/defaultazurecredential).

If the vault cannot be read, for example because no credential is
available or access is denied, the `sys:env,hook:vars` message fails
with an error that names the vault, and Seneca does not start.

## API

### Options

| Option | Default | Description |
| --- | --- | --- |
| `keyVault.url` | `""` | The URL of the Key Vault, for example `https://my-vault.vault.azure.net/`. |

### Messages

| Pattern | Description |
| --- | --- |
| `sys:env,hook:vars` | Sent by `@seneca/env` at startup. Replies with the variables of the earlier actions for this pattern, if any, and every secret of the vault. |

### Exports

| Export | Description |
| --- | --- |
| `azure/getSecrets` | `async function getSecrets()`: reads every secret of the vault and returns an object of secret name to value. Rejects if the vault cannot be read. |

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open
participation. Node.js 24 or later:

```sh
npm install
npm run build
npm test
```

The tests replace the Key Vault calls of the `SecretClient`, so they
need no Azure account. Reading a real Key Vault is not tested.

## Background

Created in 2025 for Seneca services that run on Azure. The change log
is in [CHANGES.md](CHANGES.md).

Licensed under [MIT](LICENSE).

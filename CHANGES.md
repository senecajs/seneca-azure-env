# Changes

## 0.1.0 2026-11-21

First entry of this change log. Earlier versions are on npm and in the
git history.

* Seneca 4: the peer dependency is `seneca` `^4.0.0` (was
  `>=3||>=4.0.0-rc2`). Seneca 3 users stay on `@seneca/azure-env@0.0.3`.
* The peer dependency on `@seneca/env` is `^0.6.0`, its Seneca 4
  release (was `>=0.5`).
* The peer dependency on `seneca-promisify` is removed: Seneca 4 has
  promises built in.
* Node.js 24 or later (`engines.node` `>=24`, was `>=14`).
* Fix: `@azure/identity` and `@azure/keyvault-secrets` are runtime
  dependencies. They were development dependencies only, so the
  published 0.0.3 failed to load with `Cannot find module
  '@azure/identity'`.
* Breaking: when the secrets cannot be read from the Key Vault, the
  plugin reports the error. It no longer replies with the made up
  secrets `azurekey1` and `azurekey2`. When the secrets are loaded for
  `@seneca/env`, the failure stops Seneca from starting.
* The `azure/getSecrets` export rejects with that error, too.
* Removed the files left over from the `seneca-gateway` template
  (`dist/gateway.*`, `test/gateway.messages.ts`) and the unused
  `seneca-msg-test` and `@seneca/maintain` development dependencies.
* Tests: the Key Vault calls are replaced in the tests, which need no
  Azure account; `@seneca/env` is loaded by its full name and
  `use('promisify')` is removed (D4). Live Key Vault access was not
  tested on Seneca 4. Tested with Seneca 4.0.0 and `@seneca/env` 0.6.0
  on Node.js 26.
* `package.json`: `repository.url` in the `git+https` form,
  `publishConfig.access` `public`, a description of this plugin,
  `README.md` and `CHANGES.md` in `files`. The README replaces the
  `seneca-gateway` template text.

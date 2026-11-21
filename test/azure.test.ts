import AzureEnv, { AzureKeyVaultOptions } from '../src/azure'

import { SecretClient } from '@azure/keyvault-secrets'

const Seneca = require('seneca')

// These tests need no Azure account. The Key Vault calls of the
// SecretClient are replaced, so no credential is requested and no
// request is sent. Reading a real Key Vault is not tested.

const azureVaultOptions: AzureKeyVaultOptions = {
  url: 'https://test-keyvault.vault.azure.net/',
}

const vault: Record<string, string> = {
  azurekey1: 'value1',
  azurekey2: 'value2',
}

function stubVault(failure?: Error) {
  jest
    .spyOn(SecretClient.prototype, 'listPropertiesOfSecrets')
    .mockImplementation(function() {
      return (async function* () {
        if (failure) {
          throw failure
        }
        for (const name of Object.keys(vault)) {
          yield { name }
        }
      })()
    })

  jest
    .spyOn(SecretClient.prototype, 'getSecret')
    .mockImplementation(async function(name: string) {
      return { name, value: vault[name], properties: { name } }
    })
}

describe('azure-env', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use(AzureEnv)
    await seneca.ready()
    expect(typeof seneca.export('azure/getSecrets')).toEqual('function')
    await seneca.close()
  })

  test('fetch-azure-keys', async () => {
    stubVault()

    const seneca = Seneca({ legacy: false })
      .test()
      .use(AzureEnv, {
        keyVault: azureVaultOptions,
      })
      .use('@seneca/env', {
        // debug: true,
        file: [__dirname + '/local-env.js;?'],
        var: {
          BAR: 'red',
        }
      })

    await seneca.ready()

    const finalEnvVars = seneca.context.SenecaEnv.var
    // console.log('finalEnvVars', finalEnvVars)

    expect(finalEnvVars.azurekey1).toEqual('value1')
    expect(finalEnvVars.azurekey2).toEqual('value2')
    expect(finalEnvVars.BAR).toEqual('red')

    let injectVars = seneca.export('env/injectVars')
    expect(injectVars('$azurekey1')).toEqual('value1')
    expect(injectVars('$azurekey2')).toEqual('value2')
    expect(injectVars('$BAR')).toEqual('red')

    await seneca.close()
  })

  test('hook-vars-keeps-prior-vars', async () => {
    stubVault()

    const seneca = Seneca({ legacy: false }).test()
    seneca.message('sys:env,hook:vars', async function(this: any) {
      return { FOO: 'green', azurekey1: 'old' }
    })
    seneca.use(AzureEnv, { keyVault: azureVaultOptions })
    await seneca.ready()

    const vars = await seneca.post('sys:env,hook:vars')
    expect(vars).toEqual({
      FOO: 'green',
      azurekey1: 'value1',
      azurekey2: 'value2',
    })

    await seneca.close()
  })

  test('key-vault-error', async () => {
    stubVault(new Error('no access'))

    const seneca = Seneca({ legacy: false })
      .test()
      .quiet()
      .use(AzureEnv, { keyVault: azureVaultOptions })
    await seneca.ready()

    // No made up values: the failure is reported.
    const getSecrets = seneca.export('azure/getSecrets')
    await expect(getSecrets()).rejects.toThrow(
      '@seneca/azure-env: cannot read the secrets of the Key Vault ' +
      'https://test-keyvault.vault.azure.net/: no access'
    )

    await expect(seneca.post('sys:env,hook:vars')).rejects.toThrow(
      'no access'
    )

    await seneca.close()
  })
})

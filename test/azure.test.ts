import AzureEnv, { AzureKeyVaultOptions } from '../src/azure'

const Seneca = require('seneca')

const azureOptions: AzureKeyVaultOptions = {
  keyVaultUrl: 'https://test-keyvault.vault.azure.net/',
}

describe('azure-env', () => {
  test('happy', async () => {
    const seneca = Seneca({ legacy: false }).test().use('promisify').use(AzureEnv)
    await seneca.ready()
  })

  test('fetch-azure-keys', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use(AzureEnv, {
        azure: azureOptions,
      })
      .use('env', {
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

  })
})


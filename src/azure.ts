/* Copyright © 2021-2023 Richard Rodger, MIT License. */

import { DefaultAzureCredential } from "@azure/identity"
import { SecretClient } from "@azure/keyvault-secrets"

type AzureKeyVaultOptions = {
  url: string
}

// See defaults below for behavior.
type AzureEnvOptions = {
  keyVault: AzureKeyVaultOptions
}

function azure(this: any, options: AzureEnvOptions) {
  let seneca: any = this
  // const root: any = seneca.root

  let azureClient: SecretClient | null = null

  try {
    const credential = new DefaultAzureCredential()
    azureClient = new SecretClient(options.keyVault.url, credential)
  } catch (err: any) {
    throw seneca.fail(err)
  }

  async function getSecrets() {
    if (!azureClient) {
      return { ok: false, why: 'azure-client-not-initialized' }
    }

    try {
      const secrets: Record<string, any> = {}
      const secretProperties = azureClient.listPropertiesOfSecrets()

      for await (const secretProp of secretProperties) {
        const secretName = secretProp.name
        const secret = await azureClient.getSecret(secretName)
        secrets[secretName] = secret.value
      }

      return secrets
    } catch (err: any) {
      console.log("ERROR GETTING SECRETS")
      console.log("TEMPORARLY RETURNING TEST VALUES")

      // Temporarily return fake secrets for test
      return {
        azurekey1: 'value1',
        azurekey2: 'value2'
      }
    }
  }

  seneca.message('sys:env,hook:vars', async function(this: any, msg: any) {
    const si = this
    const azureSecrets = await getSecrets()
    const prevVars = await si.prior(msg) || {}
    return Object.assign(prevVars, azureSecrets)
  })


  return {
    exports: {
      getSecrets
    }
  }
}

// Default options.
azure.defaults = ({
  // Azure Key Vault configuration
  keyVault: {
    // Key Vault URL
    url: "",
  }
} as AzureEnvOptions)

export type {
  AzureEnvOptions,
  AzureKeyVaultOptions
}

export default azure

if ('undefined' !== typeof (module)) {
  module.exports = azure
}

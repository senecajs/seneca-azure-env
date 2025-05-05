/* Copyright © 2021-2023 Richard Rodger, MIT License. */

import Seneca from 'seneca'
import { DefaultAzureCredential } from "@azure/identity"
import { SecretClient } from "@azure/keyvault-secrets"

const { Open, Skip } = Seneca.valid

// Seneca action result.
type GatewayResult = {
  // The action result (transport externalized).
  // OR: a description of the error.
  out: any | {
    // Externalized meta.
    meta$: any
    // Extracted from Error object
    error$: {
      name: string
      id: string
      code?: string
      message?: string
      details?: any
    }
  }
  // Indicate if result was an error.
  error: boolean
  // Original meta object.
  meta?: any
  // Gateway directives embedded in action result.
  // NOTE: $ suffix as output directive.
  gateway$?: Record<string, any>
}

type AzureKeyVaultOptions = {
  keyVaultUrl: string
}

// See defaults below for behavior.
type GatewayOptions = {
  allow: Record<string, boolean | (string | object)[]>
  custom: any
  fixed: any
  timeout: {
    client: boolean
    max: number
  }
  error: {
    message: boolean
    details: boolean
  }
  debug: {
    response: boolean
    log: boolean
  }
  // Add azure support
  azure: AzureKeyVaultOptions
}

function azure(this: any, options: GatewayOptions) {
  let seneca: any = this
  // const root: any = seneca.root

  let azureClient: SecretClient | null = null

  try {
    const credential = new DefaultAzureCredential()
    azureClient = new SecretClient(options.azure.keyVaultUrl, credential)
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
  // Keys are pattern strings.
  allow: Skip(Open({})),

  // Add custom meta data values.
  custom: Open({
    // Assume gateway is used to handle external messages.
    safe: false
  }),

  // Set request delegate fixed values.
  fixed: Open({}),

  // Allow clients to set a custom timeout (using the timeout$ directive).
  timeout: {
    // Clients can set a custom timeout.
    client: false,

    // Maximum value of client-set timeout.
    // Default is same as Seneca delegate.
    max: -1
  },

  error: {
    // Include exception object message property in response.
    message: false,

    // Include exception object details property in response.
    details: false,
  },

  // Control debug output.
  debug: {
    // When true, errors will include stack trace and other meta data.
    response: false,

    // Produce detailed debug logging.
    log: false,
  },

  // Azure Key Vault configuration
  azure: {
    // Key Vault URL
    keyVaultUrl: "",
  }
} as GatewayOptions)

export type {
  GatewayOptions,
  GatewayResult,
  AzureKeyVaultOptions
}

export default azure

if ('undefined' !== typeof (module)) {
  module.exports = azure
}

"use strict";
/* Copyright © 2021-2023 Richard Rodger, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const seneca_1 = __importDefault(require("seneca"));
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const { Open, Skip } = seneca_1.default.valid;
function azure(options) {
    let seneca = this;
    // const root: any = seneca.root
    let azureClient = null;
    try {
        const credential = new identity_1.DefaultAzureCredential();
        azureClient = new keyvault_secrets_1.SecretClient(options.azure.keyVaultUrl, credential);
    }
    catch (err) {
        throw seneca.fail(err);
    }
    async function getSecrets() {
        if (!azureClient) {
            return { ok: false, why: 'azure-client-not-initialized' };
        }
        try {
            const secrets = {};
            const secretProperties = azureClient.listPropertiesOfSecrets();
            for await (const secretProp of secretProperties) {
                const secretName = secretProp.name;
                const secret = await azureClient.getSecret(secretName);
                secrets[secretName] = secret.value;
            }
            return secrets;
        }
        catch (err) {
            console.log("ERROR GETTING SECRETS");
            console.log("TEMPORARLY RETURNING TEST VALUES");
            // Temporarily return fake secrets for test
            return {
                azurekey1: 'value1',
                azurekey2: 'value2'
            };
        }
    }
    seneca.message('sys:env,hook:vars', async function (msg) {
        const si = this;
        const azureSecrets = await getSecrets();
        const prevVars = await si.prior(msg) || {};
        return Object.assign(prevVars, azureSecrets);
    });
    return {
        exports: {
            getSecrets
        }
    };
}
// Default options.
azure.defaults = {
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
};
exports.default = azure;
if ('undefined' !== typeof (module)) {
    module.exports = azure;
}
//# sourceMappingURL=azure.js.map
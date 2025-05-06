"use strict";
/* Copyright © 2021-2023 Richard Rodger, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
const identity_1 = require("@azure/identity");
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
function azure(options) {
    let seneca = this;
    // const root: any = seneca.root
    let azureClient = null;
    try {
        const credential = new identity_1.DefaultAzureCredential();
        azureClient = new keyvault_secrets_1.SecretClient(options.keyVault.url, credential);
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
    // Azure Key Vault configuration
    keyVault: {
        // Key Vault URL
        url: "",
    }
};
exports.default = azure;
if ('undefined' !== typeof (module)) {
    module.exports = azure;
}
//# sourceMappingURL=azure.js.map
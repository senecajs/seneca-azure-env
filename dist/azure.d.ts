type AzureKeyVaultOptions = {
    url: string;
};
type AzureEnvOptions = {
    keyVault: AzureKeyVaultOptions;
};
declare function azure(this: any, options: AzureEnvOptions): {
    exports: {
        getSecrets: () => Promise<Record<string, any>>;
    };
};
declare namespace azure {
    var defaults: AzureEnvOptions;
}
export type { AzureEnvOptions, AzureKeyVaultOptions };
export default azure;

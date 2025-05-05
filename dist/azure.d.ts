type GatewayResult = {
    out: any | {
        meta$: any;
        error$: {
            name: string;
            id: string;
            code?: string;
            message?: string;
            details?: any;
        };
    };
    error: boolean;
    meta?: any;
    gateway$?: Record<string, any>;
};
type AzureKeyVaultOptions = {
    keyVaultUrl: string;
};
type GatewayOptions = {
    allow: Record<string, boolean | (string | object)[]>;
    custom: any;
    fixed: any;
    timeout: {
        client: boolean;
        max: number;
    };
    error: {
        message: boolean;
        details: boolean;
    };
    debug: {
        response: boolean;
        log: boolean;
    };
    azure: AzureKeyVaultOptions;
};
declare function azure(this: any, options: GatewayOptions): {
    exports: {
        getSecrets: () => Promise<Record<string, any>>;
    };
};
declare namespace azure {
    var defaults: GatewayOptions;
}
export type { GatewayOptions, GatewayResult, AzureKeyVaultOptions };
export default azure;

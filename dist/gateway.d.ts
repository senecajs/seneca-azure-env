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
};
declare function gateway(this: any, options: GatewayOptions): {
    exports: {
        prepare: (json: any, ctx: any) => Promise<any>;
        handler: (json: any, ctx?: any) => Promise<unknown>;
        parseJSON: (data: any) => any;
    };
};
declare namespace gateway {
    var defaults: GatewayOptions;
}
export type { GatewayOptions, GatewayResult, };
export default gateway;

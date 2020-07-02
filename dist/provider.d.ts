declare const EventEmitter: any;
declare class EthereumProvider extends EventEmitter {
    constructor(connection: any);
    checkConnection(): Promise<void>;
    startNetworkSubscription(): Promise<void>;
    startChainSubscription(): Promise<void>;
    startAccountsSubscription(): Promise<void>;
    enable(): Promise<unknown>;
    _send(method: any, params?: any[]): Promise<unknown>;
    send(...args: any[]): Promise<unknown>;
    _sendBatch(requests: any): Promise<[unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]>;
    subscribe(type: any, method: any, params?: any[]): Promise<unknown>;
    unsubscribe(type: any, id: any): Promise<unknown>;
    sendAsync(payload: any, cb: any): any;
    sendAsyncBatch(payload: any, cb: any): Promise<void>;
    isConnected(): any;
    close(): void;
    request(payload: any): Promise<unknown>;
}

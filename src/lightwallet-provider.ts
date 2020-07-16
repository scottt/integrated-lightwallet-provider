import { HttpTransport } from './http-transport';
import { WebSocketTransport } from './websocket-transport';

import { Account } from 'web3-core';
import { Accounts } from 'web3-eth-accounts';

// IExecutor: like the first argument of a Promise ctor but as an object
interface IExecutor {
  resolve: (value?: unknown) => void,
  reject: (Error) => void
}

export class LightWalletProvider {
  connected: boolean
  nextId: number
  requestToExecutor: Record<any, IExecutor>
  transport: HttpTransport|WebSocketTransport
  accounts: Account[]
  account: Account
  chainIdPromise: Promise<number>
  chainIdPromiseResolve: (value?: number) => void
  chainIdPromiseReject: (reason: any) => void

  // Provide constructor API similar to HDWalletProvider when using private keys
  // https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider
  constructor (fetch: any, abortControllerCtor: any, web3AccountsInstance: Accounts, options: any, privateKeys: string[], rpcUrl: string, addressIndex: number, numAddresses: number) {
    this.connected = false;
    this.chainIdPromise = new Promise((resolve, reject) => {
      this.chainIdPromiseResolve = resolve;
      this.chainIdPromiseReject = reject;
    });
    this.nextId = 0;
    this.requestToExecutor = {};
    if (rpcUrl.startsWith('http')) {
      this.transport = new HttpTransport(fetch, abortControllerCtor, rpcUrl, options);
    } else {
      this.transport = new WebSocketTransport(WebSocket, rpcUrl, options);
    }
    this.transport.on('connect', () => this.fetchChainId());
    this.transport.on('payload', payload => {
      const { id, method, error, result } = payload;
      if (typeof id !== 'undefined') {
        if (this.requestToExecutor[id]) {
          if (payload.error) {
            this.requestToExecutor[id].reject(error);
          } else {
            this.requestToExecutor[id].resolve(result);
          }
          delete this.requestToExecutor[id];
        }
      }
    });
    const enabledKeys = privateKeys.slice(addressIndex, addressIndex + numAddresses);
    //console.log('LightWalletProvider.ctor: fetch:', fetch, ', abortControllerCtor:', abortControllerCtor, ', web3AccountsInstance:',
    //web3AccountsInstance, ', options:', options, privateKeys, rpcUrl, addressIndex, numAddresses)
    this.accounts = enabledKeys.map((sk) => web3AccountsInstance.privateKeyToAccount(sk));
    this.account = this.accounts[0];
  }
  async fetchChainId() {
    let chainId;
    try {
      chainId = parseInt(<string>(await this._send('net_version')));
      this.chainIdPromiseResolve(chainId);
      this.connected = true;
    } catch (_) {
      this.chainIdPromiseReject(chainId);
      this.connected = false;
    }
  }
  isConnected(): boolean {
    return this.connected;
  }
  close() {
    this.transport.close();
    this.connected = false;
  }
  async enable(): Promise<string[]> {
    return this.accounts.map((account) => account.address);
  }
  _eth_accounts(): Promise<string[]> {
    return this.enable();
  }
  sendToTransport(method, params): Promise<any> {
    console.log(`LightWalletProvider.sendToTransport: method: "${method}", params: "${JSON.stringify(params)}"`);
    return new Promise((resolve, reject) => {
      const payload = { jsonrpc: '2.0', id: this.nextId++, method, params };
      this.requestToExecutor[payload.id] = { resolve, reject };
      if (!method || typeof method !== 'string') {
        this.requestToExecutor[payload.id].reject(new Error('Method is not a valid string.'));
        delete this.requestToExecutor[payload.id];
      } else if (!(params instanceof Array)){
        this.requestToExecutor[payload.id].reject(new Error('Params is not a valid array.'));
        delete this.requestToExecutor[payload.id];
      } else {
        this.transport.send(payload);
      }
    })
  }
  _eth_sendTransaction(tx): Promise<string> {
    return this.chainIdPromise.then(async (chainId) => {
      tx['chainId'] = chainId;
      if (!tx['nonce']) {
        tx['nonce'] = await this.sendToTransport('eth_getTransactionCount', [this.account.address, 'pending'])
      }

      try {
        console.log('_eth_sendTransaction: this.account:', this.account);
        return this.account.signTransaction(tx).then((signedTx) => {
          console.log('signedTx:', signedTx);
          const method = 'eth_sendRawTransaction';
          const params = [signedTx.rawTransaction];
          return <Promise<string>>(this.sendToTransport(method, params));
        });
      } catch (err) {
        return new Promise((_, reject) => {
          reject(err);
        });
      }
    });
  }
  _send(method, params = []): Promise<any> {
    console.log(`LightWalletProvider._send: method: "${method}", params: "${JSON.stringify(params)}"`);
    if (method === 'eth_sendTransaction') {
      const tx = params[0];
      return this._eth_sendTransaction(tx);
    } else if (method == 'eth_accounts') {
      return this._eth_accounts();
    } else {
      return this.sendToTransport(method, params);
    }
  }
  send(method, params = []): Promise<any> {
    return this._send(method, params);
  }
  _sendBatch(requests): Promise<any> {
    return Promise.all(requests.map(payload => this._send(payload.method, payload.params)))
  }
  sendAsyncBatch(payloads, callback): Promise<any> {
    return this._sendBatch(payloads).then((results) => {
      let result = results.map((entry, index) => {
        return { id: payloads[index].id, jsonrpc: payloads[index].jsonrpc, result: entry }
      })
      callback(null, result);
    }).catch(err => {
      callback(err);
    })
  }
  sendAsync(payload, callback): Promise<any> {
    console.log('LightWalletProvider.sendAsync: called');
    if (!callback || typeof callback !== 'function') {
      throw new Error(`LightWalletProvider.sendAsync: 2nd argument must be a callback function, not "${callback}"`);
    }
    if (!payload) {
      return callback(`LightWalletProvider.sendAsync: invalid payload "${payload}"`);
    }
    if (payload instanceof Array) {
      return this.sendAsyncBatch(payload, callback)
    } else {
      return this._send(payload.method, payload.params).then(result => {
        callback(null, { id: payload.id, jsonrpc: payload.jsonrpc, result });
      }).catch(err => {
        callback(err);
      })
    }
  }
  request(payload): Promise<any> {
    return this._send(payload.method, payload.params);
  }
}

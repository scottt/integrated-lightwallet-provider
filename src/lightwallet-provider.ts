//import { EventEmitter } from './event-emitter';
import { HttpTransport } from './http-transport';

import { Account } from 'web3-core';
import { Accounts } from 'web3-eth-accounts';

/*
class ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}
*/

interface IExecutor {
  resolve: (value?: unknown) => void,
  reject: (Error) => void
}

const isPassThroughMethod = (methodName: string): boolean => {
  return methodName !== 'eth_sendTransaction';
}

export class LightWalletProvider /*extends EventEmitter*/ {
  connected: boolean
  nextId: number
  promises: Record<any, IExecutor>
  transport: HttpTransport
  accounts: Account[]
  account: Account
  chainIdPromise: Promise<number>
  chainIdPromiseResolve: (value?: number) => void
  chainIdPromiseReject: (reason: any) => void

  // provide the same constructor API as HDWalletProvider when using private keys
  // https://github.com/trufflesuite/truffle/tree/develop/packages/hdwallet-provider
  constructor (web3AccountsInstance: Accounts, privateKeys: string[], rpcUrl: string, addressIndex: number, numAddresses: number) {
    //super();
    this.connected = false;
    this.chainIdPromise = new Promise((resolve, reject) => {
      this.chainIdPromiseResolve = resolve;
      this.chainIdPromiseReject = reject;
    });
    this.nextId = 0;
    this.promises = {};
    this.transport = new HttpTransport(window.fetch, rpcUrl, {});
    this.transport.on('connect', () => this.checkConnection());
    this.transport.on('close', () => this.emit('close'));
    this.transport.on('payload', payload => {
      const { id, method, error, result } = payload
      if (typeof id !== 'undefined') {
        if (this.promises[id]) { // Fulfill promise
          payload.error ? this.promises[id].reject(error) : this.promises[id].resolve(result)
          delete this.promises[id]
        }
      } else if (method && method.indexOf('_subscription') > -1) { // Emit subscription result
        // Events: connect, disconnect, chainChanged, accountsChanged, message
        this.emit(payload.params.subscription, payload.params.result)
        this.emit(method, payload.params) // Latest EIP-1193
        this.emit('data', payload) // Backwards Compatibility
      }
    });
    const enabledKeys = privateKeys.slice(addressIndex, addressIndex + numAddresses);
    const accounts = [];
    for (let sk of enabledKeys) {
      accounts.push(web3AccountsInstance.privateKeyToAccount(sk));
    }
    this.accounts = accounts;
    this.account = accounts[0];
  }
  async checkConnection () {
    let chainId;
    try {
      chainId = parseInt(<string>(await this._send('net_version')));
      this.chainIdPromiseResolve(chainId);
      this.emit('connect', chainId);
      this.connected = true;
    } catch (_) {
      this.chainIdPromiseReject(chainId);
      this.connected = false;
    }
  }
  enable () {
    return new Promise((resolve, _) => {
      resolve(this.accounts.map((account) => account.address));
    })
  }
  _send (method, params = []) {
    console.log(`LightWalletProvider._send: method: "${method}", params: "${JSON.stringify(params)}`);
    if (isPassThroughMethod(method)) {
      return this.sendToTransport(method, params);
    }
    if (method === 'eth_sendTransaction') {
      const tx = params[0];
      return this.chainIdPromise.then((chainId) => {
        tx['chainId'] = chainId;
        try {
          return this.account.signTransaction(tx).then((signedTx) => {
            console.log('signedTx:', signedTx);
            method = 'eth_sendRawTransaction';
            params = [signedTx.rawTransaction];
            return this.sendToTransport(method, params);
          });
        } catch (err) {
          return new Promise((_, reject) => {
            reject(err);
          });
        }
      });
    } else {
      throw new Error(`unsupported method "${method}"`);
    }
  }
  sendToTransport(method, params) {
    console.log(`LightWalletProvider.sendToTransport: method: "${method}", params: "${JSON.stringify(params)}`);
    return new Promise((resolve, reject) => {
      const payload = { jsonrpc: '2.0', id: this.nextId++, method, params }
      this.promises[payload.id] = { resolve, reject }
      if (!method || typeof method !== 'string') {
        this.promises[payload.id].reject(new Error('Method is not a valid string.'))
        delete this.promises[payload.id]
      } else if (!(params instanceof Array)){
        this.promises[payload.id].reject(new Error('Params is not a valid array.'))
        delete this.promises[payload.id]
      } else {
        this.transport.send(payload)
      }
    })
  }
  send (method, params = []) { // Send can be clobbered
    return this._send(method, params)
  }
  _sendBatch (requests) {
    return Promise.all(requests.map(payload => this._send(payload.method, payload.params)))
  }
  sendAsync (payload, cb) { // Backwards Compatibility
    if (!cb || typeof cb !== 'function') return cb(new Error('Invalid or undefined callback provided to sendAsync'))
    if (!payload) return cb(new Error('Invalid Payload'))
    // sendAsync can be called with an array for batch requests used by web3.js 0.x
    // this is not part of EIP-1193's backwards compatibility but we still want to support it
    if (payload instanceof Array) {
      return this.sendAsyncBatch(payload, cb)
    } else {
      return this._send(payload.method, payload.params).then(result => {
        cb(null, { id: payload.id, jsonrpc: payload.jsonrpc, result })
      }).catch(err => {
        cb(err)
      })
    }
  }
  sendAsyncBatch (payload, cb) {
    return this._sendBatch(payload).then((results) => {
      let result = results.map((entry, index) => {
        return { id: payload[index].id, jsonrpc: payload[index].jsonrpc, result: entry }
      })
      cb(null, result)
    }).catch(err => {
      cb(err)
    })
  }
  isConnected () {
    return this.connected
  }
  close () {
    this.transport.close()
    this.connected = false
  }
  request (payload) {
    return this._send(payload.method, payload.params)
  }
  emit (eventName: string, payload: any = undefined) {
  }
}

window['LightWalletProvider'] = LightWalletProvider;

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var EventEmitter = require('events');
var EthereumProvider = /** @class */ (function (_super) {
    __extends(EthereumProvider, _super);
    function EthereumProvider(connection) {
        var _this = _super.call(this) || this;
        _this.connected = false;
        _this.nextId = 0;
        _this.promises = {};
        _this.subscriptions = [];
        _this.connection = connection;
        _this.connection.on('connect', function () { return _this.checkConnection(); });
        _this.connection.on('close', function () { return _this.emit('close'); });
        _this.connection.on('payload', function (payload) {
            var id = payload.id, method = payload.method, error = payload.error, result = payload.result;
            if (typeof id !== 'undefined') {
                if (_this.promises[id]) { // Fulfill promise
                    payload.error ? _this.promises[id].reject(error) : _this.promises[id].resolve(result);
                    delete _this.promises[id];
                }
            }
            else if (method && method.indexOf('_subscription') > -1) { // Emit subscription result
                // Events: connect, disconnect, chainChanged, accountsChanged, message
                _this.emit(payload.params.subscription, payload.params.result);
                _this.emit(method, payload.params); // Latest EIP-1193
                _this.emit('data', payload); // Backwards Compatibility
            }
        });
        _this.on('newListener', function (event, listener) {
            if (event === 'chainChanged' && !_this.attemptedChainSubscription && _this.connected) {
                _this.startChainSubscription();
            }
            else if (event === 'accountsChanged' && !_this.attemptedAccountsSubscription && _this.connected) {
                _this.startAccountsSubscription();
            }
            else if (event === 'networkChanged' && !_this.attemptedNetworkSubscription && _this.connected) {
                _this.startNetworkSubscription();
                console.warn('The networkChanged event is being deprecated, use chainChainged instead');
            }
        });
        return _this;
    }
    EthereumProvider.prototype.checkConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        _a = this.emit;
                        _b = ['connect'];
                        return [4 /*yield*/, this._send('net_version')];
                    case 1:
                        _a.apply(this, _b.concat([_c.sent()]));
                        this.connected = true;
                        if (this.listenerCount('networkChanged') && !this.attemptedNetworkSubscription)
                            this.startNetworkSubscription();
                        if (this.listenerCount('chainChanged') && !this.attemptedChainSubscription)
                            this.startNetworkSubscription();
                        if (this.listenerCount('accountsChanged') && !this.attemptedAccountsSubscription)
                            this.startAccountsSubscription();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _c.sent();
                        this.connected = false;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    EthereumProvider.prototype.startNetworkSubscription = function () {
        return __awaiter(this, void 0, void 0, function () {
            var networkChanged, e_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.attemptedNetworkSubscription = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.subscribe('eth_subscribe', 'networkChanged')];
                    case 2:
                        networkChanged = _a.sent();
                        this.on(networkChanged, function (netId) { return _this.emit('networkChanged', netId); });
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        console.warn('Unable to subscribe to networkChanged', e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    EthereumProvider.prototype.startChainSubscription = function () {
        return __awaiter(this, void 0, void 0, function () {
            var chainChanged, e_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.attemptedChainSubscription = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.subscribe('eth_subscribe', 'chainChanged')];
                    case 2:
                        chainChanged = _a.sent();
                        this.on(chainChanged, function (netId) { return _this.emit('chainChanged', netId); });
                        return [3 /*break*/, 4];
                    case 3:
                        e_3 = _a.sent();
                        console.warn('Unable to subscribe to chainChanged', e_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    EthereumProvider.prototype.startAccountsSubscription = function () {
        return __awaiter(this, void 0, void 0, function () {
            var accountsChanged, e_4;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.attemptedAccountsSubscription = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.subscribe('eth_subscribe', 'accountsChanged')];
                    case 2:
                        accountsChanged = _a.sent();
                        this.on(accountsChanged, function (accounts) { return _this.emit('accountsChanged', accounts); });
                        return [3 /*break*/, 4];
                    case 3:
                        e_4 = _a.sent();
                        console.warn('Unable to subscribe to accountsChanged', e_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    EthereumProvider.prototype.enable = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this._send('eth_accounts').then(function (accounts) {
                if (accounts.length > 0) {
                    _this.accounts = accounts;
                    _this.coinbase = accounts[0];
                    _this.emit('enable');
                    resolve(accounts);
                }
                else {
                    var err = new Error('User Denied Full Provider');
                    err.code = 4001;
                    reject(err);
                }
            }).catch(reject);
        });
    };
    EthereumProvider.prototype._send = function (method, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return new Promise(function (resolve, reject) {
            var payload = { jsonrpc: '2.0', id: _this.nextId++, method: method, params: params };
            _this.promises[payload.id] = { resolve: resolve, reject: reject };
            if (!method || typeof method !== 'string') {
                _this.promises[payload.id].reject(new Error('Method is not a valid string.'));
                delete _this.promises[payload.id];
            }
            else if (!(params instanceof Array)) {
                _this.promises[payload.id].reject(new Error('Params is not a valid array.'));
                delete _this.promises[payload.id];
            }
            else {
                _this.connection.send(payload);
            }
        });
    };
    EthereumProvider.prototype.send = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return this._send.apply(this, args);
    };
    EthereumProvider.prototype._sendBatch = function (requests) {
        var _this = this;
        return Promise.all(requests.map(function (payload) { return _this._send(payload.method, payload.params); }));
    };
    EthereumProvider.prototype.subscribe = function (type, method, params) {
        var _this = this;
        if (params === void 0) { params = []; }
        return this._send(type, __spreadArrays([method], params)).then(function (id) {
            _this.subscriptions.push(id);
            return id;
        });
    };
    EthereumProvider.prototype.unsubscribe = function (type, id) {
        var _this = this;
        return this._send(type, [id]).then(function (success) {
            if (success) {
                _this.subscriptions = _this.subscriptions.filter(function (_id) { return _id !== id; }); // Remove subscription
                _this.removeAllListeners(id); // Remove listeners
                return success;
            }
        });
    };
    EthereumProvider.prototype.sendAsync = function (payload, cb) {
        if (!cb || typeof cb !== 'function')
            return cb(new Error('Invalid or undefined callback provided to sendAsync'));
        if (!payload)
            return cb(new Error('Invalid Payload'));
        // sendAsync can be called with an array for batch requests used by web3.js 0.x
        // this is not part of EIP-1193's backwards compatibility but we still want to support it
        if (payload instanceof Array) {
            return this.sendAsyncBatch(payload, cb);
        }
        else {
            return this._send(payload.method, payload.params).then(function (result) {
                cb(null, { id: payload.id, jsonrpc: payload.jsonrpc, result: result });
            }).catch(function (err) {
                cb(err);
            });
        }
    };
    EthereumProvider.prototype.sendAsyncBatch = function (payload, cb) {
        return this._sendBatch(payload).then(function (results) {
            var result = results.map(function (entry, index) {
                return { id: payload[index].id, jsonrpc: payload[index].jsonrpc, result: entry };
            });
            cb(null, result);
        }).catch(function (err) {
            cb(err);
        });
    };
    EthereumProvider.prototype.isConnected = function () {
        return this.connected;
    };
    EthereumProvider.prototype.close = function () {
        var _this = this;
        this.connection.close();
        this.connected = false;
        var error = new Error("Provider closed, subscription lost, please subscribe again.");
        this.subscriptions.forEach(function (id) { return _this.emit(id, error); }); // Send Error objects to any open subscriptions
        this.subscriptions = []; // Clear subscriptions
    };
    EthereumProvider.prototype.request = function (payload) {
        return this._send(payload.method, payload.params);
    };
    return EthereumProvider;
}(EventEmitter));
module.exports = EthereumProvider;
//# sourceMappingURL=provider.js.map
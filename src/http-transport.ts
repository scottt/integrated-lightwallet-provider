import { EventEmitter } from './event-emitter'

const verboseLogging = true

export class HttpTransportError extends Error {
  res: Response
}

export class HttpTransport extends EventEmitter {
  fetch: any
  connected: boolean
  closed: boolean
  status: string
  url: string
  pollId: string

  constructor (fetchFunc, url, options) {
    super();
    this.fetch = fetchFunc;
    this.closed = false;
    this.connected = false;
    this.status = 'loading';
    this.url = url;
    //this.pollId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
    setTimeout(() => this.create(), 0);
  }
  close () {
    if (verboseLogging) {
      console.log('HttpTransport: closing');
    }
    this.closed = true;
    this.emit('close');
    this.removeAllListeners();
  }
  create () {
    this.on('error', () => { if (this.connected) { this.close(); } });
    this.init();
  }
  error (payload, message, code = -1) {
    this.emit('payload', { id: payload.id, jsonrpc: payload.jsonrpc, error: { message, code } })
  }
  _send (payload, internalCallback) {
    if (this.closed) {
      return this.error(payload, 'Not connected');
    }
    if (payload.method === 'eth_subscribe') {
      return this.error(payload, 'Subscriptions are not supported by this Http endpoint');
    }
    const fetchAbort = new AbortController();
    let sendCallProcessed = false;
    const sendCallback = (err, result) => {
      if (sendCallProcessed) {
        return;
      }
      sendCallProcessed = true;
      fetchAbort.abort();
      if (internalCallback) {
        internalCallback(err, result);
        return
      }
      let outPayload = { id: payload.id, jsonrpc: payload.jsonrpc, error: undefined, result: undefined }
      if (err) {
        outPayload.error =  { message: err.message, code: err.code };
      } else {
        outPayload.result = result;
      }
      this.emit('payload', outPayload);
    };
    let requestBody;
    try {
      requestBody = JSON.stringify(payload);
    } catch (err) {
      sendCallback(err, undefined);
    }
    const fetch = this.fetch;
    fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      //signal: fetchAbort.signal,
      body: requestBody,
    }).then((response) => {
      response.json().then((responseJson) => {
        sendCallback(responseJson.error, responseJson.result);
      }).catch((err) => {
        sendCallback(err, undefined);
      });
    }).catch((err) => {
      sendCallback(err, undefined);
    });
  }
  send (payload) {
    this._send(payload, undefined);
  }
  init () {
    this._send({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }, (err, _) => {
      if (err) {
        return this.emit('error', err);
      }
      this.connected = true;
      this.emit('connect');
    });
  }
  /* filterStatus (res) {
    if (res.status >= 200 && res.status < 300) return res
    let error = new HttpTransportError(res.statusText)
    error.res = res
    throw error.message
  } */
  /* pollSubscriptions () {
    this.send({ jsonrpc: '2.0', id: 1, method: 'eth_pollSubscriptions', params: [this.pollId] }, (err, result) => {
      if (err) {
        this.subscriptionTimeout = setTimeout(() => this.pollSubscriptions(), 10000)
        return this.emit('error', err)
      } else {
        if (!this.closed) this.subscriptionTimeout = this.pollSubscriptions()
        if (result) {
          result.map(p => {
            let parse
            try { parse = JSON.parse(p) } catch (e) { parse = false }
            return parse
          }).filter(n => n).forEach(p => this.emit('payload', p))
        }
      }
    })
  } */
}

window['HttpTransport'] = HttpTransport;

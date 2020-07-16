import { EventEmitter } from './event-emitter'

const verboseLogging = true

class WebSocketParser extends EventEmitter {
  accumulatedInput: string
  onMessage(data: string) {
    console.log(`WebSocketParser.onMessage("${data}")`);
    const values = [];
    const chunks = data.replace(/\}[\n\r]?\{/g, '}|--|{') // }{
      .replace(/\}\][\n\r]?\[\{/g, '}]|--|[{') // }][{
      .replace(/\}[\n\r]?\[\{/g, '}|--|[{') // }[{
      .replace(/\}\][\n\r]?\{/g, '}]|--|{') // }]{
      .split('|--|');
    for(let chunk of chunks) {
      let input = chunk;
      if (this.accumulatedInput) {
        input = this.accumulatedInput + chunk;
      }
      let result;
      try {
        result = JSON.parse(input);
      } catch(err) {
        this.accumulatedInput = input;
        continue;
      }
      this.accumulatedInput = null;
      if (result) {
        values.push(result);
      }
    }
    this.emit('parsed', values);
  };
}

export interface IWebSocketCtor {
  new(url: string, protocols?: string | string[]): WebSocket;
}

export class WebSocketTransport extends EventEmitter {
  ws: WebSocket
  wsOpenPromise: Promise<null>
  wsOpenResolve: () => void
  wsOpenReject: (err: any) => void
  wsParser: WebSocketParser
  webSocketCtor: IWebSocketCtor
  url: string
  options: any
  closed: boolean

  constructor (webSocketCtor: IWebSocketCtor, url: string, options: any) {
    super();
    this.closed = false;
    this.webSocketCtor = webSocketCtor;
    this.url = url;
    this.wsOpenPromise = new Promise((resolve, reject) => {
      this.wsOpenResolve = resolve;
      this.wsOpenReject = reject;
    });
    this.wsParser = new WebSocketParser();
    this.wsParser.on('parsed', (payloads) => {
      for (let p of payloads) {
        if (!Array.isArray(p)) {
          this.emit('payload', p);
          continue;
        }
        for (let i of p) {
          this.emit('payload', i);
        }
      }
    });
    setTimeout(() => { this.create() }, 0);
  }
  create() {
    try {
      this.ws = new this.webSocketCtor(this.url, []);
    } catch(err) {
      this.emit('error', err);
    }
    this.ws.addEventListener('error', (err) => {
      if (this.wsOpenReject) {
        this.wsOpenReject(err);
        this.wsOpenReject = null;
      }
      this.emit('error', err);
    });
    this.ws.addEventListener('open', () => {
      if (verboseLogging) {
        console.log('WebSocket.openEventHandler: called');
      }
      this.wsOpenReject = null;
      this.wsOpenResolve();
      this.emit('connect');
    });
    this.ws.addEventListener('message', (message) => {
      this.onMessage(message);
    });
    this.ws.addEventListener('close', () => {
      this.onClose();
    });
  }
  onMessage(message: MessageEvent) {
    let data = '';
    if (typeof(message.data) === 'string') {
      data = message.data;
    }
    this.wsParser.onMessage(data);
  }
  onClose() {
    if (verboseLogging) {
      console.log('WebSocketTransport.onClose: called');
    }
    if (this.wsOpenReject) {
      this.wsOpenReject(new Error('WebSocket closed before open event'));
      this.wsOpenReject = null;
    }
    this.ws = null;
    this.closed = true;
    this.emit('close');
    this.removeAllListeners();
  }
  close() {
    this.ws.close();
  }
  send(payload) {
    this.wsOpenPromise.then(() => {
      this.ws.send(JSON.stringify(payload));
    });
  }
}

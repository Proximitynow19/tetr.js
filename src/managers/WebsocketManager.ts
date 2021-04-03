/*
MIT License
Copyright (c) 2021 Jakob de Guzman
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import Client from "../classes/Client";
import { Constants } from "../constants/Constants";
import * as Payloads from "../interfaces/Payloads";

import WebSocket, { MessageEvent } from "ws";
import msgpack from "msgpack-lite";

export default class WebsocketManager {
  private socket!: WebSocket;
  public id: number = 1;

  constructor(private client: Client) {}

  async connect() {
    try {
      this.socket = new WebSocket(Constants.GATEWAY);

      this.socket.onopen = () => {
        const payload: Payloads.New = {
          command: "new",
        };

        this.send(payload);

        this.heartbeat(5000);
      };

      const client = this.client;

      this.socket.onmessage = (e) => {
        this.receive(e, client);
      };
    } catch (e) {
      console.error(e);
    }
  }

  private receive(e: MessageEvent, client: Client) {
    let packet: Payloads.Payload = { type: 0x00, data: null };

    switch (Number((e.data.slice(0, 1) as Buffer[])[0])) {
      case 0x45: // Standard ID Tag
        packet = {
          type: 0x45,
          data: msgpack.decode(e.data.slice(1) as Buffer),
        };
        break;
      case 0xae: // Extracted ID Tag
        packet = {
          type: 0xae,
          id: 174,
          data: msgpack.decode(e.data.slice(5) as Buffer),
        };
        break;
      case 0x58: // Batch Tag
        packet = {
          type: 0x45,
          lengths: 4, // N Lengths uint32
          data: msgpack.decode(e.data.slice(1) as Buffer),
        };
        break;
      case 0xb0: // Extension Tag
        packet = { type: 0xb0, data: e.data.slice(1) };

        if (Buffer.compare(packet.data as Buffer, Buffer.from([0x0c])) === 0)
          this.heartbeat(5000);

        return;
    }

    console.log(packet);

    client.emit(
      packet.data.command,
      packet.data.data as {
        type: number;
        data: any;
        id?: number;
        lengths?: number;
      }
    );

    if (packet.data.id) this.id = packet.data.id + 1;

    switch (packet.data.command) {
      case "hello":
        this.identify(client.token, client.handling);
        break;
      case "authorize":
        const presenceData: Payloads.Presence = {
          status: "online",
          detail: "",
        };
        const presenceChange: Payloads.SocialPresence = {
          command: "social.presence",
          data: presenceData,
        };

        this.send(presenceChange);

        break;
    }
  }

  public send(msg: any) {
    try {
      this.socket.send(msgpack.encode(msg));
    } catch (e) {
      console.error(e);
    }
  }

  private heartbeat(ms: number) {
    return setTimeout(() => {
      const heartbeat = Buffer.from([0xb0, 0x0b]);
      this.socket.send(heartbeat); // Heartbeat payload
    }, ms);
  }

  private identify(token: string, handling: Handling): void {
    const identity: Payloads.Authorize = {
      id: this.id,
      command: "authorize",
      data: {
        token,
        handling,
        signature: { commit: { id: "2d05c95" } },
      },
    };

    this.send(identity);
  }
}

export interface Handling {
  arr: string;
  das: string;
  sdf: string;
  safelock: boolean;
}

import EventEmitter from "node:events";
import Player from "../game/Player";
import WebSocketManager from "../ws/WebSocketManager";

const full = {
  aggregatestats: { apm: 0, pps: 0, vsscore: 0 },
  diyusi: 0,
  enemies: [],
  fire: 0,
  game: {
    controlling: {
      lastshift: 0,
      ldas: 0,
      ldasiter: 0,
      lshift: false,
      rdas: 0,
      rdasiter: 0,
      rshift: false,
      softdrop: false,
    },
    hold: { piece: null, locked: false },
    playing: true,
  },
  gameoverreason: null,
  killer: { gameid: null, name: null, type: "sizzle" },
  replay: {},
  source: {},
  stats: {
    lines: 0,
    level_lines: 0,
    level_lines_needed: 1,
    inputs: 0,
    holds: 0,
    time: {
      start: 0,
      zero: true,
      locked: false,
      prev: 0,
      frameoffset: 0,
    },
    score: 0,
    zenlevel: 1,
    zenprogress: 0,
    level: 1,
    combo: 0,
    currentcombopower: 0,
    topcombo: 0,
    btb: 0,
    topbtb: 0,
    currentbtbchainpower: 0,
    tspins: 0,
    piecesplaced: 0,
    clears: {
      singles: 0,
      doubles: 0,
      triples: 0,
      quads: 0,
      pentas: 0,
      realtspins: 0,
      minitspins: 0,
      minitspinsingles: 0,
      tspinsingles: 0,
      minitspindoubles: 0,
      tspindoubles: 0,
      tspintriples: 0,
      tspinquads: 0,
      tspinpentas: 0,
      allclear: 0,
    },
    garbage: {
      sent: 0,
      received: 0,
      attack: 0,
      cleared: 0,
    },
    kills: 0,
    finesse: {
      combo: 0,
      faults: 0,
      perfectpieces: 0,
    },
  },
  successful: false,
  targets: [],
};

export default class ClientPlayer extends EventEmitter {
  constructor(ws: WebSocketManager, me: Player) {
    super();

    this.frames = [
      {
        type: "full",
        data: {
          ...full,
          options: me.player_.options,
          stats: { ...full.stats, seed: me.options.seed },
          game: {
            ...full.game,
            bag: me.nextPieces,
            board: new Array(
              me.options.boardHeight + me.player_.options.boardbuffer
            ).fill(new Array(me.options.boardWidth).fill(null)),
            g: me.options.g,
            handling: me.player_.options.handling,
          },
        },
      },
      { type: "start", data: {} },
    ];

    // let z = this.frames[0].data;

    // console.log(z.stats.seed);
    // console.log(z.game.bag);
    // console.log(z.game.board);
    // console.log(z.game.g);
    // console.log(z.game.handling);

    this.ws = ws;
    this.player = me;
  }

  private ws: WebSocketManager;
  private frameCount = 0;
  private frames: { type: string; data: any }[];
  private replayTimeout?: NodeJS.Timeout;

  public player: Player;
  public lastFrame = 0;

  public get subframe(): number {
    return (Date.now() - this.lastFrame) / 1000 / 60;
  }

  public replay() {
    clearTimeout(this.replayTimeout);

    let currentFrame = this.frameCount++;

    this.ws.send({
      command: "replay",
      data: {
        frames: this.frames.splice(0).map((frame) => {
          return { ...frame, frame: currentFrame };
        }),
        gameid: this.player?.id,
        provisioned: currentFrame,
      },
    });

    this.lastFrame = Date.now();

    this.replayTimeout = setTimeout(() => {
      this.replay();
    }, 500);
  }

  public hardDrop() {
    this.frames.push({
      type: "keydown",
      data: { key: "hardDrop", subframe: this.subframe },
    });
  }
}

export default interface ClientPlayer extends EventEmitter {
  on(eventName: "start", listener: (me: ClientPlayer) => void): this;
}

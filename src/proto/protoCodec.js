// Ultra-Lightweight Binary Protocol Buffers Codec for Rocket Rush (Frontend)

export class BinaryWriter {
  constructor(initialSize = 256) {
    this.buffer = new Uint8Array(initialSize);
    this.offset = 0;
  }

  ensureCapacity(needed) {
    if (this.offset + needed > this.buffer.length) {
      const next = new Uint8Array(Math.max(this.buffer.length * 2, this.offset + needed));
      next.set(this.buffer);
      this.buffer = next;
    }
  }

  writeTag(fieldNumber, wireType) {
    this.writeVarint((fieldNumber << 3) | wireType);
  }

  writeVarint(val) {
    this.ensureCapacity(10);
    let v = Math.floor(Math.abs(val));
    while (v >= 0x80) {
      this.buffer[this.offset++] = (v & 0x7f) | 0x80;
      v = Math.floor(v / 128);
    }
    this.buffer[this.offset++] = v & 0x7f;
  }

  writeString(fieldNumber, str) {
    if (!str) return;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    this.writeTag(fieldNumber, 2);
    this.writeVarint(bytes.length);
    this.ensureCapacity(bytes.length);
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeBytes(fieldNumber, bytes) {
    if (!bytes || bytes.length === 0) return;
    this.writeTag(fieldNumber, 2);
    this.writeVarint(bytes.length);
    this.ensureCapacity(bytes.length);
    this.buffer.set(bytes, this.offset);
    this.offset += bytes.length;
  }

  writeDouble(fieldNumber, val) {
    this.writeTag(fieldNumber, 1);
    this.ensureCapacity(8);
    const dv = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.offset, 8);
    dv.setFloat64(0, val, true);
    this.offset += 8;
  }

  writeFloat(fieldNumber, val) {
    this.writeTag(fieldNumber, 5);
    this.ensureCapacity(4);
    const dv = new DataView(this.buffer.buffer, this.buffer.byteOffset + this.offset, 4);
    dv.setFloat32(0, val, true);
    this.offset += 4;
  }

  writeUint32(fieldNumber, val) {
    if (val === 0) return;
    this.writeTag(fieldNumber, 0);
    this.writeVarint(val);
  }

  writeBool(fieldNumber, val) {
    this.writeTag(fieldNumber, 0);
    this.writeVarint(val ? 1 : 0);
  }

  finish() {
    return this.buffer.subarray(0, this.offset);
  }
}

export class BinaryReader {
  constructor(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.length = bytes.byteLength;
    this.offset = 0;
    this.decoder = new TextDecoder();
  }

  hasMore() {
    return this.offset < this.length;
  }

  readTag() {
    if (!this.hasMore()) return null;
    const tag = this.readVarint();
    return { fieldNumber: tag >>> 3, wireType: tag & 0x7 };
  }

  readVarint() {
    let result = 0;
    let shift = 0;
    while (this.offset < this.length) {
      const b = this.view.getUint8(this.offset++);
      result += (b & 0x7f) * Math.pow(2, shift);
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }

  readString() {
    const len = this.readVarint();
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return this.decoder.decode(bytes);
  }

  readBytes() {
    const len = this.readVarint();
    const start = this.view.byteOffset + this.offset;
    const bytes = new Uint8Array(this.view.buffer.slice(start, start + len));
    this.offset += len;
    return bytes;
  }

  readDouble() {
    const val = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return val;
  }

  readFloat() {
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  skip(wireType) {
    if (wireType === 0) this.readVarint();
    else if (wireType === 1) this.offset += 8;
    else if (wireType === 2) {
      const len = this.readVarint();
      this.offset += len;
    } else if (wireType === 5) this.offset += 4;
  }
}

// Client Message Types
export const ClientMessageType = {
  START_SESSION: 1,
  GAME_TICK: 2,
  SUBMIT_SCORE: 3,
  GET_LEADERBOARD: 4,
  UPDATE_USERNAME: 5,
  MERGE_GUEST: 6,
  CHECK_USERNAME: 7,
  CREATE_ROOM: 8,
  JOIN_ROOM: 9,
  LEAVE_ROOM: 10,
  START_ROOM: 11,
  SPECTATE_TARGET: 12,
  PLAYER_MOVE: 13,
  RESET_ROOM_LOBBY: 14,
};

// Server Message Types
export const ServerMessageType = {
  SESSION_STARTED: 1,
  LEADERBOARD: 2,
  SCORE_SUBMITTED: 3,
  ERROR: 4,
  USERNAME_UPDATED: 5,
  USERNAME_CHECKED: 6,
  ROOM_CREATED: 7,
  ROOM_JOINED: 8,
  ROOM_PLAYER_JOINED: 9,
  ROOM_PLAYER_LEFT: 10,
  ROOM_PLAYERS: 11,
  ROOM_COUNTDOWN: 12,
  ROOM_STARTED: 13,
  ROOM_PLAYER_DIED: 14,
  ROOM_GAME_OVER: 15,
  ROOM_ERROR: 16,
  ROOM_PLAYERS_COMPACT: 17,
  ROOM_CLOSED: 18,
  ROOM_RESET_LOBBY: 19,
};

export function encodeClientMessage(msg) {
  const outer = new BinaryWriter();
  outer.writeUint32(1, msg.type);

  const inner = new BinaryWriter();
  if (msg.type === ClientMessageType.START_SESSION) {
    inner.writeString(1, msg.wallet);
    if (msg.username) inner.writeString(2, msg.username);
  } else if (msg.type === ClientMessageType.GAME_TICK) {
    inner.writeString(1, msg.sessionId);
    inner.writeDouble(2, msg.score);
    inner.writeFloat(3, msg.speed);
    inner.writeUint32(4, msg.level);
    inner.writeDouble(5, msg.timestamp);
    inner.writeFloat(6, msg.x);
    inner.writeFloat(7, msg.y);
    inner.writeDouble(8, msg.z);
  } else if (msg.type === ClientMessageType.SUBMIT_SCORE) {
    inner.writeString(1, msg.sessionId);
    inner.writeString(2, msg.wallet);
    inner.writeDouble(3, msg.score);
    if (msg.username) inner.writeString(4, msg.username);
  } else if (msg.type === ClientMessageType.GET_LEADERBOARD) {
    if (msg.limit) inner.writeUint32(1, msg.limit);
    if (msg.week) inner.writeString(2, msg.week);
  } else if (msg.type === ClientMessageType.UPDATE_USERNAME) {
    inner.writeString(1, msg.wallet);
    inner.writeString(2, msg.username);
  } else if (msg.type === ClientMessageType.MERGE_GUEST) {
    inner.writeString(1, msg.fromWallet);
    inner.writeString(2, msg.toWallet);
  } else if (msg.type === ClientMessageType.CHECK_USERNAME) {
    inner.writeString(1, msg.username);
    inner.writeString(2, msg.wallet);
  } else if (msg.type === ClientMessageType.CREATE_ROOM) {
    if (msg.wallet) inner.writeString(1, msg.wallet);
    if (msg.username) inner.writeString(2, msg.username);
  } else if (msg.type === ClientMessageType.JOIN_ROOM) {
    inner.writeString(1, msg.code);
    if (msg.wallet) inner.writeString(2, msg.wallet);
    if (msg.username) inner.writeString(3, msg.username);
  } else if (msg.type === ClientMessageType.LEAVE_ROOM) {
  } else if (msg.type === ClientMessageType.START_ROOM) {
  }

  outer.writeBytes(2, inner.finish());
  return outer.finish();
}

export function decodeServerMessage(buffer) {
  try {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (bytes.byteLength >= 2 && bytes[0] === ServerMessageType.ROOM_PLAYERS_COMPACT) {
      const players = decodeRoomPlayersCompact(bytes);
      return {
        type: ServerMessageType.ROOM_PLAYERS_COMPACT,
        players,
      };
    }

    const reader = new BinaryReader(bytes);
    let type = 0;
    let payloadBytes = null;

    while (reader.hasMore()) {
      const tag = reader.readTag();
      if (!tag) break;
      if (tag.fieldNumber === 1 && tag.wireType === 0) type = reader.readVarint();
      else if (tag.fieldNumber === 2 && tag.wireType === 2) payloadBytes = reader.readBytes();
      else reader.skip(tag.wireType);
    }

    if (!type) return null;

    const inner = new BinaryReader(payloadBytes || new Uint8Array(0));

    if (type === ServerMessageType.SESSION_STARTED) {
      let sessionId = "";
      let uid = "";
      let ghostBytes = null;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) sessionId = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 2) uid = inner.readString();
        else if (tag.fieldNumber === 3 && tag.wireType === 2) ghostBytes = inner.readBytes();
        else inner.skip(tag.wireType);
      }
      let ghostPath = null;
      let ghostInterval = 250;
      if (ghostBytes && ghostBytes.length > 4) {
        const decoded = decodeGhostBlob(ghostBytes);
        ghostPath = decoded.points;
        ghostInterval = decoded.interval;
      }
      return { type, sessionId, uid, ghostPath, ghostInterval };
    } else if (type === ServerMessageType.LEADERBOARD) {
      let week = "";
      const entries = [];
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) week = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 2) {
          const itemBytes = inner.readBytes();
          const itemReader = new BinaryReader(itemBytes);
          let rank = 0, wallet = "", username = null, score = 0;
          while (itemReader.hasMore()) {
            const itag = itemReader.readTag();
            if (!itag) break;
            if (itag.fieldNumber === 1 && itag.wireType === 0) rank = itemReader.readVarint();
            else if (itag.fieldNumber === 2 && itag.wireType === 2) wallet = itemReader.readString();
            else if (itag.fieldNumber === 3 && itag.wireType === 2) username = itemReader.readString();
            else if (itag.fieldNumber === 4 && itag.wireType === 1) score = itemReader.readDouble();
            else itemReader.skip(itag.wireType);
          }
          if (wallet && typeof wallet === 'string' && wallet.includes(',')) {
            const parts = wallet.split(',');
            wallet = parts[0];
            if (!score || score === 0) {
              score = parseFloat(parts[1]) || 0;
            }
          }
          entries.push({ rank, wallet, username, score });
        } else inner.skip(tag.wireType);
      }
      return { type, week, entries };
    } else if (type === ServerMessageType.SCORE_SUBMITTED) {
      let score = 0, rank = 0, valid = false;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 1) score = inner.readDouble();
        else if (tag.fieldNumber === 2 && tag.wireType === 0) rank = inner.readVarint();
        else if (tag.fieldNumber === 3 && tag.wireType === 0) valid = inner.readVarint() === 1;
        else inner.skip(tag.wireType);
      }
      return { type, score, rank, valid };
    } else if (type === ServerMessageType.ERROR) {
      let message = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) message = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, message };
    } else if (type === ServerMessageType.USERNAME_UPDATED) {
      let success = false, message = "", username;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 0) success = inner.readVarint() === 1;
        else if (tag.fieldNumber === 2 && tag.wireType === 2) message = inner.readString();
        else if (tag.fieldNumber === 3 && tag.wireType === 2) username = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, success, message, username };
    } else if (type === ServerMessageType.USERNAME_CHECKED) {
      let available = false, error;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 0) available = inner.readVarint() === 1;
        else if (tag.fieldNumber === 2 && tag.wireType === 2) error = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, available, error };
    } else if (type === ServerMessageType.ROOM_CREATED) {
      let code = "", seed = 0;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) code = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 0) seed = inner.readVarint();
        else inner.skip(tag.wireType);
      }
      return { type, code, seed };
    } else if (type === ServerMessageType.ROOM_JOINED) {
      let code = "", seed = 0;
      const players = [];
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) code = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 0) seed = inner.readVarint();
        else if (tag.fieldNumber === 3 && tag.wireType === 2) {
          const itemBytes = inner.readBytes();
          const ir = new BinaryReader(itemBytes);
          let uid = "", username = null, isHost = false;
          while (ir.hasMore()) {
            const it = ir.readTag();
            if (!it) break;
            if (it.fieldNumber === 1 && it.wireType === 2) uid = ir.readString();
            else if (it.fieldNumber === 2 && it.wireType === 2) username = ir.readString();
            else if (it.fieldNumber === 3 && it.wireType === 0) isHost = ir.readVarint() === 1;
            else ir.skip(it.wireType);
          }
          players.push({ uid, username, isHost });
        }
        else inner.skip(tag.wireType);
      }
      return { type, code, seed, players };
    } else if (type === ServerMessageType.ROOM_PLAYER_JOINED) {
      let uid = "", username = null;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) uid = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 2) username = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, uid, username };
    } else if (type === ServerMessageType.ROOM_PLAYER_LEFT) {
      let uid = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) uid = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, uid };
    } else if (type === ServerMessageType.ROOM_PLAYERS) {
      const players = [];
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) {
          const itemBytes = inner.readBytes();
          const ir = new BinaryReader(itemBytes);
          let uid = "", username = null, x = 0, y = 0, z = 0, score = 0, alive = true, level = 0;
          while (ir.hasMore()) {
            const it = ir.readTag();
            if (!it) break;
            if (it.fieldNumber === 1 && it.wireType === 2) uid = ir.readString();
            else if (it.fieldNumber === 2 && it.wireType === 2) username = ir.readString();
            else if (it.fieldNumber === 3 && it.wireType === 5) x = ir.readFloat();
            else if (it.fieldNumber === 4 && it.wireType === 5) y = ir.readFloat();
            else if (it.fieldNumber === 5 && it.wireType === 1) z = ir.readDouble();
            else if (it.fieldNumber === 6 && it.wireType === 1) score = ir.readDouble();
            else if (it.fieldNumber === 7 && it.wireType === 0) alive = ir.readVarint() === 1;
            else if (it.fieldNumber === 8 && it.wireType === 0) level = ir.readVarint();
            else ir.skip(it.wireType);
          }
          players.push({ uid, username, x, y, z, score, alive, level });
        }
        else inner.skip(tag.wireType);
      }
      return { type, players };
    } else if (type === ServerMessageType.ROOM_COUNTDOWN) {
      let seconds = 0;
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 0) seconds = inner.readVarint();
        else inner.skip(tag.wireType);
      }
      return { type, seconds };
    } else if (type === ServerMessageType.ROOM_STARTED) {
      return { type };
    } else if (type === ServerMessageType.ROOM_PLAYER_DIED) {
      let uid = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) uid = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, uid };
    } else if (type === ServerMessageType.ROOM_GAME_OVER) {
      const rankings = [];
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) {
          const itemBytes = inner.readBytes();
          const ir = new BinaryReader(itemBytes);
          let uid = "", username = null, score = 0, rank = 0;
          while (ir.hasMore()) {
            const it = ir.readTag();
            if (!it) break;
            if (it.fieldNumber === 1 && it.wireType === 2) uid = ir.readString();
            else if (it.fieldNumber === 2 && it.wireType === 2) username = ir.readString();
            else if (it.fieldNumber === 3 && it.wireType === 1) score = ir.readDouble();
            else if (it.fieldNumber === 4 && it.wireType === 0) rank = ir.readVarint();
            else ir.skip(it.wireType);
          }
          rankings.push({ uid, username, score, rank });
        }
        else inner.skip(tag.wireType);
      }
      return { type, rankings };
    } else if (type === ServerMessageType.ROOM_ERROR) {
      let message = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) message = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, message };
    } else if (type === ServerMessageType.ROOM_CLOSED) {
      let reason = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) reason = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, reason };
    } else if (type === ServerMessageType.ROOM_RESET_LOBBY) {
      let code = "", seed = 0;
      const players = [];
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) code = inner.readString();
        else if (tag.fieldNumber === 2 && tag.wireType === 0) seed = inner.readVarint();
        else if (tag.fieldNumber === 3 && tag.wireType === 2) {
          const itemBytes = inner.readBytes();
          const ir = new BinaryReader(itemBytes);
          let uid = "", username = null, isHost = false;
          while (ir.hasMore()) {
            const it = ir.readTag();
            if (!it) break;
            if (it.fieldNumber === 1 && it.wireType === 2) uid = ir.readString();
            else if (it.fieldNumber === 2 && it.wireType === 2) username = ir.readString();
            else if (it.fieldNumber === 3 && it.wireType === 0) isHost = ir.readVarint() === 1;
            else ir.skip(it.wireType);
          }
          players.push({ uid, username, isHost });
        } else inner.skip(tag.wireType);
      }
      return { type, code, seed, players };
    }
    return null;
  } catch (e) {
    console.error('[ProtoCodec] decodeServerMessage error:', e);
    return null;
  }
}

export function decodeGhostBlob(rawBytes) {
  const buf = rawBytes.buffer || rawBytes
  const dv = new DataView(buf, rawBytes.byteOffset, rawBytes.byteLength)
  const interval = dv.getUint16(0)
  const count = dv.getUint16(2)
  const points = []
  for (let i = 0; i < count; i++) {
    const off = 4 + i * 10
    points.push({
      z: dv.getFloat32(off, true),
      x: dv.getInt16(off + 4, true) / 109.2266,
      y: dv.getFloat32(off + 6, true)
    })
  }
  return { interval, points }
}

export function encodePlayerMove(x, y, z, speed, score, level) {
  const buf = new Uint8Array(9);
  const dv = new DataView(buf.buffer, buf.byteOffset, 9);
  dv.setUint8(0, ClientMessageType.PLAYER_MOVE);
  dv.setInt16(1, Math.round(Math.max(-32768, Math.min(32767, x * 100))), true);
  dv.setUint8(3, Math.round(Math.max(0, Math.min(255, (y - 1.0) * 30))));
  dv.setFloat32(4, z, true);
  const speedQuant = Math.round(Math.max(0, Math.min(15, speed * 2.5)));
  const levelQuant = Math.max(0, Math.min(15, Math.floor(level)));
  dv.setUint8(8, (speedQuant << 4) | (levelQuant & 0x0F));
  return buf;
}

export function decodePlayerMove(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const x = dv.getInt16(1, true) / 100;
  const y = 1.0 + (dv.getUint8(3) / 30);
  const z = dv.getFloat32(4, true);
  const packed = dv.getUint8(8);
  const speed = (packed >> 4) / 2.5;
  const level = packed & 0x0F;
  const score = Math.max(0, Math.abs(z) - 10);
  return { x, y, z, speed, score, level };
}

export function encodeRoomPlayersCompact(players) {
  const count = players.length;
  const totalBytes = 2 + count * 8;
  const buf = new Uint8Array(totalBytes);
  const dv = new DataView(buf.buffer, buf.byteOffset, totalBytes);
  dv.setUint8(0, ServerMessageType.ROOM_PLAYERS_COMPACT);
  dv.setUint8(1, count);
  for (let i = 0; i < count; i++) {
    const off = 2 + i * 8;
    const p = players[i];
    if (!p) continue;
    const packed = ((p.alive ? 1 : 0) << 7) | ((Math.min(7, p.level) & 0x07) << 4) | (p.playerIndex & 0x0F);
    dv.setUint8(off, packed);
    dv.setInt16(off + 1, Math.round(Math.max(-32768, Math.min(32767, p.x * 100))), true);
    dv.setUint8(off + 3, Math.round(Math.max(0, Math.min(255, (p.y - 1.0) * 30))));
    dv.setFloat32(off + 4, p.z, true);
  }
  return buf;
}

export function decodeRoomPlayersCompact(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = dv.getUint8(1);
  const players = [];
  for (let i = 0; i < count; i++) {
    const off = 2 + i * 8;
    if (off + 8 > bytes.byteLength) break;
    const packed = dv.getUint8(off);
    const alive = (packed & 0x80) !== 0;
    const level = (packed >> 4) & 0x07;
    const playerIndex = packed & 0x0F;
    const x = dv.getInt16(off + 1, true) / 100;
    const y = 1.0 + (dv.getUint8(off + 3) / 30);
    const z = dv.getFloat32(off + 4, true);
    const score = Math.max(0, Math.abs(z) - 10);
    players.push({
      playerIndex,
      alive,
      x,
      y,
      z,
      speed: 1.0 + (level * 0.15),
      score,
      level,
    });
  }
  return players;
}



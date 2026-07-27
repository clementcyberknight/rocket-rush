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
    const dv = new DataView(this.buffer.buffer, this.offset, 8);
    dv.setFloat64(0, val, true);
    this.offset += 8;
  }

  writeFloat(fieldNumber, val) {
    this.writeTag(fieldNumber, 5);
    this.ensureCapacity(4);
    const dv = new DataView(this.buffer.buffer, this.offset, 4);
    dv.setFloat32(0, val, true);
    this.offset += 4;
  }

  writeUint32(fieldNumber, val) {
    if (val === 0) return;
    this.writeTag(fieldNumber, 0);
    this.writeVarint(val);
  }

  writeBool(fieldNumber, val) {
    if (!val) return;
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
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return new Uint8Array(bytes);
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
};

// Server Message Types
export const ServerMessageType = {
  SESSION_STARTED: 1,
  LEADERBOARD: 2,
  SCORE_SUBMITTED: 3,
  ERROR: 4,
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
  } else if (msg.type === ClientMessageType.SUBMIT_SCORE) {
    inner.writeString(1, msg.sessionId);
    inner.writeString(2, msg.wallet);
    inner.writeDouble(3, msg.score);
    if (msg.username) inner.writeString(4, msg.username);
  } else if (msg.type === ClientMessageType.GET_LEADERBOARD) {
    if (msg.limit) inner.writeUint32(1, msg.limit);
    if (msg.week) inner.writeString(2, msg.week);
  }

  outer.writeBytes(2, inner.finish());
  return outer.finish();
}

export function decodeServerMessage(buffer) {
  try {
    const reader = new BinaryReader(buffer);
    let type = 0;
    let payloadBytes = null;

    while (reader.hasMore()) {
      const tag = reader.readTag();
      if (!tag) break;
      if (tag.fieldNumber === 1 && tag.wireType === 0) type = reader.readVarint();
      else if (tag.fieldNumber === 2 && tag.wireType === 2) payloadBytes = reader.readBytes();
      else reader.skip(tag.wireType);
    }

    if (!type || !payloadBytes) return null;

    const inner = new BinaryReader(payloadBytes);

    if (type === ServerMessageType.SESSION_STARTED) {
      let sessionId = "";
      while (inner.hasMore()) {
        const tag = inner.readTag();
        if (!tag) break;
        if (tag.fieldNumber === 1 && tag.wireType === 2) sessionId = inner.readString();
        else inner.skip(tag.wireType);
      }
      return { type, sessionId };
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
    }
    return null;
  } catch (e) {
    return null;
  }
}

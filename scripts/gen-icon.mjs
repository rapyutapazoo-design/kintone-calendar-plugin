// manifest.json が要求するプラグインアイコン (icon.png) を生成する。
// 外部画像編集ツールに依存せず、Node 標準の zlib のみで最小限の PNG を組み立てる。
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const SIZE = 128;

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr.writeUInt8(8, 8); // bit depth
ihdr.writeUInt8(2, 9); // color type: RGB
ihdr.writeUInt8(0, 10);
ihdr.writeUInt8(0, 11);
ihdr.writeUInt8(0, 12);

// ピクセルデータ: 青系グラデーション背景に白いカレンダーグリッド風の四角
const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
let pos = 0;
for (let y = 0; y < SIZE; y++) {
  raw[pos++] = 0; // filter type none
  for (let x = 0; x < SIZE; x++) {
    const margin = SIZE * 0.12;
    const isCard = x > margin && x < SIZE - margin && y > margin * 1.3 && y < SIZE - margin;
    const isHeaderBand = isCard && y < margin * 1.3 + SIZE * 0.16;
    let r, g, b;
    if (isHeaderBand) {
      r = 0xe0553d; // ヘッダー帯（赤系）
      g = 0x4a;
      b = 0x33;
    } else if (isCard) {
      r = 0xff;
      g = 0xff;
      b = 0xff;
    } else {
      // 背景グラデーション（青系）
      const t = y / SIZE;
      r = Math.round(0x1f + (0x3a - 0x1f) * t);
      g = Math.round(0x6f + (0x8d - 0x6f) * t);
      b = Math.round(0xd8 - (0xd8 - 0xc4) * t);
    }
    raw[pos++] = r;
    raw[pos++] = g;
    raw[pos++] = b;
  }
}

const idatData = deflateSync(raw);

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  chunk("IHDR", ihdr),
  chunk("IDAT", idatData),
  chunk("IEND", Buffer.alloc(0)),
]);

writeFileSync(new URL("../plugin/icon.png", import.meta.url), png);
console.log(`icon.png generated: ${png.length} bytes`);

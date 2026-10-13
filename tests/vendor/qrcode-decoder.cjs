// Test-only generated CommonJS bundle: @nuintun/qrcode 5.0.3 (MIT), tslib 2.8.1 (0BSD).
// Sources: npm tarballs; see adjacent licenses. No application import.
const modules={0:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Decoded = require(1);
const source = require(2);
const BitMatrixParser = require(8);
const decoder = require(17);
const index = require(22);

/**
 * @module Decoder
 */
function parse(parser, version, { mask, level }) {
  let offset = 0;
  let corrected = 0;
  parser.unmask(mask);
  const ecBlocks = version.getECBlocks(level);
  const codewords = parser.readCodewords(version, level);
  const blocks = decoder.getDataBlocks(codewords, version, level);
  const buffer = new Uint8Array(ecBlocks.numTotalDataCodewords);
  for (const { codewords, numDataCodewords } of blocks) {
    const [bytes, errors] = decoder.correctErrors(codewords, numDataCodewords);
    buffer.set(bytes.subarray(0, numDataCodewords), offset);
    corrected += errors;
    offset += numDataCodewords;
  }
  return [buffer, corrected];
}
class Decoder {
  #decode;
  /**
   * @constructor
   * @param options The options of decoder.
   */
  constructor({ decode = index.decode } = {}) {
    this.#decode = decode;
  }
  /**
   * @method decode
   * @description Decode the qrcode matrix.
   * @param matrix The qrcode matrix.
   */
  decode(matrix) {
    let corrected = 0;
    let mirror = false;
    let version;
    let codewords;
    let formatInfo;
    const parser = new BitMatrixParser.BitMatrixParser(matrix);
    try {
      version = parser.readVersion();
      formatInfo = parser.readFormatInfo();
      [codewords, corrected] = parse(parser, version, formatInfo);
    } catch {
      if (formatInfo != null) {
        parser.remask(formatInfo.mask);
      }
      parser.mirror();
      mirror = true;
      version = parser.readVersion();
      formatInfo = parser.readFormatInfo();
      [codewords, corrected] = parse(parser, version, formatInfo);
    }
    return new Decoded.Decoded(source.decode(codewords, version, this.#decode), version, formatInfo, corrected, mirror);
  }
}

exports.Decoder = Decoder;

},
1:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module Decoded
 */
class Decoded {
  #mask;
  #level;
  #mirror;
  #version;
  #corrected;
  #metadata;
  constructor(metadata, version, { mask, level }, corrected, mirror) {
    this.#mask = mask;
    this.#level = level;
    this.#mirror = mirror;
    this.#version = version;
    this.#metadata = metadata;
    this.#corrected = corrected;
  }
  /**
   * @property mask
   * @description Get the mask of qrcode.
   */
  get mask() {
    return this.#mask;
  }
  /**
   * @property level
   * @description Get the error correction level of qrcode.
   */
  get level() {
    return this.#level.name;
  }
  /**
   * @property version
   * @description Get the version of qrcode.
   */
  get version() {
    return this.#version.version;
  }
  /**
   * @property mirror
   * @description Get the mirror of qrcode.
   */
  get mirror() {
    return this.#mirror;
  }
  /**
   * @property content
   * @description Get the content of qrcode.
   */
  get content() {
    return this.#metadata.content;
  }
  /**
   * @property corrected
   * @description Get the corrected of qrcode.
   */
  get corrected() {
    return this.#corrected;
  }
  /**
   * @property symbology
   * @description Get the symbology of qrcode.
   */
  get symbology() {
    return this.#metadata.symbology;
  }
  /**
   * @property fnc1
   * @description Get the fnc1 of qrcode.
   */
  get fnc1() {
    return this.#metadata.fnc1;
  }
  /**
   * @property codewords
   * @description Get the codewords of qrcode.
   */
  get codewords() {
    return this.#metadata.codewords;
  }
  /**
   * @property structured
   * @description Get the structured of qrcode.
   */
  get structured() {
    return this.#metadata.structured;
  }
}

exports.Decoded = Decoded;

},
2:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const BitSource = require(3);
const Mode = require(4);
const Charset = require(5);
const mapping = require(6);

/**
 * @module source
 */
function parseECIValue(source) {
  const firstByte = source.read(8);
  if ((firstByte & 0x80) === 0) {
    // Just one byte.
    return firstByte & 0x7f;
  }
  if ((firstByte & 0xc0) === 0x80) {
    // Two bytes.
    const secondByte = source.read(8);
    return ((firstByte & 0x3f) << 8) | secondByte;
  }
  if ((firstByte & 0xe0) === 0xc0) {
    // Three bytes.
    const secondThirdBytes = source.read(16);
    return ((firstByte & 0x1f) << 16) | secondThirdBytes;
  }
  throw new Error('illegal extended channel interpretation value');
}
const GS = String.fromCharCode(0x1d);
function processGSCharacter(content) {
  return content.replace(/%+/g, match => {
    const isOdd = match.length & 0x01;
    match = match.replace(/%%/g, '%');
    return isOdd ? match.replace(/%$/, GS) : match;
  });
}
function decodeAlphanumericSegment(source, count, fnc1) {
  let content = '';
  while (count > 1) {
    if (source.available() < 11) {
      throw new Error('illegal bits length');
    }
    const nextTwoCharsBits = source.read(11);
    content += mapping.ALPHANUMERIC_CHARACTERS.charAt(nextTwoCharsBits / 45);
    content += mapping.ALPHANUMERIC_CHARACTERS.charAt(nextTwoCharsBits % 45);
    count -= 2;
  }
  if (count === 1) {
    // Special case: one character left.
    if (source.available() < 6) {
      throw new Error('illegal bits length');
    }
    content += mapping.ALPHANUMERIC_CHARACTERS.charAt(source.read(6));
  }
  return fnc1 ? processGSCharacter(content) : content;
}
function decodeByteSegment(source, count, decode, fnc1, eciValue) {
  // Don't crash trying to read more bits than we have available.
  if (source.available() < 8 * count) {
    throw new Error('illegal bits length');
  }
  const bytes = new Uint8Array(count);
  const charset = eciValue != null ? Charset.fromCharsetValue(eciValue) : Charset.Charset.ISO_8859_1;
  for (let i = 0; i < count; i++) {
    bytes[i] = source.read(8);
  }
  const content = decode(bytes, charset);
  return fnc1 ? processGSCharacter(content) : content;
}
function decodeHanziSegment(source, count) {
  if (source.available() < 13 * count) {
    throw new Error('illegal bits length');
  }
  let offset = 0;
  const bytes = new Uint8Array(2 * count);
  while (count > 0) {
    const twoBytes = source.read(13);
    let assembledTwoBytes = ((twoBytes / 0x060) << 8) | (twoBytes % 0x060);
    if (assembledTwoBytes < 0x00a00) {
      // In the 0xA1A1 to 0xAAFE range.
      assembledTwoBytes += 0x0a1a1;
    } else {
      // In the 0xB0A1 to 0xFAFE range.
      assembledTwoBytes += 0x0a6a1;
    }
    bytes[offset] = (assembledTwoBytes >> 8) & 0xff;
    bytes[offset + 1] = assembledTwoBytes & 0xff;
    count--;
    offset += 2;
  }
  return new TextDecoder('gb2312').decode(bytes);
}
function decodeKanjiSegment(source, count) {
  if (source.available() < 13 * count) {
    throw new Error('illegal bits length');
  }
  let offset = 0;
  const bytes = new Uint8Array(2 * count);
  while (count > 0) {
    const twoBytes = source.read(13);
    let assembledTwoBytes = ((twoBytes / 0x0c0) << 8) | (twoBytes % 0x0c0);
    if (assembledTwoBytes < 0x01f00) {
      // In the 0x8140 to 0x9FFC range.
      assembledTwoBytes += 0x08140;
    } else {
      // In the 0xE040 to 0xEBBF range.
      assembledTwoBytes += 0x0c140;
    }
    bytes[offset] = (assembledTwoBytes >> 8) & 0xff;
    bytes[offset + 1] = assembledTwoBytes & 0xff;
    count--;
    offset += 2;
  }
  return new TextDecoder('shift-jis').decode(bytes);
}
function decodeNumericSegment(source, count) {
  let content = '';
  // Read three digits at a time.
  while (count >= 3) {
    // Each 10 bits encodes three digits.
    if (source.available() < 10) {
      throw new Error('illegal bits length');
    }
    const threeDigitsBits = source.read(10);
    if (threeDigitsBits >= 1000) {
      throw new Error('illegal numeric codeword');
    }
    content += mapping.NUMERIC_CHARACTERS.charAt(threeDigitsBits / 100);
    content += mapping.NUMERIC_CHARACTERS.charAt((threeDigitsBits / 10) % 10);
    content += mapping.NUMERIC_CHARACTERS.charAt(threeDigitsBits % 10);
    count -= 3;
  }
  if (count === 2) {
    // Two digits left over to read, encoded in 7 bits.
    if (source.available() < 7) {
      throw new Error('illegal bits length');
    }
    const twoDigitsBits = source.read(7);
    if (twoDigitsBits >= 100) {
      throw new Error('illegal numeric codeword');
    }
    content += mapping.NUMERIC_CHARACTERS.charAt(twoDigitsBits / 10);
    content += mapping.NUMERIC_CHARACTERS.charAt(twoDigitsBits % 10);
  } else if (count === 1) {
    // One digit left over to read.
    if (source.available() < 4) {
      throw new Error('illegal bits length');
    }
    const digitBits = source.read(4);
    if (digitBits >= 10) {
      throw new Error('illegal numeric codeword');
    }
    content += mapping.NUMERIC_CHARACTERS.charAt(digitBits);
  }
  return content;
}
function decode(codewords, version, decode) {
  let content = '';
  let indicator = -1;
  let modifier;
  let hasFNC1First = false;
  let hasFNC1Second = false;
  let mode;
  let fnc1 = false;
  let currentECIValue;
  let structured = false;
  const source = new BitSource.BitSource(codewords);
  do {
    // While still another segment to read...
    if (source.available() < 4) {
      // OK, assume we're done. Really, a TERMINATOR mode should have been recorded here.
      mode = Mode.Mode.TERMINATOR;
    } else {
      mode = Mode.fromModeBits(source.read(4));
    }
    switch (mode) {
      case Mode.Mode.TERMINATOR:
        break;
      case Mode.Mode.FNC1_FIRST_POSITION:
        hasFNC1First = true;
        break;
      case Mode.Mode.FNC1_SECOND_POSITION:
        hasFNC1Second = true;
        indicator = source.read(8);
        break;
      case Mode.Mode.STRUCTURED_APPEND:
        if (source.available() < 16) {
          throw new Error('illegal structured append');
        }
        structured = Object.freeze({
          index: source.read(4),
          count: source.read(4) + 1,
          parity: source.read(8)
        });
        break;
      case Mode.Mode.ECI:
        currentECIValue = parseECIValue(source);
        break;
      default:
        if (mode === Mode.Mode.HANZI) {
          const subset = source.read(4);
          if (subset !== 1) {
            throw new Error('illegal hanzi subset');
          }
        }
        const count = source.read(mode.getCharacterCountBits(version));
        switch (mode) {
          case Mode.Mode.ALPHANUMERIC:
            content += decodeAlphanumericSegment(source, count, hasFNC1First || hasFNC1Second);
            break;
          case Mode.Mode.BYTE:
            content += decodeByteSegment(source, count, decode, hasFNC1First || hasFNC1Second, currentECIValue);
            break;
          case Mode.Mode.HANZI:
            content += decodeHanziSegment(source, count);
            break;
          case Mode.Mode.KANJI:
            content += decodeKanjiSegment(source, count);
            break;
          case Mode.Mode.NUMERIC:
            content += decodeNumericSegment(source, count);
            break;
          default:
            throw new Error('illegal mode');
        }
    }
  } while (mode !== Mode.Mode.TERMINATOR);
  if (hasFNC1First) {
    fnc1 = Object.freeze(['GS1']);
  } else if (hasFNC1Second) {
    fnc1 = Object.freeze(['AIM', indicator]);
  }
  if (currentECIValue != null) {
    if (hasFNC1First) {
      modifier = 4;
    } else if (hasFNC1Second) {
      modifier = 6;
    } else {
      modifier = 2;
    }
  } else {
    if (hasFNC1First) {
      modifier = 3;
    } else if (hasFNC1Second) {
      modifier = 5;
    } else {
      modifier = 1;
    }
  }
  return { content, codewords, structured, symbology: `]Q${modifier}`, fnc1 };
}

exports.decode = decode;

},
3:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module BitSource
 */
class BitSource {
  #bytes;
  #bitOffset;
  #byteOffset;
  constructor(bytes) {
    this.#bytes = bytes;
    this.#bitOffset = 0;
    this.#byteOffset = 0;
  }
  get bitOffset() {
    return this.#bitOffset;
  }
  get byteOffset() {
    return this.#byteOffset;
  }
  read(length) {
    let result = 0;
    let bitOffset = this.#bitOffset;
    let byteOffset = this.#byteOffset;
    const bytes = this.#bytes;
    // First, read remainder from current byte.
    if (bitOffset > 0) {
      const bitsLeft = 8 - bitOffset;
      const toRead = Math.min(length, bitsLeft);
      const bitsToNotRead = bitsLeft - toRead;
      const mask = (0xff >> (8 - toRead)) << bitsToNotRead;
      length -= toRead;
      bitOffset += toRead;
      result = (bytes[byteOffset] & mask) >> bitsToNotRead;
      if (bitOffset === 8) {
        byteOffset++;
        bitOffset = 0;
      }
    }
    // Next read whole bytes.
    if (length > 0) {
      while (length >= 8) {
        length -= 8;
        result = (result << 8) | (bytes[byteOffset++] & 0xff);
      }
      // Finally read a partial byte.
      if (length > 0) {
        const bitsToNotRead = 8 - length;
        const mask = (0xff >> bitsToNotRead) << bitsToNotRead;
        bitOffset += length;
        result = (result << length) | ((bytes[byteOffset] & mask) >> bitsToNotRead);
      }
    }
    this.#bitOffset = bitOffset;
    this.#byteOffset = byteOffset;
    return result;
  }
  available() {
    return 8 * (this.#bytes.length - this.#byteOffset) - this.#bitOffset;
  }
}

exports.BitSource = BitSource;

},
4:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module Mode
 */
const VALUES_TO_MODE = new Map();
function fromModeBits(bits) {
  const mode = VALUES_TO_MODE.get(bits);
  if (mode != null) {
    return mode;
  }
  throw new Error('illegal mode bits');
}
class Mode {
  #bits;
  #characterCountBitsSet;
  static TERMINATOR = new Mode([0, 0, 0], 0x00);
  static NUMERIC = new Mode([10, 12, 14], 0x01);
  static ALPHANUMERIC = new Mode([9, 11, 13], 0x02);
  static STRUCTURED_APPEND = new Mode([0, 0, 0], 0x03);
  static BYTE = new Mode([8, 16, 16], 0x04);
  static ECI = new Mode([0, 0, 0], 0x07);
  static KANJI = new Mode([8, 10, 12], 0x08);
  static FNC1_FIRST_POSITION = new Mode([0, 0, 0], 0x05);
  static FNC1_SECOND_POSITION = new Mode([0, 0, 0], 0x09);
  static HANZI = new Mode([8, 10, 12], 0x0d);
  constructor(characterCountBitsSet, bits) {
    this.#bits = bits;
    this.#characterCountBitsSet = new Int32Array(characterCountBitsSet);
    VALUES_TO_MODE.set(bits, this);
  }
  get bits() {
    return this.#bits;
  }
  getCharacterCountBits({ version }) {
    let offset;
    if (version <= 9) {
      offset = 0;
    } else if (version <= 26) {
      offset = 1;
    } else {
      offset = 2;
    }
    return this.#characterCountBitsSet[offset];
  }
}

exports.Mode = Mode;
exports.fromModeBits = fromModeBits;

},
5:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module Charset
 */
const VALUES_TO_CHARSET = new Map();
function fromCharsetValue(value) {
  const charset = VALUES_TO_CHARSET.get(value);
  if (charset != null) {
    return charset;
  }
  throw new Error('illegal charset value');
}
class Charset {
  #label;
  #values;
  // See: https://en.wikipedia.org/wiki/Extended_Channel_Interpretation
  static CP437 = new Charset('cp437', 2, 0);
  static ISO_8859_1 = new Charset('iso-8859-1', 3, 1);
  static ISO_8859_2 = new Charset('iso-8859-2', 4);
  static ISO_8859_3 = new Charset('iso-8859-3', 5);
  static ISO_8859_4 = new Charset('iso-8859-4', 6);
  static ISO_8859_5 = new Charset('iso-8859-5', 7);
  static ISO_8859_6 = new Charset('iso-8859-6', 8);
  static ISO_8859_7 = new Charset('iso-8859-7', 9);
  static ISO_8859_8 = new Charset('iso-8859-8', 10);
  static ISO_8859_9 = new Charset('iso-8859-9', 11);
  static ISO_8859_10 = new Charset('iso-8859-10', 12);
  static ISO_8859_11 = new Charset('iso-8859-11', 13);
  static ISO_8859_13 = new Charset('iso-8859-13', 15);
  static ISO_8859_14 = new Charset('iso-8859-14', 16);
  static ISO_8859_15 = new Charset('iso-8859-15', 17);
  static ISO_8859_16 = new Charset('iso-8859-16', 18);
  static SHIFT_JIS = new Charset('shift-jis', 20);
  static CP1250 = new Charset('cp1250', 21);
  static CP1251 = new Charset('cp1251', 22);
  static CP1252 = new Charset('cp1252', 23);
  static CP1256 = new Charset('cp1256', 24);
  static UTF_16BE = new Charset('utf-16be', 25);
  static UTF_8 = new Charset('utf-8', 26);
  static ASCII = new Charset('ascii', 27);
  static BIG5 = new Charset('big5', 28);
  static GB2312 = new Charset('gb2312', 29);
  static EUC_KR = new Charset('euc-kr', 30);
  static GBK = new Charset('gbk', 31);
  static GB18030 = new Charset('gb18030', 32);
  static UTF_16LE = new Charset('utf-16le', 33);
  static UTF_32BE = new Charset('utf-32be', 34);
  static UTF_32LE = new Charset('utf-32le', 35);
  static ISO_646_INV = new Charset('iso-646-inv', 170);
  static BINARY = new Charset('binary', 899);
  /**
   * @constructor
   * @param label The label of charset.
   * @param values The values of charset.
   */
  constructor(label, ...values) {
    this.#label = label;
    this.#values = Object.freeze(values);
    for (const value of values) {
      if (value >= 0 && value <= 999999 && Number.isInteger(value)) {
        VALUES_TO_CHARSET.set(value, this);
      } else {
        throw new Error('illegal extended channel interpretation value');
      }
    }
  }
  /**
   * @property label
   * @description Get the label of charset.
   */
  get label() {
    return this.#label;
  }
  /**
   * @property values
   * @description Get the values of charset.
   */
  get values() {
    return this.#values;
  }
}

exports.Charset = Charset;
exports.fromCharsetValue = fromCharsetValue;

},
6:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(7);

/**
 * @module mapping
 */
const GB2312_MAPPING = utils.getMappingFromEncodingRanges(
  'gb2312',
  [0xa1a1, 0xa1fe],
  [0xa2b1, 0xa2e2],
  [0xa2e5, 0xa2ee],
  [0xa2f1, 0xa2fc],
  [0xa3a1, 0xa3fe],
  [0xa4a1, 0xa4f3],
  [0xa5a1, 0xa5f6],
  [0xa6a1, 0xa6b8],
  [0xa6c1, 0xa6d8],
  [0xa7a1, 0xa7c1],
  [0xa7d1, 0xa7f1],
  [0xa8a1, 0xa8ba],
  [0xa8c5, 0xa8e9],
  [0xa9a4, 0xa9ef],
  ...utils.getSerialEncodinRanges(0xb0a1, 0xd6fe, [0, 93]),
  [0xd7a1, 0xd7f9],
  ...utils.getSerialEncodinRanges(0xd8a1, 0xf7fe, [0, 93])
);
const SHIFT_JIS_MAPPING = utils.getMappingFromEncodingRanges(
  'shift-jis',
  [0x8140, 0x817e],
  [0x8180, 0x81ac],
  [0x81b8, 0x81bf],
  [0x81c8, 0x81ce],
  [0x81da, 0x81e8],
  [0x81f0, 0x81f7],
  [0x81fc, 0x81fc],
  [0x824f, 0x8258],
  [0x8260, 0x8279],
  [0x8281, 0x829a],
  [0x829f, 0x82f1],
  [0x8340, 0x837e],
  [0x8380, 0x8396],
  [0x839f, 0x83b6],
  [0x83bf, 0x83d6],
  [0x8440, 0x8460],
  [0x8470, 0x847e],
  [0x8480, 0x8491],
  [0x849f, 0x84be],
  [0x889f, 0x88fc],
  ...utils.getSerialEncodinRanges(0x8940, 0x97fc, [0, 62, 64, 188]),
  [0x9840, 0x9872],
  [0x989f, 0x98fc],
  ...utils.getSerialEncodinRanges(0x9940, 0x9ffc, [0, 62, 64, 188]),
  ...utils.getSerialEncodinRanges(0xe040, 0xe9fc, [0, 62, 64, 188]),
  [0xea40, 0xea7e],
  [0xea80, 0xeaa4]
);
const NUMERIC_CHARACTERS = '0123456789';
const NUMERIC_MAPPING = utils.getMappingFromCharacters(NUMERIC_CHARACTERS);
const ALPHANUMERIC_CHARACTERS = `${NUMERIC_CHARACTERS}ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:`;
const ALPHANUMERIC_MAPPING = utils.getMappingFromCharacters(ALPHANUMERIC_CHARACTERS);

exports.ALPHANUMERIC_CHARACTERS = ALPHANUMERIC_CHARACTERS;
exports.ALPHANUMERIC_MAPPING = ALPHANUMERIC_MAPPING;
exports.GB2312_MAPPING = GB2312_MAPPING;
exports.NUMERIC_CHARACTERS = NUMERIC_CHARACTERS;
exports.NUMERIC_MAPPING = NUMERIC_MAPPING;
exports.SHIFT_JIS_MAPPING = SHIFT_JIS_MAPPING;

},
7:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module utils
 */
function getMappingFromCharacters(characters) {
  let code = 0;
  const mapping = new Map();
  for (const character of characters) {
    mapping.set(character, code++);
  }
  return mapping;
}
function getMappingFromEncodingRanges(label, ...ranges) {
  const bytes = [];
  const codes = [];
  const mapping = new Map();
  const decoder = new TextDecoder(label, { fatal: true });
  for (const [start, end] of ranges) {
    for (let code = start; code <= end; code++) {
      // Now only support two bytes characters.
      bytes.push((code >> 8) & 0xff, code & 0xff);
      // Cache the codes.
      codes.push(code);
    }
  }
  const { length } = codes;
  const characters = decoder.decode(new Uint8Array(bytes));
  for (let i = 0; i < length; i++) {
    const character = characters.charAt(i);
    if (!mapping.has(character)) {
      mapping.set(character, codes[i]);
    }
  }
  return mapping;
}
function getSerialEncodinRanges(start, end, offsets, delta = 256) {
  const count = offsets.length - 1;
  const ranges = [];
  for (let i = start; i < end; ) {
    for (let j = 0; j < count; j += 2) {
      ranges.push([i + offsets[j], i + offsets[j + 1]]);
    }
    i += delta;
  }
  return ranges;
}

exports.getMappingFromCharacters = getMappingFromCharacters;
exports.getMappingFromEncodingRanges = getMappingFromEncodingRanges;
exports.getSerialEncodinRanges = getSerialEncodinRanges;

},
8:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const mask = require(9);
const FormatInfo = require(11);
const Version = require(13);

/**
 * @module BitMatrixParser
 */
function copyBit(matrix, x, y, bits) {
  return matrix.get(x, y) ? (bits << 1) | 0x01 : bits << 1;
}
class BitMatrixParser {
  #size;
  #matrix;
  constructor(matrix) {
    const { width, height } = matrix;
    this.#matrix = matrix.clone();
    this.#size = Math.min(width, height);
  }
  readVersion() {
    const size = this.#size;
    const versionNumber = (size - 17) >>> 2;
    if (versionNumber < 1) {
      throw new Error('illegal version');
    }
    if (versionNumber <= 6) {
      return Version.VERSIONS[versionNumber - 1];
    }
    // Hmm, failed. Try bottom left: 6 wide by 3 tall.
    let version1 = 0;
    let version2 = 0;
    const min = size - 11;
    const matrix = this.#matrix;
    for (let y = 5; y >= 0; y--) {
      for (let x = size - 9; x >= min; x--) {
        version1 = copyBit(matrix, x, y, version1);
      }
    }
    for (let x = 5; x >= 0; x--) {
      for (let y = size - 9; y >= min; y--) {
        version2 = copyBit(matrix, x, y, version2);
      }
    }
    const version = Version.decodeVersion(version1, version2);
    if (version.size > size) {
      throw new Error('matrix size too small for version');
    }
    return version;
  }
  readFormatInfo() {
    let formatInfo1 = 0;
    let formatInfo2 = 0;
    const matrix = this.#matrix;
    const size = this.#size;
    const max = size - 7;
    // Read top-left format info bits.
    for (let x = 0; x <= 8; x++) {
      if (x !== 6) {
        // Skip timing pattern bit.
        formatInfo1 = copyBit(matrix, x, 8, formatInfo1);
      }
    }
    for (let y = 7; y >= 0; y--) {
      if (y !== 6) {
        // Skip timing pattern bit.
        formatInfo1 = copyBit(matrix, 8, y, formatInfo1);
      }
    }
    for (let y = size - 1; y >= max; y--) {
      formatInfo2 = copyBit(matrix, 8, y, formatInfo2);
    }
    for (let x = size - 8; x < size; x++) {
      formatInfo2 = copyBit(matrix, x, 8, formatInfo2);
    }
    return FormatInfo.decodeFormatInfo(formatInfo1, formatInfo2);
  }
  readCodewords(version, ecLevel) {
    let bitsRead = 0;
    let byteOffset = 0;
    let currentByte = 0;
    let readingUp = true;
    const size = this.#size;
    const matrix = this.#matrix;
    const ecBlocks = version.getECBlocks(ecLevel);
    const functionPattern = Version.buildFunctionPattern(version);
    const codewords = new Uint8Array(ecBlocks.numTotalCodewords);
    // Read columns in pairs, from right to left.
    for (let x = size - 1; x > 0; x -= 2) {
      if (x === 6) {
        // Skip whole column with vertical alignment pattern
        // saves time and makes the other code proceed more cleanly.
        x--;
      }
      // Read alternatingly from bottom to top then top to bottom.
      for (let count = 0; count < size; count++) {
        const y = readingUp ? size - 1 - count : count;
        for (let col = 0; col < 2; col++) {
          const offsetX = x - col;
          // Ignore bits covered by the function pattern.
          if (!functionPattern.get(offsetX, y)) {
            // Read a bit
            bitsRead++;
            currentByte <<= 1;
            if (matrix.get(offsetX, y)) {
              currentByte |= 1;
            }
            // If we've made a whole byte, save it off.
            if (bitsRead === 8) {
              codewords[byteOffset++] = currentByte;
              bitsRead = 0;
              currentByte = 0;
            }
          }
        }
      }
      // Switch directions.
      readingUp = !readingUp;
    }
    if (byteOffset !== ecBlocks.numTotalCodewords) {
      throw new Error('illegal codewords length');
    }
    return codewords;
  }
  unmask(mask$1) {
    const size = this.#size;
    const matrix = this.#matrix;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mask.isApplyMask(mask$1, x, y)) {
          matrix.flip(x, y);
        }
      }
    }
  }
  remask(mask) {
    this.unmask(mask);
  }
  mirror() {
    const size = this.#size;
    const matrix = this.#matrix;
    for (let x = 0; x < size; x++) {
      for (let y = x + 1; y < size; y++) {
        if (matrix.get(x, y) !== matrix.get(y, x)) {
          matrix.flip(x, y);
          matrix.flip(y, x);
        }
      }
    }
  }
}

exports.BitMatrixParser = BitMatrixParser;

},
9:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);

/**
 * @module mask
 */
// Penalty weights.
const N1 = 3;
const N2 = 3;
const N3 = 40;
const N4 = 10;
// Is dark point.
function isDark(matrix, x, y) {
  return matrix.get(x, y) === 1;
}
// Helper function for applyMaskPenaltyRule1. We need this for doing this calculation in both
// horizontal and vertical orders respectively.
function applyMaskPenaltyRule1Internal(matrix, isVertical) {
  let penalty = 0;
  const { size } = matrix;
  for (let y = 0; y < size; y++) {
    let prevBit = -1;
    let numSameBitCells = 0;
    for (let x = 0; x < size; x++) {
      const bit = isVertical ? matrix.get(y, x) : matrix.get(x, y);
      if (bit === prevBit) {
        numSameBitCells++;
      } else {
        if (numSameBitCells >= 5) {
          penalty += N1 + (numSameBitCells - 5);
        }
        // set prev bit.
        prevBit = bit;
        // include the cell itself.
        numSameBitCells = 1;
      }
    }
    if (numSameBitCells >= 5) {
      penalty += N1 + (numSameBitCells - 5);
    }
  }
  return penalty;
}
// Apply mask penalty rule 1 and return the penalty. Find repetitive cells with the same color and
// give penalty to them. Example: 00000 or 11111.
function applyMaskPenaltyRule1(matrix) {
  return applyMaskPenaltyRule1Internal(matrix) + applyMaskPenaltyRule1Internal(matrix, true);
}
// Apply mask penalty rule 2 and return the penalty. Find 2x2 blocks with the same color and give
// penalty to them. This is actually equivalent to the spec's rule, which is to find MxN blocks and give a
// penalty proportional to (M-1)x(N-1), because this is the number of 2x2 blocks inside such a block.
function applyMaskPenaltyRule2(matrix) {
  let penalty = 0;
  const size = matrix.size - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const bit = matrix.get(x, y);
      if (
        // Find 2x2 blocks with the same color.
        bit === matrix.get(x + 1, y) &&
        bit === matrix.get(x, y + 1) &&
        bit === matrix.get(x + 1, y + 1)
      ) {
        penalty += N2;
      }
    }
  }
  return penalty;
}
// Is is four white, check on horizontal and vertical.
function isFourWhite(matrix, offset, from, to, isVertical) {
  if (from < 0 || to > matrix.size) {
    return false;
  }
  for (let i = from; i < to; i++) {
    if (isVertical ? isDark(matrix, offset, i) : isDark(matrix, i, offset)) {
      return false;
    }
  }
  return true;
}
// Apply mask penalty rule 3 and return the penalty. Find consecutive runs of 1:1:3:1:1:4
// starting with black, or 4:1:1:3:1:1 starting with white, and give penalty to them. If we
// find patterns like 000010111010000, we give penalty once.
function applyMaskPenaltyRule3(matrix) {
  let numPenalties = 0;
  const { size } = matrix;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (
        // Find consecutive runs of 1:1:3:1:1:4 or 4:1:1:3:1:1, patterns like 000010111010000.
        x + 6 < size &&
        isDark(matrix, x, y) &&
        !isDark(matrix, x + 1, y) &&
        isDark(matrix, x + 2, y) &&
        isDark(matrix, x + 3, y) &&
        isDark(matrix, x + 4, y) &&
        !isDark(matrix, x + 5, y) &&
        isDark(matrix, x + 6, y) &&
        (isFourWhite(matrix, y, x - 4, x) || isFourWhite(matrix, y, x + 7, x + 11))
      ) {
        numPenalties++;
      }
      if (
        // Find consecutive runs of 1:1:3:1:1:4 or 4:1:1:3:1:1, patterns like 000010111010000.
        y + 6 < size &&
        isDark(matrix, x, y) &&
        !isDark(matrix, x, y + 1) &&
        isDark(matrix, x, y + 2) &&
        isDark(matrix, x, y + 3) &&
        isDark(matrix, x, y + 4) &&
        !isDark(matrix, x, y + 5) &&
        isDark(matrix, x, y + 6) &&
        (isFourWhite(matrix, x, y - 4, y, true) || isFourWhite(matrix, x, y + 7, y + 11, true))
      ) {
        numPenalties++;
      }
    }
  }
  return numPenalties * N3;
}
// Apply mask penalty rule 4 and return the penalty. Calculate the ratio of dark cells and give
// penalty if the ratio is far from 50%. It gives 10 penalty for 5% distance.
function applyMaskPenaltyRule4(matrix) {
  let numDarkCells = 0;
  const { size } = matrix;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isDark(matrix, x, y)) {
        numDarkCells++;
      }
    }
  }
  const numTotalCells = size * size;
  const fivePercentVariances = utils.toInt32((Math.abs(numDarkCells * 2 - numTotalCells) * 10) / numTotalCells);
  return fivePercentVariances * N4;
}
// The mask penalty calculation is complicated. See Table 11 of ISO/IEC 18004:2015(E)(p.54) for details.
// Basically it applies four rules and summate all penalties.
function calculateMaskPenalty(matrix) {
  return (
    applyMaskPenaltyRule1(matrix) +
    applyMaskPenaltyRule2(matrix) +
    applyMaskPenaltyRule3(matrix) +
    applyMaskPenaltyRule4(matrix)
  );
}
// Return is apply mask at "x" and "y". See 7.8 of ISO/IEC 18004:2015(E)(p.50) for mask pattern conditions.
function isApplyMask(mask, x, y) {
  let temporary;
  let intermediate;
  switch (mask) {
    case 0:
      intermediate = (y + x) & 0x01;
      break;
    case 1:
      intermediate = y & 0x01;
      break;
    case 2:
      intermediate = x % 3;
      break;
    case 3:
      intermediate = (y + x) % 3;
      break;
    case 4:
      intermediate = (utils.toInt32(y / 2) + utils.toInt32(x / 3)) & 0x01;
      break;
    case 5:
      temporary = y * x;
      intermediate = (temporary & 0x01) + (temporary % 3);
      break;
    case 6:
      temporary = y * x;
      intermediate = ((temporary & 0x01) + (temporary % 3)) & 0x01;
      break;
    case 7:
      intermediate = (((y * x) % 3) + ((y + x) & 0x01)) & 0x01;
      break;
    default:
      throw new Error(`illegal mask: ${mask}`);
  }
  return intermediate === 0;
}

exports.calculateMaskPenalty = calculateMaskPenalty;
exports.isApplyMask = isApplyMask;

},
10:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module utils
 */
function toBit(value) {
  return value & 0x01;
}
function toInt32(value) {
  return value | 0;
}
function round(value) {
  return (value + (value < 0 ? -0.5 : 0.5)) | 0;
}
function getBitMask(value) {
  return 1 << getBitOffset(value);
}
function getBitOffset(value) {
  return value & 0x1f;
}
// Get hamming weight of int32.
function hammingWeight(value) {
  // HD, Figure 5-2.
  value = value - ((value >> 1) & 0x55555555);
  value = (value & 0x33333333) + ((value >> 2) & 0x33333333);
  return (((value + (value >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}
// Return the position of the most significant bit set (to one) in the "value". The most
// significant bit is position 32. If there is no bit set, return 0. Examples:
// - findMSBSet(0) => 0
// - findMSBSet(1) => 1
// - findMSBSet(255) => 8
function findMSBSet(value) {
  return 32 - Math.clz32(value);
}
// Calculate BCH (Bose-Chaudhuri-Hocquenghem) code for "value" using polynomial "poly". The BCH
// code is used for encoding type information and version information.
// Example: Calculation of version information of 7.
// f(x) is created from 7.
//   - 7 = 000111 in 6 bits
//   - f(x) = x^2 + x^1 + x^0
// g(x) is given by the standard (p. 67)
//   - g(x) = x^12 + x^11 + x^10 + x^9 + x^8 + x^5 + x^2 + 1
// Multiply f(x) by x^(18 - 6)
//   - f'(x) = f(x) * x^(18 - 6)
//   - f'(x) = x^14 + x^13 + x^12
// Calculate the remainder of f'(x) / g(x)
//         x^2
//         __________________________________________________
//   g(x) )x^14 + x^13 + x^12
//         x^14 + x^13 + x^12 + x^11 + x^10 + x^7 + x^4 + x^2
//         --------------------------------------------------
//                              x^11 + x^10 + x^7 + x^4 + x^2
//
// The remainder is x^11 + x^10 + x^7 + x^4 + x^2
// Encode it in binary: 110010010100
// The return value is 0xc94 (1100 1001 0100)
//
// Since all coefficients in the polynomials are 1 or 0, we can do the calculation by bit
// operations. We don't care if coefficients are positive or negative.
function calculateBCHCode(value, poly) {
  // If poly is "1 1111 0010 0101" (version info poly), msbSetInPoly is 13. We'll subtract 1
  // from 13 to make it 12.
  const msbSetInPoly = findMSBSet(poly);
  value <<= msbSetInPoly - 1;
  // Do the division business using exclusive-or operations.
  while (findMSBSet(value) >= msbSetInPoly) {
    value ^= poly << (findMSBSet(value) - msbSetInPoly);
  }
  // Now the "value" is the remainder (i.e. the BCH code).
  return value;
}
function accumulate(array, start = 0, end = array.length) {
  let total = 0;
  for (let i = start; i < end; i++) {
    total += array[i];
  }
  return total;
}

exports.accumulate = accumulate;
exports.calculateBCHCode = calculateBCHCode;
exports.findMSBSet = findMSBSet;
exports.getBitMask = getBitMask;
exports.getBitOffset = getBitOffset;
exports.hammingWeight = hammingWeight;
exports.round = round;
exports.toBit = toBit;
exports.toInt32 = toInt32;

},
11:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);
const ECLevel = require(12);

/**
 * @module FormatInfo
 */
const FORMAT_INFO_DECODE_TABLE = [
  [0x5412, 0x00],
  [0x5125, 0x01],
  [0x5e7c, 0x02],
  [0x5b4b, 0x03],
  [0x45f9, 0x04],
  [0x40ce, 0x05],
  [0x4f97, 0x06],
  [0x4aa0, 0x07],
  [0x77c4, 0x08],
  [0x72f3, 0x09],
  [0x7daa, 0x0a],
  [0x789d, 0x0b],
  [0x662f, 0x0c],
  [0x6318, 0x0d],
  [0x6c41, 0x0e],
  [0x6976, 0x0f],
  [0x1689, 0x10],
  [0x13be, 0x11],
  [0x1ce7, 0x12],
  [0x19d0, 0x13],
  [0x0762, 0x14],
  [0x0255, 0x15],
  [0x0d0c, 0x16],
  [0x083b, 0x17],
  [0x355f, 0x18],
  [0x3068, 0x19],
  [0x3f31, 0x1a],
  [0x3a06, 0x1b],
  [0x24b4, 0x1c],
  [0x2183, 0x1d],
  [0x2eda, 0x1e],
  [0x2bed, 0x1f]
];
class FormatInfo {
  #mask;
  #level;
  constructor(formatInfo) {
    this.#mask = formatInfo & 0x07;
    this.#level = ECLevel.fromECLevelBits((formatInfo >> 3) & 0x03);
  }
  get mask() {
    return this.#mask;
  }
  get level() {
    return this.#level;
  }
}
function decodeFormatInfo(formatInfo1, formatInfo2) {
  // Find the int in FORMAT_INFO_DECODE_TABLE with fewest bits differing.
  let bestDiff = 32;
  let bestFormatInfo = 0;
  for (const [maskedFormatInfo, formatInfo] of FORMAT_INFO_DECODE_TABLE) {
    if (formatInfo1 === maskedFormatInfo || formatInfo2 === maskedFormatInfo) {
      // Found an exact match.
      return new FormatInfo(formatInfo);
    }
    let bitsDiff = utils.hammingWeight(formatInfo1 ^ maskedFormatInfo);
    if (bitsDiff < bestDiff) {
      bestDiff = bitsDiff;
      bestFormatInfo = formatInfo;
    }
    if (formatInfo1 !== formatInfo2) {
      // Also try the other option.
      bitsDiff = utils.hammingWeight(formatInfo2 ^ maskedFormatInfo);
      if (bitsDiff < bestDiff) {
        bestDiff = bitsDiff;
        bestFormatInfo = formatInfo;
      }
    }
  }
  // Hamming distance of the 32 masked codes is 7, by construction, so <= 3 bits differing means we found a match.
  if (bestDiff <= 3) {
    return new FormatInfo(bestFormatInfo);
  }
  throw new Error('unable to decode format information');
}

exports.FormatInfo = FormatInfo;
exports.decodeFormatInfo = decodeFormatInfo;

},
12:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module ECLevel
 */
const VALUES_TO_ECLEVEL = new Map();
function fromECLevelBits(bits) {
  const ecLevel = VALUES_TO_ECLEVEL.get(bits);
  if (ecLevel != null) {
    return ecLevel;
  }
  throw new Error('illegal error correction bits');
}
class ECLevel {
  #bits;
  #level;
  #name;
  // L = ~7% correction.
  static L = new ECLevel('L' /* Level.L */, 0, 0x01);
  // M = ~15% correction.
  static M = new ECLevel('M' /* Level.M */, 1, 0x00);
  // Q = ~25% correction.
  static Q = new ECLevel('Q' /* Level.Q */, 2, 0x03);
  // H = ~30% correction.
  static H = new ECLevel('H' /* Level.H */, 3, 0x02);
  constructor(name, level, bits) {
    this.#bits = bits;
    this.#name = name;
    this.#level = level;
    VALUES_TO_ECLEVEL.set(bits, this);
  }
  get bits() {
    return this.#bits;
  }
  get level() {
    return this.#level;
  }
  get name() {
    return this.#name;
  }
}

exports.ECLevel = ECLevel;
exports.fromECLevelBits = fromECLevelBits;

},
13:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const ECB = require(14);
const ECBlocks = require(15);
const BitMatrix = require(16);
const utils = require(10);

/**
 * @module Version
 */
const MIN_VERSION_SIZE = 21;
const MAX_VERSION_SIZE = 177;
const VERSION_DECODE_TABLE = [
  // Version 7 - 11.
  0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6,
  // Version 12 - 16.
  0x0c762, 0x0d847, 0x0e60d, 0x0f928, 0x10b78,
  // Version 17 - 21.
  0x1145d, 0x12a17, 0x13532, 0x149a6, 0x15683,
  // Version 22 - 26.
  0x168c9, 0x177ec, 0x18ec4, 0x191e1, 0x1afab,
  // Version 27 - 31.
  0x1b08e, 0x1cc1a, 0x1d33f, 0x1ed75, 0x1f250,
  // Version 32 - 36.
  0x209d5, 0x216f0, 0x228ba, 0x2379f, 0x24b0b,
  // Version 37 - 40.
  0x2542e, 0x26a64, 0x27541, 0x28c69
];
// Version > 2 has alignment patterns.
const MIN_VERSION_SIZE_WITH_ALIGNMENTS = 25;
class Version {
  #size;
  #version;
  #ecBlocks;
  #alignmentPatterns;
  constructor(version, alignmentPatterns, ...ecBlocks) {
    this.#version = version;
    this.#ecBlocks = ecBlocks;
    this.#size = 17 + 4 * version;
    this.#alignmentPatterns = alignmentPatterns;
  }
  get size() {
    return this.#size;
  }
  get version() {
    return this.#version;
  }
  get alignmentPatterns() {
    return this.#alignmentPatterns;
  }
  getECBlocks({ level }) {
    return this.#ecBlocks[level];
  }
}
const VERSIONS = [
  new Version(
    1,
    [],
    new ECBlocks.ECBlocks(7, new ECB.ECB(1, 19)),
    new ECBlocks.ECBlocks(10, new ECB.ECB(1, 16)),
    new ECBlocks.ECBlocks(13, new ECB.ECB(1, 13)),
    new ECBlocks.ECBlocks(17, new ECB.ECB(1, 9))
  ),
  new Version(
    2,
    [6, 18],
    new ECBlocks.ECBlocks(10, new ECB.ECB(1, 34)),
    new ECBlocks.ECBlocks(16, new ECB.ECB(1, 28)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(1, 22)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(1, 16))
  ),
  new Version(
    3,
    [6, 22],
    new ECBlocks.ECBlocks(15, new ECB.ECB(1, 55)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(1, 44)),
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 17)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(2, 13))
  ),
  new Version(
    4,
    [6, 26],
    new ECBlocks.ECBlocks(20, new ECB.ECB(1, 80)),
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 32)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(2, 24)),
    new ECBlocks.ECBlocks(16, new ECB.ECB(4, 9))
  ),
  new Version(
    5,
    [6, 30],
    new ECBlocks.ECBlocks(26, new ECB.ECB(1, 108)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(2, 43)),
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 15), new ECB.ECB(2, 16)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(2, 11), new ECB.ECB(2, 12))
  ),
  new Version(
    6,
    [6, 34],
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 68)),
    new ECBlocks.ECBlocks(16, new ECB.ECB(4, 27)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(4, 19)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(4, 15))
  ),
  new Version(
    7,
    [6, 22, 38],
    new ECBlocks.ECBlocks(20, new ECB.ECB(2, 78)),
    new ECBlocks.ECBlocks(18, new ECB.ECB(4, 31)),
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 14), new ECB.ECB(4, 15)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(4, 13), new ECB.ECB(1, 14))
  ),
  new Version(
    8,
    [6, 24, 42],
    new ECBlocks.ECBlocks(24, new ECB.ECB(2, 97)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(2, 38), new ECB.ECB(2, 39)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(4, 18), new ECB.ECB(2, 19)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(4, 14), new ECB.ECB(2, 15))
  ),
  new Version(
    9,
    [6, 26, 46],
    new ECBlocks.ECBlocks(30, new ECB.ECB(2, 116)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(3, 36), new ECB.ECB(2, 37)),
    new ECBlocks.ECBlocks(20, new ECB.ECB(4, 16), new ECB.ECB(4, 17)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(4, 12), new ECB.ECB(4, 13))
  ),
  new Version(
    10,
    [6, 28, 50],
    new ECBlocks.ECBlocks(18, new ECB.ECB(2, 68), new ECB.ECB(2, 69)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(4, 43), new ECB.ECB(1, 44)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(6, 19), new ECB.ECB(2, 20)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(6, 15), new ECB.ECB(2, 16))
  ),
  new Version(
    11,
    [6, 30, 54],
    new ECBlocks.ECBlocks(20, new ECB.ECB(4, 81)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(1, 50), new ECB.ECB(4, 51)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(4, 22), new ECB.ECB(4, 23)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(3, 12), new ECB.ECB(8, 13))
  ),
  new Version(
    12,
    [6, 32, 58],
    new ECBlocks.ECBlocks(24, new ECB.ECB(2, 92), new ECB.ECB(2, 93)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(6, 36), new ECB.ECB(2, 37)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(4, 20), new ECB.ECB(6, 21)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(7, 14), new ECB.ECB(4, 15))
  ),
  new Version(
    13,
    [6, 34, 62],
    new ECBlocks.ECBlocks(26, new ECB.ECB(4, 107)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(8, 37), new ECB.ECB(1, 38)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(8, 20), new ECB.ECB(4, 21)),
    new ECBlocks.ECBlocks(22, new ECB.ECB(12, 11), new ECB.ECB(4, 12))
  ),
  new Version(
    14,
    [6, 26, 46, 66],
    new ECBlocks.ECBlocks(30, new ECB.ECB(3, 115), new ECB.ECB(1, 116)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(4, 40), new ECB.ECB(5, 41)),
    new ECBlocks.ECBlocks(20, new ECB.ECB(11, 16), new ECB.ECB(5, 17)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(11, 12), new ECB.ECB(5, 13))
  ),
  new Version(
    15,
    [6, 26, 48, 70],
    new ECBlocks.ECBlocks(22, new ECB.ECB(5, 87), new ECB.ECB(1, 88)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(5, 41), new ECB.ECB(5, 42)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(5, 24), new ECB.ECB(7, 25)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(11, 12), new ECB.ECB(7, 13))
  ),
  new Version(
    16,
    [6, 26, 50, 74],
    new ECBlocks.ECBlocks(24, new ECB.ECB(5, 98), new ECB.ECB(1, 99)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(7, 45), new ECB.ECB(3, 46)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(15, 19), new ECB.ECB(2, 20)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(3, 15), new ECB.ECB(13, 16))
  ),
  new Version(
    17,
    [6, 30, 54, 78],
    new ECBlocks.ECBlocks(28, new ECB.ECB(1, 107), new ECB.ECB(5, 108)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(10, 46), new ECB.ECB(1, 47)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(1, 22), new ECB.ECB(15, 23)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(2, 14), new ECB.ECB(17, 15))
  ),
  new Version(
    18,
    [6, 30, 56, 82],
    new ECBlocks.ECBlocks(30, new ECB.ECB(5, 120), new ECB.ECB(1, 121)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(9, 43), new ECB.ECB(4, 44)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(17, 22), new ECB.ECB(1, 23)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(2, 14), new ECB.ECB(19, 15))
  ),
  new Version(
    19,
    [6, 30, 58, 86],
    new ECBlocks.ECBlocks(28, new ECB.ECB(3, 113), new ECB.ECB(4, 114)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(3, 44), new ECB.ECB(11, 45)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(17, 21), new ECB.ECB(4, 22)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(9, 13), new ECB.ECB(16, 14))
  ),
  new Version(
    20,
    [6, 34, 62, 90],
    new ECBlocks.ECBlocks(28, new ECB.ECB(3, 107), new ECB.ECB(5, 108)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(3, 41), new ECB.ECB(13, 42)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(15, 24), new ECB.ECB(5, 25)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(15, 15), new ECB.ECB(10, 16))
  ),
  new Version(
    21,
    [6, 28, 50, 72, 94],
    new ECBlocks.ECBlocks(28, new ECB.ECB(4, 116), new ECB.ECB(4, 117)),
    new ECBlocks.ECBlocks(26, new ECB.ECB(17, 42)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(17, 22), new ECB.ECB(6, 23)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(19, 16), new ECB.ECB(6, 17))
  ),
  new Version(
    22,
    [6, 26, 50, 74, 98],
    new ECBlocks.ECBlocks(28, new ECB.ECB(2, 111), new ECB.ECB(7, 112)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(17, 46)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(7, 24), new ECB.ECB(16, 25)),
    new ECBlocks.ECBlocks(24, new ECB.ECB(34, 13))
  ),
  new Version(
    23,
    [6, 30, 54, 78, 102],
    new ECBlocks.ECBlocks(30, new ECB.ECB(4, 121), new ECB.ECB(5, 122)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(4, 47), new ECB.ECB(14, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(11, 24), new ECB.ECB(14, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(16, 15), new ECB.ECB(14, 16))
  ),
  new Version(
    24,
    [6, 28, 54, 80, 106],
    new ECBlocks.ECBlocks(30, new ECB.ECB(6, 117), new ECB.ECB(4, 118)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(6, 45), new ECB.ECB(14, 46)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(11, 24), new ECB.ECB(16, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(30, 16), new ECB.ECB(2, 17))
  ),
  new Version(
    25,
    [6, 32, 58, 84, 110],
    new ECBlocks.ECBlocks(26, new ECB.ECB(8, 106), new ECB.ECB(4, 107)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(8, 47), new ECB.ECB(13, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(7, 24), new ECB.ECB(22, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(22, 15), new ECB.ECB(13, 16))
  ),
  new Version(
    26,
    [6, 30, 58, 86, 114],
    new ECBlocks.ECBlocks(28, new ECB.ECB(10, 114), new ECB.ECB(2, 115)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(19, 46), new ECB.ECB(4, 47)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(28, 22), new ECB.ECB(6, 23)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(33, 16), new ECB.ECB(4, 17))
  ),
  new Version(
    27,
    [6, 34, 62, 90, 118],
    new ECBlocks.ECBlocks(30, new ECB.ECB(8, 122), new ECB.ECB(4, 123)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(22, 45), new ECB.ECB(3, 46)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(8, 23), new ECB.ECB(26, 24)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(12, 15), new ECB.ECB(28, 16))
  ),
  new Version(
    28,
    [6, 26, 50, 74, 98, 122],
    new ECBlocks.ECBlocks(30, new ECB.ECB(3, 117), new ECB.ECB(10, 118)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(3, 45), new ECB.ECB(23, 46)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(4, 24), new ECB.ECB(31, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(11, 15), new ECB.ECB(31, 16))
  ),
  new Version(
    29,
    [6, 30, 54, 78, 102, 126],
    new ECBlocks.ECBlocks(30, new ECB.ECB(7, 116), new ECB.ECB(7, 117)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(21, 45), new ECB.ECB(7, 46)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(1, 23), new ECB.ECB(37, 24)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(19, 15), new ECB.ECB(26, 16))
  ),
  new Version(
    30,
    [6, 26, 52, 78, 104, 130],
    new ECBlocks.ECBlocks(30, new ECB.ECB(5, 115), new ECB.ECB(10, 116)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(19, 47), new ECB.ECB(10, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(15, 24), new ECB.ECB(25, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(23, 15), new ECB.ECB(25, 16))
  ),
  new Version(
    31,
    [6, 30, 56, 82, 108, 134],
    new ECBlocks.ECBlocks(30, new ECB.ECB(13, 115), new ECB.ECB(3, 116)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(2, 46), new ECB.ECB(29, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(42, 24), new ECB.ECB(1, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(23, 15), new ECB.ECB(28, 16))
  ),
  new Version(
    32,
    [6, 34, 60, 86, 112, 138],
    new ECBlocks.ECBlocks(30, new ECB.ECB(17, 115)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(10, 46), new ECB.ECB(23, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(10, 24), new ECB.ECB(35, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(19, 15), new ECB.ECB(35, 16))
  ),
  new Version(
    33,
    [6, 30, 58, 86, 114, 142],
    new ECBlocks.ECBlocks(30, new ECB.ECB(17, 115), new ECB.ECB(1, 116)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(14, 46), new ECB.ECB(21, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(29, 24), new ECB.ECB(19, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(11, 15), new ECB.ECB(46, 16))
  ),
  new Version(
    34,
    [6, 34, 62, 90, 118, 146],
    new ECBlocks.ECBlocks(30, new ECB.ECB(13, 115), new ECB.ECB(6, 116)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(14, 46), new ECB.ECB(23, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(44, 24), new ECB.ECB(7, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(59, 16), new ECB.ECB(1, 17))
  ),
  new Version(
    35,
    [6, 30, 54, 78, 102, 126, 150],
    new ECBlocks.ECBlocks(30, new ECB.ECB(12, 121), new ECB.ECB(7, 122)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(12, 47), new ECB.ECB(26, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(39, 24), new ECB.ECB(14, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(22, 15), new ECB.ECB(41, 16))
  ),
  new Version(
    36,
    [6, 24, 50, 76, 102, 128, 154],
    new ECBlocks.ECBlocks(30, new ECB.ECB(6, 121), new ECB.ECB(14, 122)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(6, 47), new ECB.ECB(34, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(46, 24), new ECB.ECB(10, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(2, 15), new ECB.ECB(64, 16))
  ),
  new Version(
    37,
    [6, 28, 54, 80, 106, 132, 158],
    new ECBlocks.ECBlocks(30, new ECB.ECB(17, 122), new ECB.ECB(4, 123)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(29, 46), new ECB.ECB(14, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(49, 24), new ECB.ECB(10, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(24, 15), new ECB.ECB(46, 16))
  ),
  new Version(
    38,
    [6, 32, 58, 84, 110, 136, 162],
    new ECBlocks.ECBlocks(30, new ECB.ECB(4, 122), new ECB.ECB(18, 123)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(13, 46), new ECB.ECB(32, 47)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(48, 24), new ECB.ECB(14, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(42, 15), new ECB.ECB(32, 16))
  ),
  new Version(
    39,
    [6, 26, 54, 82, 110, 138, 166],
    new ECBlocks.ECBlocks(30, new ECB.ECB(20, 117), new ECB.ECB(4, 118)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(40, 47), new ECB.ECB(7, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(43, 24), new ECB.ECB(22, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(10, 15), new ECB.ECB(67, 16))
  ),
  new Version(
    40,
    [6, 30, 58, 86, 114, 142, 170],
    new ECBlocks.ECBlocks(30, new ECB.ECB(19, 118), new ECB.ECB(6, 119)),
    new ECBlocks.ECBlocks(28, new ECB.ECB(18, 47), new ECB.ECB(31, 48)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(34, 24), new ECB.ECB(34, 25)),
    new ECBlocks.ECBlocks(30, new ECB.ECB(20, 15), new ECB.ECB(61, 16))
  )
];
function decodeVersion(version1, version2) {
  let bestDiff = 32;
  let bestVersion = 0;
  const { length } = VERSION_DECODE_TABLE;
  for (let i = 0; i < length; i++) {
    const maskedVersion = VERSION_DECODE_TABLE[i];
    // Do the version info bits match exactly done?
    if (version1 === maskedVersion || version2 === maskedVersion) {
      return VERSIONS[i + 6];
    }
    // Otherwise see if this is the closest to a real version info bit string we have seen so far.
    let bitsDiff = utils.hammingWeight(version1 ^ maskedVersion);
    if (bitsDiff < bestDiff) {
      bestDiff = bitsDiff;
      bestVersion = i + 7;
    }
    if (version1 !== version2) {
      // Also try the other option.
      bitsDiff = utils.hammingWeight(version2 ^ maskedVersion);
      if (bitsDiff < bestDiff) {
        bestDiff = bitsDiff;
        bestVersion = i + 7;
      }
    }
  }
  // We can tolerate up to 3 bits of error since no two version info codewords will differ in less than 8 bits.
  if (bestDiff <= 3 && bestVersion >= 7) {
    return VERSIONS[bestVersion - 1];
  }
  // If we didn't find a close enough match, fail.
  throw new Error('unable to decode version');
}
// See ISO 18004:2006 Annex E
function buildFunctionPattern({ size, version, alignmentPatterns }) {
  // Alignment patterns
  const { length } = alignmentPatterns;
  const matrix = new BitMatrix.BitMatrix(size);
  const max = length - 1;
  // Top left finder pattern + separator + format.
  matrix.setRegion(0, 0, 9, 9);
  // Top right finder pattern + separator + format.
  matrix.setRegion(size - 8, 0, 8, 9);
  // Bottom left finder pattern + separator + format.
  matrix.setRegion(0, size - 8, 9, 8);
  for (let x = 0; x < length; x++) {
    const top = alignmentPatterns[x] - 2;
    for (let y = 0; y < length; y++) {
      if ((x !== 0 || (y !== 0 && y !== max)) && (x !== max || y !== 0)) {
        matrix.setRegion(alignmentPatterns[y] - 2, top, 5, 5);
      }
      // Else no o alignment patterns near the three finder patterns.
    }
  }
  // Vertical timing pattern.
  matrix.setRegion(6, 9, 1, size - 17);
  // Horizontal timing pattern.
  matrix.setRegion(9, 6, size - 17, 1);
  if (version > 6) {
    // Version info, top right.
    matrix.setRegion(size - 11, 0, 3, 6);
    // Version info, bottom left.
    matrix.setRegion(0, size - 11, 6, 3);
  }
  return matrix;
}

exports.MAX_VERSION_SIZE = MAX_VERSION_SIZE;
exports.MIN_VERSION_SIZE = MIN_VERSION_SIZE;
exports.MIN_VERSION_SIZE_WITH_ALIGNMENTS = MIN_VERSION_SIZE_WITH_ALIGNMENTS;
exports.VERSIONS = VERSIONS;
exports.Version = Version;
exports.buildFunctionPattern = buildFunctionPattern;
exports.decodeVersion = decodeVersion;

},
14:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module ECB
 */
class ECB {
  #count;
  #numDataCodewords;
  constructor(count, numDataCodewords) {
    this.#count = count;
    this.#numDataCodewords = numDataCodewords;
  }
  get count() {
    return this.#count;
  }
  get numDataCodewords() {
    return this.#numDataCodewords;
  }
}

exports.ECB = ECB;

},
15:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module ECBlocks
 */
class ECBlocks {
  #ecBlocks;
  #numTotalCodewords;
  #numTotalECCodewords;
  #numTotalDataCodewords;
  #numECCodewordsPerBlock;
  constructor(numECCodewordsPerBlock, ...ecBlocks) {
    let numBlocks = 0;
    let numTotalDataCodewords = 0;
    for (const { count, numDataCodewords } of ecBlocks) {
      numBlocks += count;
      numTotalDataCodewords += numDataCodewords * count;
    }
    const numTotalECCodewords = numECCodewordsPerBlock * numBlocks;
    this.#ecBlocks = ecBlocks;
    this.#numTotalECCodewords = numTotalECCodewords;
    this.#numTotalDataCodewords = numTotalDataCodewords;
    this.#numECCodewordsPerBlock = numECCodewordsPerBlock;
    this.#numTotalCodewords = numTotalDataCodewords + numTotalECCodewords;
  }
  get ecBlocks() {
    return this.#ecBlocks;
  }
  get numTotalCodewords() {
    return this.#numTotalCodewords;
  }
  get numTotalECCodewords() {
    return this.#numTotalECCodewords;
  }
  get numTotalDataCodewords() {
    return this.#numTotalDataCodewords;
  }
  get numECCodewordsPerBlock() {
    return this.#numECCodewordsPerBlock;
  }
}

exports.ECBlocks = ECBlocks;

},
16:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);

/**
 * @module BitMatrix
 */
class BitMatrix {
  #width;
  #height;
  #rowSize;
  #bits;
  constructor(width, height = width) {
    const rowSize = (width + 0x1f) >>> 5;
    const bitsCapacity = rowSize * height;
    this.#width = width;
    this.#height = height;
    this.#rowSize = rowSize;
    this.#bits = new Int32Array(bitsCapacity);
  }
  #offset(x, y) {
    return y * this.#rowSize + (x >>> 5);
  }
  /**
   * @property width
   * @description The width of the matrix.
   */
  get width() {
    return this.#width;
  }
  /**
   * @property height
   * @description The height of the matrix.
   */
  get height() {
    return this.#height;
  }
  /**
   * @method set
   * @description Set the bit value to 1 of the specified coordinate.
   * @param x The x coordinate.
   * @param y The y coordinate.
   */
  set(x, y) {
    this.#bits[this.#offset(x, y)] |= utils.getBitMask(x);
  }
  /**
   * @method get
   * @description Get the bit value of the specified coordinate.
   * @param x The x coordinate.
   * @param y The y coordinate.
   */
  get(x, y) {
    return utils.toBit(this.#bits[this.#offset(x, y)] >>> utils.getBitOffset(x));
  }
  flip(x, y) {
    if (x != null && y != null) {
      this.#bits[this.#offset(x, y)] ^= utils.getBitMask(x);
    } else {
      const bits = this.#bits;
      const { length } = bits;
      for (let i = 0; i < length; i++) {
        bits[i] = ~bits[i];
      }
    }
  }
  /**
   * @method clone
   * @description Clone the bit matrix.
   */
  clone() {
    const matrix = new BitMatrix(this.#width, this.#height);
    matrix.#bits.set(this.#bits);
    return matrix;
  }
  /**
   * @method setRegion
   * @description Set the bit value to 1 of the specified region.
   * @param left The left coordinate.
   * @param top The top coordinate.
   * @param width The width to set.
   * @param height The height to set.
   */
  setRegion(left, top, width, height) {
    const bits = this.#bits;
    const right = left + width;
    const bottom = top + height;
    const rowSize = this.#rowSize;
    for (let y = top; y < bottom; y++) {
      const offset = y * rowSize;
      for (let x = left; x < right; x++) {
        bits[offset + (x >>> 5)] |= utils.getBitMask(x);
      }
    }
  }
}

exports.BitMatrix = BitMatrix;

},
17:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const DataBlock = require(18);
const Decoder = require(19);

/**
 * @module decoder
 */
function correctErrors(codewords, numDataCodewords) {
  const buffer = new Int32Array(codewords);
  const numECCodewords = codewords.length - numDataCodewords;
  // Reed solomon encode.
  const errorsCorrected = new Decoder.Decoder().decode(buffer, numECCodewords);
  return [buffer, errorsCorrected];
}
function getDataBlocks(codewords, version, ecLevel) {
  const { ecBlocks, numTotalCodewords, numECCodewordsPerBlock } = version.getECBlocks(ecLevel);
  if (codewords.length !== numTotalCodewords) {
    throw new Error('failed to get data blocks');
  }
  const blocks = [];
  // Now establish DataBlocks of the appropriate size and number of data codewords.
  for (const { count, numDataCodewords } of ecBlocks) {
    for (let i = 0; i < count; i++) {
      const numBlockCodewords = numECCodewordsPerBlock + numDataCodewords;
      blocks.push(new DataBlock.DataBlock(new Uint8Array(numBlockCodewords), numDataCodewords));
    }
  }
  const { length } = blocks;
  // All blocks have the same amount of data, except that the last n
  // (where n may be 0) have 1 more byte. Figure out where these start.
  let longerBlocksStartAt = length - 1;
  const shorterBlocksTotalCodewords = blocks[0].codewords.length;
  while (longerBlocksStartAt >= 0) {
    const numCodewords = blocks[longerBlocksStartAt].codewords.length;
    if (numCodewords === shorterBlocksTotalCodewords) {
      break;
    }
    longerBlocksStartAt--;
  }
  longerBlocksStartAt++;
  // The last elements of result may be 1 element longer;
  // first fill out as many elements as all of them have.
  let codewordsOffset = 0;
  const shorterBlocksNumDataCodewords = shorterBlocksTotalCodewords - numECCodewordsPerBlock;
  for (let i = 0; i < shorterBlocksNumDataCodewords; i++) {
    for (let j = 0; j < length; j++) {
      blocks[j].codewords[i] = codewords[codewordsOffset++];
    }
  }
  // Fill out the last data block in the longer ones.
  for (let j = longerBlocksStartAt; j < length; j++) {
    blocks[j].codewords[shorterBlocksNumDataCodewords] = codewords[codewordsOffset++];
  }
  // Now add in error correction blocks.
  const max = blocks[0].codewords.length;
  for (let i = shorterBlocksNumDataCodewords; i < max; i++) {
    for (let j = 0; j < length; j++) {
      const offset = j < longerBlocksStartAt ? i : i + 1;
      blocks[j].codewords[offset] = codewords[codewordsOffset++];
    }
  }
  return blocks;
}

exports.correctErrors = correctErrors;
exports.getDataBlocks = getDataBlocks;

},
18:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module DataBlock
 */
class DataBlock {
  #codewords;
  #numDataCodewords;
  constructor(codewords, numDataCodewords) {
    this.#codewords = codewords;
    this.#numDataCodewords = numDataCodewords;
  }
  get codewords() {
    return this.#codewords;
  }
  get numDataCodewords() {
    return this.#numDataCodewords;
  }
}

exports.DataBlock = DataBlock;

},
19:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Polynomial = require(20);
const GaloisField = require(21);

/**
 * @module Decoder
 */
function runEuclideanAlgorithm(field, a, b, ecLength) {
  // Assume a's degree is >= b's.
  if (a.getDegree() < b.getDegree()) {
    [a, b] = [b, a];
  }
  let remainder = b;
  let term = field.one;
  let remainderLast = a;
  let termLast = field.zero;
  // Run Euclidean algorithm until r's degree is less than ecLength/2.
  while (2 * remainder.getDegree() >= ecLength) {
    let termLastLast = termLast;
    let remainderLastLast = remainderLast;
    termLast = term;
    remainderLast = remainder;
    // Divide remainder last last by remainder last, with quotient in quotient and remainder in remainder.
    if (remainderLast.isZero()) {
      // Oops, euclidean algorithm already terminated?
      throw new Error('remainder last was zero');
    }
    remainder = remainderLastLast;
    let quotient = field.zero;
    let remainderDegree = remainder.getDegree();
    const remainderLastDegree = remainderLast.getDegree();
    const denominatorLeadingTerm = remainderLast.getCoefficient(remainderLastDegree);
    const dltInverse = field.invert(denominatorLeadingTerm);
    while (remainderDegree >= remainderLastDegree && !remainder.isZero()) {
      const degreeDiff = remainder.getDegree() - remainderLastDegree;
      const scale = field.multiply(remainder.getCoefficient(remainderDegree), dltInverse);
      quotient = quotient.addOrSubtract(field.buildPolynomial(degreeDiff, scale));
      remainder = remainder.addOrSubtract(remainderLast.multiplyByMonomial(degreeDiff, scale));
      remainderDegree = remainder.getDegree();
    }
    term = quotient.multiply(termLast).addOrSubtract(termLastLast);
    if (remainderDegree >= remainderLastDegree) {
      throw new Error('division algorithm failed to reduce polynomial');
    }
  }
  const sigmaTildeAtZero = term.getCoefficient(0);
  if (sigmaTildeAtZero === 0) {
    throw new Error('sigma tilde(0) was zero');
  }
  const invert = field.invert(sigmaTildeAtZero);
  const sigma = term.multiply(invert);
  const omega = remainder.multiply(invert);
  return [sigma, omega];
}
function findErrorLocations(field, errorLocator) {
  // This is a direct application of Chien's search.
  const expectedErrors = errorLocator.getDegree();
  if (expectedErrors === 1) {
    // Shortcut
    return new Int32Array([errorLocator.getCoefficient(1)]);
  }
  let errors = 0;
  const { size } = field;
  const locations = new Int32Array(expectedErrors);
  for (let i = 1; i < size && errors < expectedErrors; i++) {
    if (errorLocator.evaluate(i) === 0) {
      locations[errors++] = field.invert(i);
    }
  }
  if (errors !== expectedErrors) {
    throw new Error('error locator degree does not match number of roots');
  }
  return locations;
}
function findErrorMagnitudes(field, errorEvaluator, errorLocations) {
  // This is directly applying Forney's Formula.
  const { length } = errorLocations;
  const result = new Int32Array(length);
  for (let i = 0; i < length; i++) {
    let denominator = 1;
    const invert = field.invert(errorLocations[i]);
    for (let j = 0; j < length; j++) {
      if (i !== j) {
        // denominator = field.multiply(
        //   denominator,
        //   1 ^ field.multiply(errorLocations[j], invert)
        // )
        // Above should work but fails on some Apple and Linux JDKs due to a Hotspot bug.
        // Below is a funny-looking workaround from Steven Parkes.
        const term = field.multiply(errorLocations[j], invert);
        const termPlus1 = (term & 0x01) === 0 ? term | 1 : term & -2;
        denominator = field.multiply(denominator, termPlus1);
      }
    }
    result[i] = field.multiply(errorEvaluator.evaluate(invert), field.invert(denominator));
    if (field.generator !== 0) {
      result[i] = field.multiply(result[i], invert);
    }
  }
  return result;
}
class Decoder {
  #field;
  constructor(field = GaloisField.QR_CODE_FIELD_256) {
    this.#field = field;
  }
  decode(received, ecLength) {
    let noError = true;
    const field = this.#field;
    const { generator } = field;
    const poly = new Polynomial.Polynomial(field, received);
    const syndromeCoefficients = new Int32Array(ecLength);
    for (let i = 0; i < ecLength; i++) {
      const evaluate = poly.evaluate(field.exp(i + generator));
      syndromeCoefficients[ecLength - 1 - i] = evaluate;
      if (evaluate !== 0) {
        noError = false;
      }
    }
    if (!noError) {
      const syndrome = new Polynomial.Polynomial(field, syndromeCoefficients);
      const [sigma, omega] = runEuclideanAlgorithm(field, field.buildPolynomial(ecLength, 1), syndrome, ecLength);
      const errorLocations = findErrorLocations(field, sigma);
      const errorMagnitudes = findErrorMagnitudes(field, omega, errorLocations);
      const errorLength = errorLocations.length;
      const receivedLength = received.length;
      for (let i = 0; i < errorLength; i++) {
        const position = receivedLength - 1 - field.log(errorLocations[i]);
        if (position < 0) {
          throw new Error('bad error location');
        }
        received[position] = received[position] ^ errorMagnitudes[i];
      }
      return errorLength;
    }
    return 0;
  }
}

exports.Decoder = Decoder;

},
20:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module Polynomial
 */
class Polynomial {
  #field;
  #coefficients;
  constructor(field, coefficients) {
    const { length } = coefficients;
    if (length <= 0) {
      throw new Error('polynomial coefficients cannot empty');
    }
    this.#field = field;
    if (length > 1 && coefficients[0] === 0) {
      // Leading term must be non-zero for anything except the constant polynomial "0".
      let firstNonZero = 1;
      while (firstNonZero < length && coefficients[firstNonZero] === 0) {
        firstNonZero++;
      }
      if (firstNonZero === length) {
        this.#coefficients = new Int32Array([0]);
      } else {
        const array = new Int32Array(length - firstNonZero);
        array.set(coefficients.subarray(firstNonZero));
        this.#coefficients = array;
      }
    } else {
      this.#coefficients = coefficients;
    }
  }
  get coefficients() {
    return this.#coefficients;
  }
  isZero() {
    return this.#coefficients[0] === 0;
  }
  getDegree() {
    return this.#coefficients.length - 1;
  }
  getCoefficient(degree) {
    const coefficients = this.#coefficients;
    return coefficients[coefficients.length - 1 - degree];
  }
  evaluate(a) {
    if (a === 0) {
      // Just return the x^0 coefficient.
      return this.getCoefficient(0);
    }
    let result;
    const coefficients = this.#coefficients;
    if (a === 1) {
      // Just the sum of the coefficients.
      result = 0;
      for (const coefficient of coefficients) {
        result ^= coefficient;
      }
      return result;
    }
    [result] = coefficients;
    const field = this.#field;
    const { length } = coefficients;
    for (let i = 1; i < length; i++) {
      result = field.multiply(a, result) ^ coefficients[i];
    }
    return result;
  }
  multiply(other) {
    const field = this.#field;
    const coefficients = this.#coefficients;
    const { length } = coefficients;
    if (other instanceof Polynomial) {
      if (this.isZero() || other.isZero()) {
        return field.zero;
      }
      const otherCoefficients = other.#coefficients;
      const otherLength = otherCoefficients.length;
      const product = new Int32Array(length + otherLength - 1);
      for (let i = 0; i < length; i++) {
        const coefficient = coefficients[i];
        for (let j = 0; j < otherLength; j++) {
          product[i + j] ^= field.multiply(coefficient, otherCoefficients[j]);
        }
      }
      return new Polynomial(field, product);
    }
    if (other === 0) {
      return field.zero;
    }
    if (other === 1) {
      return this;
    }
    const product = new Int32Array(length);
    for (let i = 0; i < length; i++) {
      product[i] = field.multiply(coefficients[i], other);
    }
    return new Polynomial(field, product);
  }
  multiplyByMonomial(degree, coefficient) {
    const field = this.#field;
    if (coefficient === 0) {
      return field.zero;
    }
    const coefficients = this.#coefficients;
    const { length } = coefficients;
    const product = new Int32Array(length + degree);
    for (let i = 0; i < length; i++) {
      product[i] = field.multiply(coefficients[i], coefficient);
    }
    return new Polynomial(field, product);
  }
  addOrSubtract(other) {
    if (this.isZero()) {
      return other;
    }
    if (other.isZero()) {
      return this;
    }
    let largerCoefficients = other.#coefficients;
    let largerLength = largerCoefficients.length;
    let smallerCoefficients = this.#coefficients;
    let smallerLength = smallerCoefficients.length;
    if (largerLength < smallerLength) {
      [largerLength, smallerLength] = [smallerLength, largerLength];
      [largerCoefficients, smallerCoefficients] = [smallerCoefficients, largerCoefficients];
    }
    // Diff index offset.
    const offset = largerLength - smallerLength;
    const coefficients = new Int32Array(largerLength);
    // Copy high-order terms only found in higher-degree polynomial's coefficients.
    coefficients.set(largerCoefficients.subarray(0, offset));
    for (let i = offset; i < largerLength; i++) {
      coefficients[i] = smallerCoefficients[i - offset] ^ largerCoefficients[i];
    }
    return new Polynomial(this.#field, coefficients);
  }
  divide(other) {
    const field = this.#field;
    let quotient = field.zero;
    let remainder = this;
    const denominatorLeadingTerm = other.getCoefficient(other.getDegree());
    const invertDenominatorLeadingTerm = field.invert(denominatorLeadingTerm);
    while (remainder.getDegree() >= other.getDegree() && !remainder.isZero()) {
      const remainderDegree = remainder.getDegree();
      const degreeDiff = remainderDegree - other.getDegree();
      const scale = field.multiply(remainder.getCoefficient(remainderDegree), invertDenominatorLeadingTerm);
      const term = other.multiplyByMonomial(degreeDiff, scale);
      const iterationQuotient = field.buildPolynomial(degreeDiff, scale);
      quotient = quotient.addOrSubtract(iterationQuotient);
      remainder = remainder.addOrSubtract(term);
    }
    return [quotient, remainder];
  }
}

exports.Polynomial = Polynomial;

},
21:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Polynomial = require(20);

/**
 * @module GaloisField
 */
class GaloisField {
  #size;
  #one;
  #zero;
  #generator;
  #expTable;
  #logTable;
  constructor(primitive, size, generator) {
    let x = 1;
    const expTable = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      expTable[i] = x;
      // We're assuming the generator alpha is 2.
      x *= 2;
      if (x >= size) {
        x ^= primitive;
        x &= size - 1;
      }
    }
    const logTable = new Int32Array(size);
    for (let i = 0, length = size - 1; i < length; i++) {
      logTable[expTable[i]] = i;
    }
    this.#size = size;
    this.#expTable = expTable;
    this.#logTable = logTable;
    this.#generator = generator;
    this.#one = new Polynomial.Polynomial(this, new Int32Array([1]));
    this.#zero = new Polynomial.Polynomial(this, new Int32Array([0]));
  }
  get size() {
    return this.#size;
  }
  get one() {
    return this.#one;
  }
  get zero() {
    return this.#zero;
  }
  get generator() {
    return this.#generator;
  }
  exp(a) {
    return this.#expTable[a];
  }
  log(a) {
    return this.#logTable[a];
  }
  invert(a) {
    return this.#expTable[this.#size - this.#logTable[a] - 1];
  }
  multiply(a, b) {
    if (a === 0 || b === 0) {
      return 0;
    }
    const logTable = this.#logTable;
    return this.#expTable[(logTable[a] + logTable[b]) % (this.#size - 1)];
  }
  buildPolynomial(degree, coefficient) {
    if (coefficient === 0) {
      return this.#zero;
    }
    const coefficients = new Int32Array(degree + 1);
    coefficients[0] = coefficient;
    return new Polynomial.Polynomial(this, coefficients);
  }
}
const QR_CODE_FIELD_256 = new GaloisField(0x011d, 256, 0);

exports.GaloisField = GaloisField;
exports.QR_CODE_FIELD_256 = QR_CODE_FIELD_256;

},
22:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Charset = require(5);

/**
 * @module index
 */
function getUnicodeCodes(content, maxCode) {
  const bytes = [];
  for (const character of content) {
    const code = character.codePointAt(0);
    // If gt max code, push "?".
    bytes.push(code == null || code > maxCode ? 63 : code);
  }
  return new Uint8Array(bytes);
}
function encode(content, charset) {
  switch (charset) {
    case Charset.Charset.ASCII:
      return getUnicodeCodes(content, 0x7f);
    case Charset.Charset.ISO_8859_1:
      return getUnicodeCodes(content, 0xff);
    case Charset.Charset.UTF_8:
      return new TextEncoder().encode(content);
    default:
      throw new Error(`built-in encode not support charset: ${charset.label}`);
  }
}
function decode(bytes, charset) {
  try {
    return new TextDecoder(charset.label).decode(bytes);
  } catch {
    throw new Error(`built-in decode not support charset: ${charset.label}`);
  }
}

exports.decode = decode;
exports.encode = encode;

},
23:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Pattern = require(24);
const Detected = require(26);
const utils = require(10);
const transform = require(31);
const timing = require(33);
const FinderPatternGroup = require(28);
const PatternRatios = require(34);
const FinderPatternFinder = require(35);
const AlignmentPatternFinder = require(40);
const Version = require(13);

/**
 * @module Detector
 */
function getExpectAlignment(finderPatternGroup) {
  const { x, y } = finderPatternGroup.topLeft;
  const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
  const expectAlignmentCorrectionToTopLeftRatio = 1 - 3 / (size - 7);
  const bottomRight = FinderPatternGroup.FinderPatternGroup.bottomRight(finderPatternGroup);
  const [xModuleSize, yModuleSize] = FinderPatternGroup.FinderPatternGroup.moduleSizes(finderPatternGroup);
  const expectAlignmentX = x + (bottomRight.x - x) * expectAlignmentCorrectionToTopLeftRatio;
  const expectAlignmentY = y + (bottomRight.y - y) * expectAlignmentCorrectionToTopLeftRatio;
  return new Pattern.Pattern(
    PatternRatios.ALIGNMENT_PATTERN_RATIOS,
    expectAlignmentX,
    expectAlignmentY,
    xModuleSize * 5,
    yModuleSize * 5,
    0
  );
}
function findAlignmentInRegion(matrix, finderPatternGroup, strict) {
  const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
  const expectAlignment = getExpectAlignment(finderPatternGroup);
  const alignmentFinder = new AlignmentPatternFinder.AlignmentPatternFinder(matrix, strict);
  const moduleSize = FinderPatternGroup.FinderPatternGroup.moduleSize(finderPatternGroup);
  const { x: expectAlignmentX, y: expectAlignmentY } = expectAlignment;
  const alignmentAreaAllowanceSize = Math.ceil(moduleSize * Math.min(20, size >>> 2));
  const alignmentAreaTop = utils.toInt32(Math.max(0, expectAlignmentY - alignmentAreaAllowanceSize));
  const alignmentAreaLeft = utils.toInt32(Math.max(0, expectAlignmentX - alignmentAreaAllowanceSize));
  const alignmentAreaRight = utils.toInt32(Math.min(matrix.width - 1, expectAlignmentX + alignmentAreaAllowanceSize));
  const alignmentAreaBottom = utils.toInt32(Math.min(matrix.height - 1, expectAlignmentY + alignmentAreaAllowanceSize));
  alignmentFinder.find(
    alignmentAreaLeft,
    alignmentAreaTop,
    alignmentAreaRight - alignmentAreaLeft,
    alignmentAreaBottom - alignmentAreaTop
  );
  return alignmentFinder.filter(expectAlignment, moduleSize);
}
class Detector {
  #options;
  /**
   * @constructor
   * @param options The options of detector.
   */
  constructor(options = {}) {
    this.#options = options;
  }
  /**
   * @method detect Detect the binarized image matrix.
   * @param matrix The binarized image matrix.
   */
  *detect(matrix) {
    const { strict } = this.#options;
    const { width, height } = matrix;
    const finderFinder = new FinderPatternFinder.FinderPatternFinder(matrix, strict);
    finderFinder.find(0, 0, width, height);
    const finderPatternGroups = finderFinder.groups();
    let current = finderPatternGroups.next();
    while (!current.done) {
      let succeed = false;
      const finderPatternGroup = current.value;
      const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
      // Find alignment.
      if (size >= Version.MIN_VERSION_SIZE_WITH_ALIGNMENTS) {
        // Kind of arbitrary -- expand search radius before giving up
        // If we didn't find alignment pattern... well try anyway without it.
        const alignmentPatterns = findAlignmentInRegion(matrix, finderPatternGroup, strict);
        // Founded alignment.
        for (const alignmentPattern of alignmentPatterns) {
          const transform$1 = transform.createTransform(finderPatternGroup, alignmentPattern);
          if (
            // Top left to top right.
            timing.checkMappingTimingLine(matrix, transform$1, size) &&
            // Top left to bottom left.
            timing.checkMappingTimingLine(matrix, transform$1, size, true)
          ) {
            succeed = yield new Detected.Detected(matrix, transform$1, finderPatternGroup, alignmentPattern);
            // Succeed, skip next alignment pattern.
            if (succeed) {
              break;
            }
          }
        }
      } else {
        const transform$1 = transform.createTransform(finderPatternGroup);
        if (
          // Top left to top right.
          timing.checkMappingTimingLine(matrix, transform$1, size) &&
          // Top left to bottom left.
          timing.checkMappingTimingLine(matrix, transform$1, size, true)
        ) {
          // No alignment pattern version.
          succeed = yield new Detected.Detected(matrix, transform$1, finderPatternGroup);
        }
      }
      current = finderPatternGroups.next(succeed);
    }
  }
}

exports.Detector = Detector;

},
24:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Point = require(25);
const utils = require(10);

/**
 * @module Pattern
 */
function calculateIntersectRatio({ ratios }) {
  return ratios[utils.toInt32(ratios.length / 2)] / 2;
}
class Pattern extends Point.Point {
  #noise;
  #width;
  #height;
  #rect;
  #moduleSize;
  #combined = 1;
  #ratios;
  #intersectRadius;
  static noise(pattern) {
    return pattern.#noise;
  }
  static width(pattern) {
    return pattern.#width;
  }
  static height(pattern) {
    return pattern.#height;
  }
  static combined(pattern) {
    return pattern.#combined;
  }
  static rect(pattern) {
    return pattern.#rect;
  }
  static equals(pattern, x, y, width, height) {
    const { modules } = pattern.#ratios;
    const intersectRadius = pattern.#intersectRadius;
    if (Math.abs(x - pattern.x) <= intersectRadius && Math.abs(y - pattern.y) <= intersectRadius) {
      const moduleSizeThis = pattern.#moduleSize;
      const moduleSize = (width + height) / modules / 2;
      const moduleSizeDiff = Math.abs(moduleSize - moduleSizeThis);
      if (moduleSizeDiff <= 1 || moduleSizeDiff <= moduleSizeThis) {
        return true;
      }
    }
    return false;
  }
  static combine(pattern, x, y, width, height, noise) {
    const combined = pattern.#combined;
    const combinedCombined = combined + 1;
    const combinedX = (pattern.x * combined + x) / combinedCombined;
    const combinedY = (pattern.y * combined + y) / combinedCombined;
    const combinedNoise = (pattern.#noise * combined + noise) / combinedCombined;
    const combinedWidth = (pattern.#width * combined + width) / combinedCombined;
    const combinedHeight = (pattern.#height * combined + height) / combinedCombined;
    const combinedPattern = new Pattern(pattern.#ratios, combinedX, combinedY, combinedWidth, combinedHeight, combinedNoise);
    combinedPattern.#combined = combinedCombined;
    return combinedPattern;
  }
  constructor(ratios, x, y, width, height, noise) {
    super(x, y);
    const { modules } = ratios;
    const widthHalf = width / 2;
    const heightHalf = height / 2;
    const xModuleSize = width / modules;
    const yModuleSize = height / modules;
    const xModuleSizeHalf = xModuleSize / 2;
    const yModuleSizeHalf = yModuleSize / 2;
    const ratio = calculateIntersectRatio(ratios);
    const moduleSize = (xModuleSize + yModuleSize) / 2;
    this.#noise = noise;
    this.#width = width;
    this.#height = height;
    this.#ratios = ratios;
    this.#moduleSize = moduleSize;
    this.#rect = [
      x - widthHalf + xModuleSizeHalf,
      y - heightHalf + yModuleSizeHalf,
      x + widthHalf - xModuleSizeHalf,
      y + heightHalf - yModuleSizeHalf
    ];
    this.#intersectRadius = moduleSize * ratio;
  }
  get moduleSize() {
    return this.#moduleSize;
  }
}

exports.Pattern = Pattern;

},
25:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module Point
 */
class Point {
  #x;
  #y;
  constructor(x, y) {
    this.#x = x;
    this.#y = y;
  }
  /**
   * @property x
   * @description Get the x of point.
   */
  get x() {
    return this.#x;
  }
  /**
   * @property y
   * @description Get the y of point.
   */
  get y() {
    return this.#y;
  }
}
function distance(a, b) {
  return Math.sqrt(squaredDistance(a, b));
}
function squaredDistance(a, b) {
  const xDiff = a.x - b.x;
  const yDiff = a.y - b.y;
  return xDiff * xDiff + yDiff * yDiff;
}
function calculateTriangleArea(a, b, c) {
  const { x: ax, y: ay } = a;
  const { x: bx, y: by } = b;
  const { x: cx, y: cy } = c;
  return Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / 2;
}

exports.Point = Point;
exports.calculateTriangleArea = calculateTriangleArea;
exports.distance = distance;
exports.squaredDistance = squaredDistance;

},
26:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Point = require(25);
const GridSampler = require(27);
const FinderPatternGroup = require(28);

/**
 * @module Detected
 */
class Detected {
  #matrix;
  #alignment;
  #finder;
  #transform;
  constructor(matrix, transform, finderPatternGroup, alignmentPattern) {
    const sampler = new GridSampler.GridSampler(matrix, transform);
    const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
    this.#matrix = matrix;
    this.#transform = transform;
    this.#finder = finderPatternGroup;
    this.#alignment = alignmentPattern;
    this.#matrix = sampler.sample(size, size);
  }
  /**
   * @property matrix
   * @description Get the matrix.
   */
  get matrix() {
    return this.#matrix;
  }
  /**
   * @property finder
   * @description Get the finder pattern.
   */
  get finder() {
    return this.#finder;
  }
  /**
   * @property alignment
   * @description Get the alignment pattern.
   */
  get alignment() {
    return this.#alignment;
  }
  /**
   * @property size
   * @description Get the size.
   */
  get size() {
    return FinderPatternGroup.FinderPatternGroup.size(this.#finder);
  }
  /**
   * @property moduleSize
   * @description Get the module size.
   */
  get moduleSize() {
    return FinderPatternGroup.FinderPatternGroup.moduleSize(this.#finder);
  }
  /**
   * @method mapping
   * @description Get the mapped point.
   * @param x The x of point.
   * @param y The y of point.
   */
  mapping(x, y) {
    [x, y] = this.#transform.mapping(x, y);
    return new Point.Point(x, y);
  }
}

exports.Detected = Detected;

},
27:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);
const BitMatrix = require(16);

/**
 * @module GridSampler
 */
class GridSampler {
  #matrix;
  #transform;
  constructor(matrix, transform) {
    this.#matrix = matrix;
    this.#transform = transform;
  }
  sample(width, height) {
    const matrix = this.#matrix;
    const matrixWidth = matrix.width;
    const transform = this.#transform;
    const matrixHeight = matrix.height;
    const bits = new BitMatrix.BitMatrix(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [mappingX, mappingY] = transform.mapping(x + 0.5, y + 0.5);
        const offsetX = utils.toInt32(mappingX);
        const offsetY = utils.toInt32(mappingY);
        if (
          // Assert axis.
          offsetX >= 0 &&
          offsetY >= 0 &&
          offsetX < matrixWidth &&
          offsetY < matrixHeight &&
          matrix.get(offsetX, offsetY)
        ) {
          bits.set(x, y);
        }
      }
    }
    return bits;
  }
}

exports.GridSampler = GridSampler;

},
28:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Pattern = require(24);
const utils = require(10);
const Version = require(13);
const module$1 = require(29);
const Point = require(25);

/**
 * @module FinderPatternGroup
 */
function calculateSizeRatio(size1, size2) {
  return size1 > size2 ? size1 / size2 : size2 / size1;
}
function calculateDistanceRatio(pattern1, pattern2) {
  const ratio = Math.max(
    calculateSizeRatio(Pattern.Pattern.width(pattern1), Pattern.Pattern.width(pattern2)),
    calculateSizeRatio(Pattern.Pattern.height(pattern1), Pattern.Pattern.height(pattern2))
  );
  return ratio * ratio;
}
function crossProductZ(pattern1, pattern2, pattern3) {
  const { x, y } = pattern2;
  return (pattern3.x - x) * (pattern1.y - y) - (pattern3.y - y) * (pattern1.x - x);
}
function orderFinderPatterns(patterns) {
  let topLeft;
  let topRight;
  let bottomLeft;
  // Find distances between pattern centers.
  const [pattern1, pattern2, pattern3] = patterns;
  // @see https://github.com/zxing-cpp/zxing-cpp/blob/master/core/src/qrcode/QRDetector.cpp
  const oneTwoDistance = Point.squaredDistance(pattern1, pattern2) * calculateDistanceRatio(pattern1, pattern2);
  const oneThreeDistance = Point.squaredDistance(pattern1, pattern3) * calculateDistanceRatio(pattern1, pattern3);
  const twoThreeDistance = Point.squaredDistance(pattern2, pattern3) * calculateDistanceRatio(pattern2, pattern3);
  // Assume one closest to other two is B; A and C will just be guesses at first.
  if (twoThreeDistance >= oneTwoDistance && twoThreeDistance >= oneThreeDistance) {
    [topLeft, bottomLeft, topRight] = patterns;
  } else if (oneThreeDistance >= twoThreeDistance && oneThreeDistance >= oneTwoDistance) {
    [bottomLeft, topLeft, topRight] = patterns;
  } else {
    [bottomLeft, topRight, topLeft] = patterns;
  }
  // Use cross product to figure out whether A and C are correct or flipped.
  // This asks whether BC x BA has a positive z component, which is the arrangement
  // we want for A, B, C. If it's negative, then we've got it flipped around and
  // should swap A and C.
  if (crossProductZ(bottomLeft, topLeft, topRight) < 0) {
    [bottomLeft, topRight] = [topRight, bottomLeft];
  }
  return [topLeft, topRight, bottomLeft];
}
function calculateBottomRightPoint([topLeft, topRight, bottomLeft]) {
  const { x, y } = topLeft;
  const bottomRightX = topRight.x + bottomLeft.x - x;
  const bottomRightY = topRight.y + bottomLeft.y - y;
  return new Point.Point(bottomRightX, bottomRightY);
}
function calculateSymbolSize([topLeft, topRight, bottomLeft], moduleSize) {
  const width = Point.distance(topLeft, topRight);
  const height = Point.distance(topLeft, bottomLeft);
  const size = utils.round((width + height) / moduleSize / 2) + 7;
  switch (size & 0x03) {
    case 0:
      return size + 1;
    case 2:
      return size - 1;
    case 3:
      return Math.min(size + 2, Version.MAX_VERSION_SIZE);
  }
  return size;
}
class FinderPatternGroup {
  #area;
  #size;
  #matrix;
  #bottomRight;
  #moduleSize;
  #patterns;
  #moduleSizes;
  static moduleSizes(finderPatternGroup) {
    if (finderPatternGroup.#moduleSizes == null) {
      const matrix = finderPatternGroup.#matrix;
      const [topLeft, topRight, bottomLeft] = finderPatternGroup.#patterns;
      finderPatternGroup.#moduleSizes = [
        module$1.calculateModuleSizeOneWay(matrix, topLeft, topRight),
        module$1.calculateModuleSizeOneWay(matrix, topLeft, bottomLeft)
      ];
    }
    return finderPatternGroup.#moduleSizes;
  }
  static size(finderPatternGroup) {
    if (finderPatternGroup.#size == null) {
      const moduleSize = FinderPatternGroup.moduleSize(finderPatternGroup);
      finderPatternGroup.#size = calculateSymbolSize(finderPatternGroup.#patterns, moduleSize);
    }
    return finderPatternGroup.#size;
  }
  static moduleSize(finderPatternGroup) {
    if (finderPatternGroup.#moduleSize == null) {
      finderPatternGroup.#moduleSize = utils.accumulate(FinderPatternGroup.moduleSizes(finderPatternGroup)) / 2;
    }
    return finderPatternGroup.#moduleSize;
  }
  static contains(finderPatternGroup, pattern) {
    const area = finderPatternGroup.#calculateArea();
    const [topLeft, topRight, bottomLeft] = finderPatternGroup.#patterns;
    const bottomRight = FinderPatternGroup.bottomRight(finderPatternGroup);
    const s1 = Point.calculateTriangleArea(topLeft, topRight, pattern);
    const s2 = Point.calculateTriangleArea(topRight, bottomRight, pattern);
    const s3 = Point.calculateTriangleArea(bottomRight, bottomLeft, pattern);
    const s4 = Point.calculateTriangleArea(bottomLeft, topLeft, pattern);
    // Pattern not a point, increase the detection margin appropriately.
    return s1 + s2 + s3 + s4 - area < 1;
  }
  static bottomRight(finderPatternGroup) {
    if (finderPatternGroup.#bottomRight == null) {
      finderPatternGroup.#bottomRight = calculateBottomRightPoint(finderPatternGroup.#patterns);
    }
    return finderPatternGroup.#bottomRight;
  }
  constructor(matrix, patterns) {
    this.#matrix = matrix;
    this.#patterns = orderFinderPatterns(patterns);
  }
  get topLeft() {
    return this.#patterns[0];
  }
  get topRight() {
    return this.#patterns[1];
  }
  get bottomLeft() {
    return this.#patterns[2];
  }
  #calculateArea() {
    const [topLeft, topRight, bottomLeft] = this.#patterns;
    const bottomRight = FinderPatternGroup.bottomRight(this);
    if (this.#area == null) {
      const s1 = Point.calculateTriangleArea(topLeft, topRight, bottomRight);
      const s2 = Point.calculateTriangleArea(bottomRight, bottomLeft, topLeft);
      this.#area = s1 + s2;
    }
    return this.#area;
  }
}
function calculateTopLeftAngle({ topLeft, topRight, bottomLeft }) {
  const { x, y } = topLeft;
  const dx1 = topRight.x - x;
  const dy1 = topRight.y - y;
  const dx2 = bottomLeft.x - x;
  const dy2 = bottomLeft.y - y;
  const d = dx1 * dx2 + dy1 * dy2;
  const l2 = (dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2);
  return Math.acos(d / Math.sqrt(l2));
}

exports.FinderPatternGroup = FinderPatternGroup;
exports.calculateTopLeftAngle = calculateTopLeftAngle;

},
29:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);
const PlotLine = require(30);
const Point = require(25);

/**
 * @module module
 */
function sizeOfBlackWhiteBlackRun(matrix, from, to) {
  // In black pixels, looking for white, first or second time.
  let state = 0;
  const { width, height } = matrix;
  const centerX = (from.x + to.x) / 2;
  const centerY = (from.y + to.y) / 2;
  // Center point is already enough.
  const center = new Point.Point(centerX, centerY);
  const points = new PlotLine.PlotLine(from, center).points();
  for (const [x, y] of points) {
    // Now count other way -- don't run off image though of course.
    if (x < 0 || y < 0 || x >= width || y >= height) {
      if (state === 2) {
        return Point.distance(from, new Point.Point(x, y));
      }
      return NaN;
    }
    // Does current pixel mean we have moved white to black or vice versa?
    // Scanning black in state 0,2 and white in state 1, so if we find the wrong
    // color, advance to next state or end if we are in state 2 already.
    if ((state === 1) === (matrix.get(x, y) === 1)) {
      if (state === 2) {
        return Point.distance(from, new Point.Point(x, y));
      }
      state++;
    }
  }
  return NaN;
}
function sizeOfBlackWhiteBlackRunBothWays(matrix, from, to) {
  const size1 = sizeOfBlackWhiteBlackRun(matrix, from, to);
  if (Number.isNaN(size1)) {
    return NaN;
  }
  const { x: toX, y: toY } = to;
  const { x: fromX, y: fromY } = from;
  const otherToX = fromX - (toX - fromX);
  const otherToY = fromY - (toY - fromY);
  const size2 = sizeOfBlackWhiteBlackRun(matrix, from, new Point.Point(otherToX, otherToY));
  if (Number.isNaN(size2)) {
    return NaN;
  }
  // Middle pixel is double-counted this way; subtract 1.
  return size1 + size2 - 1;
}
function calculateModuleSizeOneWay(matrix, pattern1, pattern2) {
  const point1 = new Point.Point(utils.toInt32(pattern1.x), utils.toInt32(pattern1.y));
  const point2 = new Point.Point(utils.toInt32(pattern2.x), utils.toInt32(pattern2.y));
  const moduleSize1 = sizeOfBlackWhiteBlackRunBothWays(matrix, point1, point2);
  const moduleSize2 = sizeOfBlackWhiteBlackRunBothWays(matrix, point2, point1);
  if (Number.isNaN(moduleSize1)) {
    return moduleSize2 / 7;
  }
  if (Number.isNaN(moduleSize2)) {
    return moduleSize1 / 7;
  }
  // Average them, and divide by 7 since we've counted the width of 3 black modules,
  // and 1 white and 1 black module on either side. Ergo, divide sum by 14.
  return (moduleSize1 + moduleSize2) / 14;
}

exports.calculateModuleSizeOneWay = calculateModuleSizeOneWay;

},
30:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Point = require(25);
const utils = require(10);

/**
 * @module PlotLine
 */
// Mild variant of Bresenham's algorithm.
// see https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
class PlotLine {
  #to;
  #from;
  #limit;
  #steep;
  #step;
  #delta;
  constructor(from, to) {
    let toX = utils.toInt32(to.x);
    let toY = utils.toInt32(to.y);
    let fromX = utils.toInt32(from.x);
    let fromY = utils.toInt32(from.y);
    const steep = Math.abs(toY - fromY) > Math.abs(toX - fromX);
    // Steep line.
    if (steep) {
      [fromX, fromY, toX, toY] = [fromY, fromX, toY, toX];
    }
    const stepX = fromX < toX ? 1 : -1;
    this.#steep = steep;
    this.#limit = toX + stepX;
    this.#to = new Point.Point(toX, toY);
    this.#from = new Point.Point(fromX, fromY);
    this.#step = [stepX, fromY < toY ? 1 : -1];
    this.#delta = [Math.abs(toX - fromX), Math.abs(toY - fromY)];
  }
  *points() {
    const limit = this.#limit;
    const steep = this.#steep;
    const { y: toY } = this.#to;
    const [stepX, stepY] = this.#step;
    const [deltaX, deltaY] = this.#delta;
    const { x: fromX, y: fromY } = this.#from;
    let error = (-deltaX / 2) | 0;
    // Loop up until x === toX, but not beyond.
    for (let x = fromX, y = fromY; x !== limit; x += stepX) {
      yield [steep ? y : x, steep ? x : y];
      error += deltaY;
      if (error > 0) {
        if (y === toY) {
          break;
        }
        y += stepY;
        error -= deltaX;
      }
    }
  }
}

exports.PlotLine = PlotLine;

},
31:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const FinderPatternGroup = require(28);
const PerspectiveTransform = require(32);

/**
 * @module transform
 */
function createTransform(finderPatternGroup, alignmentPattern) {
  let bottomRightX;
  let bottomRightY;
  let sourceBottomRightX;
  let sourceBottomRightY;
  const { x: topLeftX, y: topLeftY } = finderPatternGroup.topLeft;
  const { x: topRightX, y: topRightY } = finderPatternGroup.topRight;
  const { x: bottomLeftX, y: bottomLeftY } = finderPatternGroup.bottomLeft;
  const sizeMinusThree = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup) - 3.5;
  if (alignmentPattern != null) {
    bottomRightX = alignmentPattern.x;
    bottomRightY = alignmentPattern.y;
    sourceBottomRightX = sizeMinusThree - 3;
    sourceBottomRightY = sourceBottomRightX;
  } else {
    // Don't have an alignment pattern, just make up the bottom-right point.
    bottomRightX = topRightX + bottomLeftX - topLeftX;
    bottomRightY = topRightY + bottomLeftY - topLeftY;
    sourceBottomRightX = sizeMinusThree;
    sourceBottomRightY = sizeMinusThree;
  }
  return PerspectiveTransform.quadrilateralToQuadrilateral(
    3.5,
    3.5,
    sizeMinusThree,
    3.5,
    sourceBottomRightX,
    sourceBottomRightY,
    3.5,
    sizeMinusThree,
    topLeftX,
    topLeftY,
    topRightX,
    topRightY,
    bottomRightX,
    bottomRightY,
    bottomLeftX,
    bottomLeftY
  );
}

exports.createTransform = createTransform;

},
32:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module PerspectiveTransform
 */
class PerspectiveTransform {
  #a11;
  #a12;
  #a13;
  #a21;
  #a22;
  #a23;
  #a31;
  #a32;
  #a33;
  constructor(a11, a21, a31, a12, a22, a32, a13, a23, a33) {
    this.#a11 = a11;
    this.#a12 = a12;
    this.#a13 = a13;
    this.#a21 = a21;
    this.#a22 = a22;
    this.#a23 = a23;
    this.#a31 = a31;
    this.#a32 = a32;
    this.#a33 = a33;
  }
  inverse() {
    // Adjoint is the transpose of the cofactor matrix.
    const a11 = this.#a11;
    const a12 = this.#a12;
    const a13 = this.#a13;
    const a21 = this.#a21;
    const a22 = this.#a22;
    const a23 = this.#a23;
    const a31 = this.#a31;
    const a32 = this.#a32;
    const a33 = this.#a33;
    return new PerspectiveTransform(
      a22 * a33 - a23 * a32,
      a23 * a31 - a21 * a33,
      a21 * a32 - a22 * a31,
      a13 * a32 - a12 * a33,
      a11 * a33 - a13 * a31,
      a12 * a31 - a11 * a32,
      a12 * a23 - a13 * a22,
      a13 * a21 - a11 * a23,
      a11 * a22 - a12 * a21
    );
  }
  times(other) {
    const a11 = this.#a11;
    const a12 = this.#a12;
    const a13 = this.#a13;
    const a21 = this.#a21;
    const a22 = this.#a22;
    const a23 = this.#a23;
    const a31 = this.#a31;
    const a32 = this.#a32;
    const a33 = this.#a33;
    const b11 = other.#a11;
    const b12 = other.#a12;
    const b13 = other.#a13;
    const b21 = other.#a21;
    const b22 = other.#a22;
    const b23 = other.#a23;
    const b31 = other.#a31;
    const b32 = other.#a32;
    const b33 = other.#a33;
    return new PerspectiveTransform(
      a11 * b11 + a21 * b12 + a31 * b13,
      a11 * b21 + a21 * b22 + a31 * b23,
      a11 * b31 + a21 * b32 + a31 * b33,
      a12 * b11 + a22 * b12 + a32 * b13,
      a12 * b21 + a22 * b22 + a32 * b23,
      a12 * b31 + a22 * b32 + a32 * b33,
      a13 * b11 + a23 * b12 + a33 * b13,
      a13 * b21 + a23 * b22 + a33 * b23,
      a13 * b31 + a23 * b32 + a33 * b33
    );
  }
  mapping(x, y) {
    const a11 = this.#a11;
    const a12 = this.#a12;
    const a13 = this.#a13;
    const a21 = this.#a21;
    const a22 = this.#a22;
    const a23 = this.#a23;
    const a31 = this.#a31;
    const a32 = this.#a32;
    const a33 = this.#a33;
    const denominator = a13 * x + a23 * y + a33;
    return [(a11 * x + a21 * y + a31) / denominator, (a12 * x + a22 * y + a32) / denominator];
  }
}
function squareToQuadrilateral(x0, y0, x1, y1, x2, y2, x3, y3) {
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;
  if (dx3 === 0 && dy3 === 0) {
    return new PerspectiveTransform(x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1);
  } else {
    const dx1 = x1 - x2;
    const dx2 = x3 - x2;
    const dy1 = y1 - y2;
    const dy2 = y3 - y2;
    const denominator = dx1 * dy2 - dx2 * dy1;
    const a13 = (dx3 * dy2 - dx2 * dy3) / denominator;
    const a23 = (dx1 * dy3 - dx3 * dy1) / denominator;
    return new PerspectiveTransform(
      x1 - x0 + a13 * x1,
      x3 - x0 + a23 * x3,
      x0,
      y1 - y0 + a13 * y1,
      y3 - y0 + a23 * y3,
      y0,
      a13,
      a23,
      1
    );
  }
}
function quadrilateralToSquare(x0, y0, x1, y1, x2, y2, x3, y3) {
  // Here, the adjoint serves as the inverse.
  return squareToQuadrilateral(x0, y0, x1, y1, x2, y2, x3, y3).inverse();
}
function quadrilateralToQuadrilateral(x0, y0, x1, y1, x2, y2, x3, y3, x0p, y0p, x1p, y1p, x2p, y2p, x3p, y3p) {
  const qToS = quadrilateralToSquare(x0, y0, x1, y1, x2, y2, x3, y3);
  const sToQ = squareToQuadrilateral(x0p, y0p, x1p, y1p, x2p, y2p, x3p, y3p);
  return sToQ.times(qToS);
}

exports.PerspectiveTransform = PerspectiveTransform;
exports.quadrilateralToQuadrilateral = quadrilateralToQuadrilateral;

},
33:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Point = require(25);
const utils = require(10);
const Pattern = require(24);
const PlotLine = require(30);
const FinderPatternGroup = require(28);

/**
 * @module timing
 */
function calculateEstimateTimingRatio(axis, control) {
  return control > axis ? 1 : control < axis ? -1 : 0;
}
function getEstimateTimingPointXAxis(pattern, ratio) {
  const [left, , right] = Pattern.Pattern.rect(pattern);
  return ratio > 0 ? right : ratio < 0 ? left : pattern.x;
}
function getEstimateTimingPointYAxis(pattern, ratio) {
  const [, top, , bottom] = Pattern.Pattern.rect(pattern);
  return ratio > 0 ? bottom : ratio < 0 ? top : pattern.y;
}
function getEstimateTimingLine(start, end, control, isVertical) {
  const { x: endX, y: endY } = end;
  const { x: startX, y: startY } = start;
  const { x: controlX, y: controlY } = control;
  const xRatio = calculateEstimateTimingRatio(endX, controlX);
  const yRatio = calculateEstimateTimingRatio(endY, controlY);
  const endXTranslate = getEstimateTimingPointXAxis(end, xRatio);
  const endYTranslate = getEstimateTimingPointYAxis(end, yRatio);
  const startXTranslate = getEstimateTimingPointXAxis(start, xRatio);
  const startYTranslate = getEstimateTimingPointYAxis(start, yRatio);
  if (xRatio === 0 || yRatio === 0) {
    return [new Point.Point(startXTranslate, startYTranslate), new Point.Point(endXTranslate, endYTranslate)];
  }
  if (isVertical ? xRatio === yRatio : xRatio !== yRatio) {
    return [new Point.Point(startX, startYTranslate), new Point.Point(endX, endYTranslate)];
  }
  return [new Point.Point(startXTranslate, startY), new Point.Point(endXTranslate, endY)];
}
function isValidTimingLine(matrix, start, end, size) {
  const maxModules = size + 8;
  const points = new PlotLine.PlotLine(start, end).points();
  let modules = 1;
  let lastBit = matrix.get(utils.toInt32(start.x), utils.toInt32(start.y));
  for (const [x, y] of points) {
    const bit = matrix.get(x, y);
    if (bit !== lastBit) {
      modules++;
      lastBit = bit;
      if (modules > maxModules) {
        return false;
      }
    }
  }
  return modules >= size - 14 - Math.max(2, (size - 17) >>> 2);
}
function checkEstimateTimingLine(matrix, finderPatternGroup, isVertical) {
  const { topLeft, topRight, bottomLeft } = finderPatternGroup;
  const [start, end] = isVertical
    ? getEstimateTimingLine(topLeft, bottomLeft, topRight, true)
    : getEstimateTimingLine(topLeft, topRight, bottomLeft);
  return isValidTimingLine(matrix, start, end, FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup));
}
function checkMappingTimingLine(matrix, transform, size, isVertical) {
  const [startX, startY] = transform.mapping(isVertical ? 6.5 : 7.5, isVertical ? 7.5 : 6.5);
  const [endX, endY] = transform.mapping(isVertical ? 6.5 : size - 7.5, isVertical ? size - 7.5 : 6.5);
  return isValidTimingLine(matrix, new Point.Point(startX, startY), new Point.Point(endX, endY), size);
}

exports.checkEstimateTimingLine = checkEstimateTimingLine;
exports.checkMappingTimingLine = checkMappingTimingLine;

},
34:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);

/**
 * @module PatternRatios
 */
class PatternRatios {
  #modules;
  #ratios;
  constructor(ratios) {
    this.#ratios = ratios;
    this.#modules = utils.accumulate(ratios);
  }
  get modules() {
    return this.#modules;
  }
  get ratios() {
    return this.#ratios;
  }
}
const FINDER_PATTERN_RATIOS = new PatternRatios([1, 1, 3, 1, 1]);
const ALIGNMENT_PATTERN_RATIOS = new PatternRatios([1, 1, 1, 1, 1]);
const ALIGNMENT_PATTERN_LOOSE_MODE_RATIOS = new PatternRatios([1, 1, 1]);

exports.ALIGNMENT_PATTERN_LOOSE_MODE_RATIOS = ALIGNMENT_PATTERN_LOOSE_MODE_RATIOS;
exports.ALIGNMENT_PATTERN_RATIOS = ALIGNMENT_PATTERN_RATIOS;
exports.FINDER_PATTERN_RATIOS = FINDER_PATTERN_RATIOS;
exports.PatternRatios = PatternRatios;

},
35:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Pattern = require(24);
const utils = require(10);
const Point = require(25);
const scanline = require(36);
const PatternRatios = require(34);
const timing = require(33);
const PatternFinder = require(37);
const pattern = require(38);
const Version = require(13);
const FinderPatternGroup = require(28);
const constants = require(39);

/**
 * @module FinderPatternFinder
 */
function isGroupNested(finderPatternGroup, patterns, used) {
  let count = 0;
  const { topLeft, topRight, bottomLeft } = finderPatternGroup;
  for (const pattern of patterns) {
    if (pattern !== topLeft && pattern !== topRight && pattern !== bottomLeft) {
      let contain;
      if (used.has(pattern)) {
        contain = FinderPatternGroup.FinderPatternGroup.contains(finderPatternGroup, pattern);
        if (contain) {
          return true;
        }
      }
      if (
        Pattern.Pattern.noise(pattern) < 1 &&
        (contain == null ? FinderPatternGroup.FinderPatternGroup.contains(finderPatternGroup, pattern) : contain)
      ) {
        // Maybe contain another QR code, but we only allow one, because this is not a normal mode.
        if (++count > 3) {
          return true;
        }
      }
    }
  }
  return false;
}
class FinderPatternFinder extends PatternFinder.PatternFinder {
  constructor(matrix, strict) {
    super(matrix, PatternRatios.FINDER_PATTERN_RATIOS, strict);
  }
  *groups() {
    const patterns = this.patterns.filter(pattern => {
      return Pattern.Pattern.combined(pattern) >= 3 && Pattern.Pattern.noise(pattern) <= 1.5;
    });
    const { length } = patterns;
    if (length === 3) {
      const finderPatternGroup = new FinderPatternGroup.FinderPatternGroup(this.matrix, patterns);
      const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
      if (size >= Version.MIN_VERSION_SIZE && size <= Version.MAX_VERSION_SIZE) {
        yield finderPatternGroup;
      }
    } else if (length > 3) {
      const maxI1 = length - 2;
      const maxI2 = length - 1;
      const used = new Map();
      for (let i1 = 0; i1 < maxI1; i1++) {
        const pattern1 = patterns[i1];
        const moduleSize1 = pattern1.moduleSize;
        // Pattern 1 used.
        if (used.has(pattern1)) {
          continue;
        }
        for (let i2 = i1 + 1; i2 < maxI2; i2++) {
          const pattern2 = patterns[i2];
          const moduleSize2 = pattern2.moduleSize;
          // Pattern 1 used.
          if (used.has(pattern1)) {
            break;
          }
          if (
            // Pattern 2 used.
            used.has(pattern2) ||
            // Non equals module size.
            !pattern.isEqualsSize(moduleSize1, moduleSize2, constants.DIFF_MODULE_SIZE_RATIO)
          ) {
            continue;
          }
          for (let i3 = i2 + 1; i3 < length; i3++) {
            const pattern3 = patterns[i3];
            const moduleSize3 = pattern3.moduleSize;
            if (
              // Pattern 1 used.
              used.has(pattern1) ||
              // Pattern 2 used.
              used.has(pattern2)
            ) {
              break;
            }
            if (
              // Non equals module size.
              !pattern.isEqualsSize(moduleSize1, moduleSize3, constants.DIFF_MODULE_SIZE_RATIO) ||
              // Non equals module size.
              !pattern.isEqualsSize(moduleSize2, moduleSize3, constants.DIFF_MODULE_SIZE_RATIO)
            ) {
              continue;
            }
            const { matrix } = this;
            const finderPatternGroup = new FinderPatternGroup.FinderPatternGroup(matrix, [pattern1, pattern2, pattern3]);
            const angle = FinderPatternGroup.calculateTopLeftAngle(finderPatternGroup);
            if (angle >= constants.MIN_TOP_LEFT_ANGLE && angle <= constants.MAX_TOP_LEFT_ANGLE) {
              const [xModuleSize, yModuleSize] = FinderPatternGroup.FinderPatternGroup.moduleSizes(finderPatternGroup);
              if (xModuleSize >= 1 && yModuleSize >= 1) {
                const { topLeft, topRight, bottomLeft } = finderPatternGroup;
                const edge1 = Point.distance(topLeft, topRight);
                const edge2 = Point.distance(topLeft, bottomLeft);
                const edge1Modules = utils.round(edge1 / xModuleSize);
                const edge2Modules = utils.round(edge2 / yModuleSize);
                if (Math.abs(edge1Modules - edge2Modules) <= 4) {
                  const size = FinderPatternGroup.FinderPatternGroup.size(finderPatternGroup);
                  if (
                    size >= Version.MIN_VERSION_SIZE &&
                    size <= Version.MAX_VERSION_SIZE &&
                    !isGroupNested(finderPatternGroup, patterns, used)
                  ) {
                    if (
                      timing.checkEstimateTimingLine(matrix, finderPatternGroup) ||
                      timing.checkEstimateTimingLine(matrix, finderPatternGroup, true)
                    ) {
                      if (yield finderPatternGroup) {
                        used.set(pattern1, true);
                        used.set(pattern2, true);
                        used.set(pattern3, true);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  find(left, top, width, height) {
    const { matrix } = this;
    const right = left + width;
    const bottom = top + height;
    const match = (x, y, scanline$1, count, scanlineBits, lastBit) => {
      scanline.scanlineUpdate(scanline$1, count);
      scanline.scanlineUpdate(scanlineBits, lastBit);
      // Match pattern black-white-black-white-black.
      if (
        scanlineBits[0] === 1 &&
        scanlineBits[1] === 0 &&
        scanlineBits[2] === 1 &&
        scanlineBits[3] === 0 &&
        scanlineBits[4] === 1 &&
        pattern.isMatchPattern(scanline$1, PatternRatios.FINDER_PATTERN_RATIOS)
      ) {
        this.match(x, y, scanline$1, scanline$1[2]);
      }
    };
    for (let y = top; y < bottom; y++) {
      let x = left;
      // Burn off leading white pixels before anything else; if we start in the middle of
      // a white run, it doesn't make sense to count its length, since we don't know if the
      // white run continued to the left of the start point.
      while (x < right && !matrix.get(x, y)) {
        x++;
      }
      let count = 0;
      let lastBit = matrix.get(x, y);
      const scanline = [0, 0, 0, 0, 0];
      const scanlineBits = [-1, -1, -1, -1, -1];
      while (x < right) {
        const bit = matrix.get(x, y);
        if (bit === lastBit) {
          count++;
        } else {
          match(x, y, scanline, count, scanlineBits, lastBit);
          count = 1;
          lastBit = bit;
        }
        x++;
      }
      match(x, y, scanline, count, scanlineBits, lastBit);
    }
  }
}

exports.FinderPatternFinder = FinderPatternFinder;

},
36:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);

/**
 * @module scanline
 */
function calculateScanlineNoise(scanline, { ratios, modules }) {
  let noise = 0;
  const { length } = ratios;
  const total = utils.accumulate(scanline);
  const average = total / modules;
  // scanline length must be equals ratios length.
  for (let i = 0; i < length; i++) {
    noise += Math.abs(scanline[i] - ratios[i] * average);
  }
  return [noise / total, average];
}
function sumScanlineNonzero(scanline) {
  let scanlineTotal = 0;
  for (const count of scanline) {
    if (count === 0) {
      return NaN;
    }
    scanlineTotal += count;
  }
  return scanlineTotal;
}
function scanlineUpdate(scanline, count) {
  const { length } = scanline;
  const lastIndex = length - 1;
  for (let i = 0; i < lastIndex; i++) {
    scanline[i] = scanline[i + 1];
  }
  scanline[lastIndex] = count;
}
function getCrossScanline(matrix, x, y, overscan, isVertical) {
  x = utils.toInt32(x);
  y = utils.toInt32(y);
  let offset = isVertical ? y : x;
  const scanline = [0, 0, 0, 0, 0];
  const size = isVertical ? matrix.height : matrix.width;
  const isBlackPixel = () => {
    return isVertical ? matrix.get(x, offset) : matrix.get(offset, y);
  };
  while (offset >= 0 && isBlackPixel()) {
    offset--;
    scanline[2]++;
  }
  while (offset >= 0 && !isBlackPixel()) {
    offset--;
    scanline[1]++;
  }
  while (offset >= 0 && scanline[0] < overscan && isBlackPixel()) {
    offset--;
    scanline[0]++;
  }
  offset = (isVertical ? y : x) + 1;
  while (offset < size && isBlackPixel()) {
    offset++;
    scanline[2]++;
  }
  while (offset < size && !isBlackPixel()) {
    offset++;
    scanline[3]++;
  }
  while (offset < size && scanline[4] < overscan && isBlackPixel()) {
    offset++;
    scanline[4]++;
  }
  return [scanline, offset];
}
function getDiagonalScanline(matrix, x, y, overscan, isBackslash) {
  x = utils.toInt32(x);
  y = utils.toInt32(y);
  let step = -1;
  let offsetX = x;
  let offsetY = y;
  const scanline = [0, 0, 0, 0, 0];
  const { width, height } = matrix;
  const slope = isBackslash ? -1 : 1;
  const updateAxis = () => {
    offsetX += step;
    offsetY -= step * slope;
  };
  const isBlackPixel = () => {
    return matrix.get(offsetX, offsetY);
  };
  // Start counting left from center finding black center mass.
  while (offsetX >= 0 && offsetY >= 0 && offsetY < height && isBlackPixel()) {
    updateAxis();
    scanline[2]++;
  }
  // Start counting left from center finding black center mass.
  while (offsetX >= 0 && offsetY >= 0 && offsetY < height && !isBlackPixel()) {
    updateAxis();
    scanline[1]++;
  }
  // Start counting left from center finding black center mass.
  while (offsetX >= 0 && offsetY >= 0 && offsetY < height && scanline[0] < overscan && isBlackPixel()) {
    updateAxis();
    scanline[0]++;
  }
  step = 1;
  offsetX = x + step;
  offsetY = y - step * slope;
  // Start counting right from center finding black center mass.
  while (offsetX < width && offsetY >= 0 && offsetY < height && isBlackPixel()) {
    updateAxis();
    scanline[2]++;
  }
  // Start counting right from center finding black center mass.
  while (offsetX < width && offsetY >= 0 && offsetY < height && !isBlackPixel()) {
    updateAxis();
    scanline[3]++;
  }
  // Start counting right from center finding black center mass.
  while (offsetX < width && offsetY >= 0 && offsetY < height && scanline[4] < overscan && isBlackPixel()) {
    updateAxis();
    scanline[4]++;
  }
  return scanline;
}
// @see https://github.com/zxing-cpp/zxing-cpp/blob/master/core/src/ConcentricFinder.h
function centerFromScanlineEnd(scanline, end) {
  const centers = [];
  const middleIndex = utils.toInt32(scanline.length / 2);
  for (let i = 0; i <= middleIndex; i++) {
    const splitIndex = middleIndex + i + 1;
    centers.push(utils.accumulate(scanline, middleIndex - i, splitIndex) / 2 + utils.accumulate(scanline, splitIndex));
  }
  return end - (centers[0] * 2 + utils.accumulate(centers, 1)) / (middleIndex + 2);
}

exports.calculateScanlineNoise = calculateScanlineNoise;
exports.centerFromScanlineEnd = centerFromScanlineEnd;
exports.getCrossScanline = getCrossScanline;
exports.getDiagonalScanline = getDiagonalScanline;
exports.scanlineUpdate = scanlineUpdate;
exports.sumScanlineNonzero = sumScanlineNonzero;

},
37:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Pattern = require(24);
const utils = require(10);
const scanline = require(36);
const pattern = require(38);

/**
 * @module PatternFinder
 */
class PatternFinder {
  #strict;
  #matrix;
  #ratios;
  #patterns = [];
  constructor(matrix, ratios, strict) {
    this.#matrix = matrix;
    this.#ratios = ratios;
    this.#strict = strict;
  }
  get matrix() {
    return this.#matrix;
  }
  get patterns() {
    return this.#patterns;
  }
  match(x, y, scanline$1, overscan) {
    const matrix = this.#matrix;
    const ratios = this.#ratios;
    let centerX = scanline.centerFromScanlineEnd(scanline$1, x);
    const [centerY, vertical] = pattern.alignCrossPattern(matrix, centerX, y, overscan, ratios, true);
    if (centerY >= 0) {
      let horizontal;
      // Re-horizontal check.
      [centerX, horizontal] = pattern.alignCrossPattern(matrix, centerX, centerY, overscan, ratios);
      if (centerX >= 0) {
        const slash = scanline.getDiagonalScanline(matrix, centerX, centerY, overscan);
        const backslash = scanline.getDiagonalScanline(matrix, centerX, centerY, overscan, true);
        if (pattern.isDiagonalScanlineCheckPassed(slash, backslash, ratios, this.#strict)) {
          const noise = pattern.calculatePatternNoise(ratios, horizontal, vertical, slash, backslash);
          const width = utils.accumulate(horizontal);
          const height = utils.accumulate(vertical);
          const patterns = this.#patterns;
          const { length } = patterns;
          let combined = false;
          for (let i = 0; i < length; i++) {
            const pattern = patterns[i];
            // Look for about the same center and module size.
            if (Pattern.Pattern.equals(pattern, centerX, centerY, width, height)) {
              combined = true;
              patterns[i] = Pattern.Pattern.combine(pattern, centerX, centerY, width, height, noise);
              break;
            }
          }
          // Hadn't found this before; save it.
          if (!combined) {
            patterns.push(new Pattern.Pattern(ratios, centerX, centerY, width, height, noise));
          }
        }
      }
    }
  }
}

exports.PatternFinder = PatternFinder;

},
38:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);
const constants = require(39);
const scanline = require(36);

/**
 * @module pattern
 */
function isDiagonalScanlineCheckPassed(slash, backslash, ratios, strict) {
  return strict
    ? isMatchPattern(slash, ratios) && isMatchPattern(backslash, ratios)
    : isMatchPattern(slash, ratios) || isMatchPattern(backslash, ratios);
}
function alignCrossPattern(matrix, x, y, overscan, ratios, isVertical) {
  const [scanline$1, end] = scanline.getCrossScanline(matrix, x, y, overscan, isVertical);
  return [isMatchPattern(scanline$1, ratios) ? scanline.centerFromScanlineEnd(scanline$1, end) : NaN, scanline$1];
}
function isEqualsSize(size1, size2, ratio) {
  if (size1 > size2) {
    [size1, size2] = [size2, size1];
  }
  return size2 - size1 <= size2 * ratio;
}
function isMatchPattern(scanline$1, { ratios, modules }) {
  const { length } = scanline$1;
  const scanlineTotal = scanline.sumScanlineNonzero(scanline$1);
  if (scanlineTotal >= modules) {
    const moduleSize = scanlineTotal / modules;
    const threshold = moduleSize * constants.DIFF_PATTERN_RATIO + constants.DIFF_PATTERN_ALLOWANCE;
    // Allow less than DIFF_PATTERN_RATIO variance from 1-1-3-1-1 or 1-1-1-1-1 proportions.
    for (let i = 0; i < length; i++) {
      const ratio = ratios[i];
      const count = scanline$1[i];
      const countDiff = Math.abs(count - moduleSize * ratio);
      if (countDiff > threshold) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function calculatePatternNoise(ratios, ...scanlines) {
  let noises = 0;
  let averageNoises = 0;
  const { length } = scanlines;
  const averages = [];
  // scanline length must be equals ratios length.
  for (const scanline$1 of scanlines) {
    const [noise, average] = scanline.calculateScanlineNoise(scanline$1, ratios);
    noises += noise;
    averages.push(average);
  }
  const total = utils.accumulate(averages);
  const averagesAvg = total / length;
  for (const average of averages) {
    averageNoises += Math.abs(average - averagesAvg);
  }
  return noises + averageNoises / total;
}

exports.alignCrossPattern = alignCrossPattern;
exports.calculatePatternNoise = calculatePatternNoise;
exports.isDiagonalScanlineCheckPassed = isDiagonalScanlineCheckPassed;
exports.isEqualsSize = isEqualsSize;
exports.isMatchPattern = isMatchPattern;

},
39:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

/**
 * @module constants
 */
const RADIAN = Math.PI / 180;
// Diff pattern.
const DIFF_PATTERN_RATIO = 0.625;
const DIFF_PATTERN_ALLOWANCE = 0.5;
// Diff module size.
const DIFF_MODULE_SIZE_RATIO = 0.5;
// Top left min and max angle.
const MIN_TOP_LEFT_ANGLE = RADIAN * 40;
const MAX_TOP_LEFT_ANGLE = RADIAN * 140;

exports.DIFF_MODULE_SIZE_RATIO = DIFF_MODULE_SIZE_RATIO;
exports.DIFF_PATTERN_ALLOWANCE = DIFF_PATTERN_ALLOWANCE;
exports.DIFF_PATTERN_RATIO = DIFF_PATTERN_RATIO;
exports.MAX_TOP_LEFT_ANGLE = MAX_TOP_LEFT_ANGLE;
exports.MIN_TOP_LEFT_ANGLE = MIN_TOP_LEFT_ANGLE;

},
40:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const Pattern = require(24);
const Point = require(25);
const scanline = require(36);
const constants = require(39);
const PatternFinder = require(37);
const pattern = require(38);
const PatternRatios = require(34);

/**
 * @module AlignmentPatternFinder
 */
class AlignmentPatternFinder extends PatternFinder.PatternFinder {
  constructor(matrix, strict) {
    super(matrix, PatternRatios.ALIGNMENT_PATTERN_RATIOS, strict);
  }
  filter(expectAlignment, moduleSize) {
    const patterns = this.patterns.filter(pattern$1 => {
      return (
        Pattern.Pattern.noise(pattern$1) <= 2.5 &&
        pattern.isEqualsSize(pattern$1.moduleSize, moduleSize, constants.DIFF_MODULE_SIZE_RATIO)
      );
    });
    if (patterns.length > 1) {
      patterns.sort((pattern1, pattern2) => {
        const noise1 = Pattern.Pattern.noise(pattern1);
        const noise2 = Pattern.Pattern.noise(pattern2);
        const moduleSizeDiff1 = Math.abs(pattern1.moduleSize - moduleSize);
        const moduleSizeDiff2 = Math.abs(pattern2.moduleSize - moduleSize);
        const score1 = (Point.distance(pattern1, expectAlignment) + moduleSizeDiff1) * noise1;
        const score2 = (Point.distance(pattern2, expectAlignment) + moduleSizeDiff2) * noise2;
        return score1 - score2;
      });
    }
    // Only use the first two patterns.
    const alignmentPatterns = patterns.slice(0, 2);
    // Add expect alignment for fallback.
    alignmentPatterns.push(expectAlignment);
    return alignmentPatterns;
  }
  find(left, top, width, height) {
    const { matrix } = this;
    const right = left + width;
    const bottom = top + height;
    const match = (x, y, scanline$1, count, scanlineBits, lastBit) => {
      scanline.scanlineUpdate(scanline$1, count);
      scanline.scanlineUpdate(scanlineBits, lastBit);
      // Match pattern when white-black-white.
      if (
        scanlineBits[0] === 0 &&
        scanlineBits[1] === 1 &&
        scanlineBits[2] === 0 &&
        pattern.isMatchPattern(scanline$1, PatternRatios.ALIGNMENT_PATTERN_LOOSE_MODE_RATIOS)
      ) {
        this.match(x, y, scanline$1, scanline$1[1]);
      }
    };
    for (let y = top; y < bottom; y++) {
      let x = left;
      // Burn off leading white pixels before anything else; if we start in the middle of
      // a white run, it doesn't make sense to count its length, since we don't know if the
      // white run continued to the left of the start point.
      while (x < right && !matrix.get(x, y)) {
        x++;
      }
      let count = 0;
      let lastBit = matrix.get(x, y);
      const scanline = [0, 0, 0];
      const scanlineBits = [-1, -1, -1];
      while (x < right) {
        const bit = matrix.get(x, y);
        if (bit === lastBit) {
          count++;
        } else {
          match(x, y, scanline, count, scanlineBits, lastBit);
          count = 1;
          lastBit = bit;
        }
        x++;
      }
      match(x, y, scanline, count, scanlineBits, lastBit);
    }
  }
}

exports.AlignmentPatternFinder = AlignmentPatternFinder;

},
41:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const histogram = require(42);
const BitMatrix = require(16);

/**
 * @module index
 */
const BLOCK_SIZE_POWER = 3;
const MIN_DYNAMIC_RANGE = 24;
const BLOCK_SIZE = 1 << BLOCK_SIZE_POWER;
const BLOCK_SIZE_MASK = BLOCK_SIZE - 1;
const MINIMUM_DIMENSION = BLOCK_SIZE * 5;
function calculateSubSize(size) {
  let subSize = size >> BLOCK_SIZE_POWER;
  if (size & BLOCK_SIZE_MASK) {
    subSize++;
  }
  return subSize;
}
function clamp(value, max) {
  return value < 2 ? 2 : Math.min(value, max);
}
function calculateOffset(offset, max) {
  offset = offset << BLOCK_SIZE_POWER;
  return offset > max ? max : offset;
}
function calculateBlackPoints(luminances, width, height) {
  const blackPoints = [];
  const maxOffsetX = width - BLOCK_SIZE;
  const maxOffsetY = height - BLOCK_SIZE;
  const subWidth = calculateSubSize(width);
  const subHeight = calculateSubSize(height);
  for (let y = 0; y < subHeight; y++) {
    blackPoints[y] = new Int32Array(subWidth);
    const offsetY = calculateOffset(y, maxOffsetY);
    for (let x = 0; x < subWidth; x++) {
      let sum = 0;
      let max = 0;
      let min = 0xff;
      const offsetX = calculateOffset(x, maxOffsetX);
      for (let y1 = 0, offset = offsetY * width + offsetX; y1 < BLOCK_SIZE; y1++, offset += width) {
        for (let x1 = 0; x1 < BLOCK_SIZE; x1++) {
          const luminance = luminances[offset + x1];
          sum += luminance;
          // still looking for good contrast.
          if (luminance < min) {
            min = luminance;
          }
          if (luminance > max) {
            max = luminance;
          }
        }
        // short-circuit min/max tests once dynamic range is met.
        if (max - min > MIN_DYNAMIC_RANGE) {
          // finish the rest of the rows quickly.
          for (y1++, offset += width; y1 < BLOCK_SIZE; y1++, offset += width) {
            for (let x1 = 0; x1 < BLOCK_SIZE; x1++) {
              sum += luminances[offset + x1];
            }
          }
        }
      }
      // The default estimate is the average of the values in the block.
      let average = sum >> (BLOCK_SIZE_POWER * 2);
      if (max - min <= MIN_DYNAMIC_RANGE) {
        // If variation within the block is low, assume this is a block with only light or only
        // dark pixels. In that case we do not want to use the average, as it would divide this
        // low contrast area into black and white pixels, essentially creating data out of noise.
        //
        // The default assumption is that the block is light/background. Since no estimate for
        // the level of dark pixels exists locally, use half the min for the block.
        average = min / 2;
        if (y > 0 && x > 0) {
          // Correct the "white background" assumption for blocks that have neighbors by comparing
          // the pixels in this block to the previously calculated black points. This is based on
          // the fact that dark barcode symbology is always surrounded by some amount of light
          // background for which reasonable black point estimates were made. The bp estimated at
          // the boundaries is used for the interior.
          // The (min < bp) is arbitrary but works better than other heuristics that were tried.
          const averageNeighborBlackPoint = (blackPoints[y - 1][x] + 2 * blackPoints[y][x - 1] + blackPoints[y - 1][x - 1]) / 4;
          if (min < averageNeighborBlackPoint) {
            average = averageNeighborBlackPoint;
          }
        }
      }
      blackPoints[y][x] = average;
    }
  }
  return blackPoints;
}
function adaptiveThreshold(luminances, width, height) {
  const maxOffsetX = width - BLOCK_SIZE;
  const maxOffsetY = height - BLOCK_SIZE;
  const subWidth = calculateSubSize(width);
  const subHeight = calculateSubSize(height);
  const matrix = new BitMatrix.BitMatrix(width, height);
  const blackPoints = calculateBlackPoints(luminances, width, height);
  for (let y = 0; y < subHeight; y++) {
    const top = clamp(y, subHeight - 3);
    const offsetY = calculateOffset(y, maxOffsetY);
    for (let x = 0; x < subWidth; x++) {
      let sum = 0;
      const left = clamp(x, subWidth - 3);
      const offsetX = calculateOffset(x, maxOffsetX);
      for (let z = -2; z <= 2; z++) {
        const blackRow = blackPoints[top + z];
        sum += blackRow[left - 2] + blackRow[left - 1] + blackRow[left] + blackRow[left + 1] + blackRow[left + 2];
      }
      const average = sum / 25;
      for (let y = 0, offset = offsetY * width + offsetX; y < BLOCK_SIZE; y++, offset += width) {
        for (let x = 0; x < BLOCK_SIZE; x++) {
          // Comparison needs to be <= so that black == 0 pixels are black even if the threshold is 0.
          if (luminances[offset + x] <= average) {
            matrix.set(offsetX + x, offsetY + y);
          }
        }
      }
    }
  }
  return matrix;
}
/**
 * @function grayscale
 * @description Convert an image to grayscale.
 * @param image The image data to convert.
 */
function grayscale({ data, width, height }) {
  const pixels = width * height;
  const luminances = new Uint8Array(width * height);
  for (let i = 0; i < pixels; i++) {
    const colorIndex = i * 4;
    const r = data[colorIndex];
    const g = data[colorIndex + 1];
    const b = data[colorIndex + 2];
    // 0.299R + 0.587G + 0.114B (YUV/YIQ for PAL and NTSC),
    // (R * 306) >> 10 is approximately equal to R * 0.299, and so on.
    // 0x200 >> 10 is 0.5, it implements rounding.
    luminances[i] = (r * 306 + g * 601 + b * 117 + 0x200) >> 10;
  }
  return luminances;
}
/**
 * @function binarize
 * @description Convert the image to a binary matrix.
 * @param luminances The luminances of the image.
 * @param width The width of the image.
 * @param height The height of the image.
 */
function binarize(luminances, width, height) {
  if (luminances.length !== width * height) {
    throw new Error('luminances length must be equals to width * height');
  }
  if (width < MINIMUM_DIMENSION || height < MINIMUM_DIMENSION) {
    return histogram.histogram(luminances, width, height);
  } else {
    return adaptiveThreshold(luminances, width, height);
  }
}

exports.binarize = binarize;
exports.grayscale = grayscale;

},
42:function(module,exports,require){
/**
 * @module QRCode
 * @package @nuintun/qrcode
 * @license MIT
 * @version 5.0.3
 * @author nuintun <nuintun@qq.com>
 * @description A pure JavaScript QRCode encode and decode library.
 * @see https://github.com/nuintun/qrcode#readme
 */

'use strict';

const utils = require(10);
const BitMatrix = require(16);

/**
 * @module histogram
 */
const LUMINANCE_BITS = 5;
const LUMINANCE_SHIFT = 8 - LUMINANCE_BITS;
const LUMINANCE_BUCKETS = 1 << LUMINANCE_BITS;
function calculateBlackPoint(buckets) {
  let firstPeak = 0;
  let firstPeakSize = 0;
  let maxBucketCount = 0;
  // Find the tallest peak in the histogram.
  const { length } = buckets;
  for (let x = 0; x < length; x++) {
    if (buckets[x] > firstPeakSize) {
      firstPeak = x;
      firstPeakSize = buckets[x];
    }
    if (buckets[x] > maxBucketCount) {
      maxBucketCount = buckets[x];
    }
  }
  // Find the second-tallest peak which is somewhat far from the tallest peak.
  let secondPeak = 0;
  let secondPeakScore = 0;
  for (let x = 0; x < length; x++) {
    const distanceToBiggest = x - firstPeak;
    // Encourage more distant second peaks by multiplying by square of distance.
    const score = buckets[x] * distanceToBiggest * distanceToBiggest;
    if (score > secondPeakScore) {
      secondPeak = x;
      secondPeakScore = score;
    }
  }
  // Make sure firstPeak corresponds to the black peak.
  if (firstPeak > secondPeak) {
    [firstPeak, secondPeak] = [secondPeak, firstPeak];
  }
  // If there is too little contrast in the image to pick a meaningful black point, throw rather
  // than waste time trying to decode the image, and risk false positives.
  if (secondPeak - firstPeak <= LUMINANCE_BUCKETS / 16) {
    return -1;
  }
  // Find a valley between them that is low and closer to the white peak.
  let bestValleyScore = -1;
  let bestValley = secondPeak - 1;
  for (let x = secondPeak - 1; x > firstPeak; x--) {
    const fromFirst = x - firstPeak;
    const score = fromFirst * fromFirst * (secondPeak - x) * (maxBucketCount - buckets[x]);
    if (score > bestValleyScore) {
      bestValley = x;
      bestValleyScore = score;
    }
  }
  return bestValley << LUMINANCE_SHIFT;
}
function histogram(luminances, width, height) {
  const leftX = utils.toInt32(width / 5);
  const rightX = utils.toInt32((width * 4) / 5);
  const matrix = new BitMatrix.BitMatrix(width, height);
  const buckets = new Int32Array(LUMINANCE_BUCKETS);
  for (let y = 1; y < 5; y++) {
    const offset = utils.toInt32((height * y) / 5) * width;
    for (let x = leftX; x < rightX; x++) {
      const pixel = luminances[offset + x];
      buckets[pixel >> LUMINANCE_SHIFT]++;
    }
  }
  const blackPoint = calculateBlackPoint(buckets);
  // We delay reading the entire image luminance until the black point estimation succeeds.
  // Although we end up reading four rows twice, it is consistent with our motto of
  // "fail quickly" which is necessary for continuous scanning.
  if (blackPoint > 0) {
    let offset = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (luminances[offset + x] < blackPoint) {
          matrix.set(x, y);
        }
      }
      offset += width;
    }
  }
  return matrix;
}

exports.histogram = histogram;

}};const cache={};function requireBundled(id){if(cache[id])return cache[id].exports;const module={exports:{}};cache[id]=module;modules[id](module,module.exports,requireBundled);return module.exports;}
module.exports={...requireBundled(0),...requireBundled(23),...requireBundled(41)};

// vitest.setup.ts
import { TextEncoder, TextDecoder } from "util";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock File API for Node.js with proper arrayBuffer support
if (typeof File === "undefined") {
  global.File = class File {
    name: string;
    type: string;
    size: number;
    private content: Buffer;

    constructor(bits: any[], name: string, options?: { type?: string }) {
      this.name = name;
      this.type = options?.type || "";

      // Convert bits to Buffer
      if (bits.length === 0) {
        this.content = Buffer.alloc(0);
      } else if (Buffer.isBuffer(bits[0])) {
        this.content = bits[0];
      } else if (typeof bits[0] === "string") {
        this.content = Buffer.from(bits[0]);
      } else {
        this.content = Buffer.concat(
          bits.map((bit) => (Buffer.isBuffer(bit) ? bit : Buffer.from(bit))),
        );
      }

      this.size = this.content.length;
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      return this.content.buffer.slice(
        this.content.byteOffset,
        this.content.byteOffset + this.content.byteLength,
      ) as ArrayBuffer;
    }

    async text(): Promise<string> {
      return this.content.toString("utf-8");
    }
  } as any;
}

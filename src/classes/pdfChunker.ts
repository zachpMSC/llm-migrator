import { ChunkingModule, Chunk } from "../types";

export class PDFChunker implements ChunkingModule {
  private _file: File;

  constructor(file: File) {
    this._file = file;
  }

  get file() {
    return this._file;
  }

  static async create(file: File): Promise<PDFChunker> {
    const chunker = new PDFChunker(file);
    return chunker;
  }

  async chunkDocument(): Promise<Chunk[]> {
    return [];
  }
}

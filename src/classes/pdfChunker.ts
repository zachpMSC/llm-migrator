import { ChunkingModule, Chunk } from "../types";

export class PDFChunker implements ChunkingModule {
  private _file: File;

  constructor(file: File) {
    this._file = file;
  }

  static async create(file: File): Promise<PDFChunker> {
    const chunker = new PDFChunker(file);
    console.log("Created PDFChunker instance for file:", chunker._file.name);
    return chunker;
  }

  async chunkDocument(): Promise<Chunk[]> {
    return [];
  }
}

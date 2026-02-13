import { ChunkingModule, Chunk } from "../types";

export class WordChunker implements ChunkingModule {
  private _file: File;

  constructor(file: File) {
    this._file = file;
  }

  static async create(file: File): Promise<WordChunker> {
    const chunker = new WordChunker(file);
    console.log("Created WordChunker instance for file:", chunker._file.name);
    return chunker;
  }

  async chunkDocument(): Promise<Chunk[]> {
    return [];
  }
}

import { ChunkingModule, Chunk } from "../types";

export class WordChunker implements ChunkingModule {
  private _file: File;

  /* ----- CONSTRUCTOR ----- */
  constructor(file: File) {
    this._file = file;
  }

  /* ----- GETTERS ----- */
  get file() {
    return this._file;
  }

  /* ----- STATIC INTERFACE ----- */
  static async create(file: File): Promise<WordChunker> {
    const chunker = new WordChunker(file);
    return chunker;
  }

  /* ----- INSTANCE METHODS ----- */
  public async chunkDocument(): Promise<Chunk[]> {
    return [];
  }
}

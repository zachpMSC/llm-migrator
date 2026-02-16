import { ChunkingModule, Chunk, DocumentHeaderMetadata } from "../types";

export class PDFChunker implements ChunkingModule {
  private _file: File;
  private _documentMetadata: DocumentHeaderMetadata | null = null;

  /* ----- CONSTRUCTOR ----- */
  constructor(file: File) {
    this._file = file;
  }

  /* ----- GETTERS ----- */
  get file() {
    return this._file;
  }

  get documentMetadata() {
    return this._documentMetadata;
  }

  /* ----- STATIC FACTORY ----- */
  static async create(file: File): Promise<PDFChunker> {
    const chunker = new PDFChunker(file);
    return chunker;
  }

  /* ----- PUBLIC METHODS ----- */
  public async chunkDocument(): Promise<Chunk[]> {
    return [];
  }

  /* ----- PRIVATE METHODS ----- */
}

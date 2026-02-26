import { Chunk } from "../types";
import { PDFParse, TextResult } from "pdf-parse";
import { BaseChunker } from "./baseChunker";

export class PDFChunker extends BaseChunker {
  private _file: File;
  private _parsedText: TextResult | null = null;

  /* ----- CONSTRUCTOR ----- */
  constructor(file: File) {
    super();
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
    if (file.size === 0) {
      throw new Error("Cannot create PDFChunker: file is empty.");
    }
    const chunker = new PDFChunker(file);

    const parser = new PDFParse({ data: await chunker.file.arrayBuffer() });
    chunker._parsedText = await parser.getText();
    chunker._documentMetadata = chunker._extractDocumentMetadata(
      chunker._parsedText,
    );

    return chunker;
  }

  /* ----- PUBLIC METHODS ----- */
  public async chunkDocument(): Promise<Chunk[]> {
    // Step 1: Extract text from PDF (already done in factory) and verify it exists
    const result = this._parsedText?.text;
    if (!result) {
      throw new Error("No text found in PDF document.");
    }

    // Step 2: Apply cleansing functions to remove metadata header and page markers
    const cleansedText = this._cleanseText(result);

    // Step 3: Chunk by logical sections (paragraphs + tables as units)
    const chunks = this._chunkByParagraphsAndTables(cleansedText);

    return chunks;
  }

  /* ----- PRIVATE METHODS ----- */
  private _extractDocumentMetadata(text: TextResult) {
    return {
      documentTitle:
        text.text.match(/Procedure Title:\s*(.+)/i)?.[1]?.trim() ?? "unknown",
      documentNumber:
        text.text.match(/Number:\s*(\S+)/i)?.[1]?.trim() ?? "unknown",
      effectiveDate:
        text.text.match(/Effective:\s*(.+?)(?=Revision:|$)/i)?.[1]?.trim() ??
        "unknown",
      revision: text.text.match(/Revision:\s*(\S+)/i)?.[1]?.trim() ?? "unknown",
    };
  }

  private _cleanseText(text: string): string {
    const cleansingFunctions = [
      this._removeMetadataHeader,
      this._removePageMarkers,
    ];

    return cleansingFunctions.reduce((acc, fn) => fn.call(this, acc), text);
  }

  private _removeMetadataHeader(text: string): string {
    return text
      .replace(/Procedure Title:.*\n/i, "")
      .replace(/Number:.*Effective:.*Revision:.*\n/i, "")
      .trim();
  }

  private _removePageMarkers(text: string): string {
    return text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "").trim();
  }
}

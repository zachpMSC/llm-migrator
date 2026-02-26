import { Chunk, DocumentHeaderMetadata } from "../types";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import mammoth from "mammoth";
import { convert } from "html-to-text";
import { BaseChunker } from "./baseChunker";

export class WordChunker extends BaseChunker {
  private _file: File;

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
  static async create(file: File): Promise<WordChunker> {
    if (file.size === 0) {
      throw new Error("Cannot create WordChunker: file is empty.");
    }
    const chunker = new WordChunker(file);
    chunker._documentMetadata = await chunker._extractHeaderMetadata();
    return chunker;
  }

  /* ----- PUBLIC METHODS ----- */
  public async chunkDocument(): Promise<Chunk[]> {
    // Step 1: Parse document body with Mammoth
    const arrayBuffer = await this._file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.convertToHtml({ buffer });

    // Step 2: Convert tables to markdown BEFORE converting to text
    let html = result.value;
    html = this._convertTablesToMarkdown(html);

    // Step 3: Convert HTML to text
    let text = convert(html, { wordwrap: false });

    // Step 4: Apply cleansing functions
    const cleansedText = this._cleanseText(text);

    // Step 5: Chunk by logical sections (paragraphs + tables as units)
    const chunks = this._chunkByParagraphsAndTables(cleansedText);

    return chunks;
  }

  /* ----- PRIVATE METHODS ----- */

  /**
   * Converts HTML tables to markdown format for better readability
   */
  private _convertTablesToMarkdown(html: string): string {
    return html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
      const rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];

      if (rows.length === 0) return "";

      let markdown = "\n\n";

      rows.forEach((row, rowIndex) => {
        const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
        const cellTexts = cells.map((cell) =>
          cell
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
        );

        // Add cells
        markdown += "| " + cellTexts.join(" | ") + " |\n";

        // Add separator after header row
        if (rowIndex === 0) {
          markdown += "| " + cellTexts.map(() => "---").join(" | ") + " |\n";
        }
      });

      return markdown + "\n";
    });
  }

  /**
   * Remove base64 image data from text
   */
  private _removeImgTagsFromText(text: string): string {
    return text.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, "[IMAGE]");
  }

  /**
   * Normalize signature lines with descriptive placeholders
   */
  private _normalizeSignatureLines(text: string): string {
    const replacements = [
      {
        pattern: /Date:\s*_{5,}/gi,
        replacement: "Date: [SIGNATURE DATE REQUIRED]",
      },
      { pattern: /Name:\s*_{5,}/gi, replacement: "Name: [SIGNATURE FIELD]" },
      { pattern: /Title:\s*_{5,}/gi, replacement: "Title: [TO BE FILLED]" },
      {
        pattern: /Signature:\s*_{5,}/gi,
        replacement: "Signature: [SIGNATURE REQUIRED]",
      },
      {
        pattern: /Comments?:\s*_{5,}/gi,
        replacement: "Comments: [TO BE FILLED]",
      },
      {
        pattern: /([A-Za-z\s]*Approval):\s*_{5,}/gi,
        replacement: "$1: [APPROVAL SIGNATURE REQUIRED]",
      },
      { pattern: /([A-Za-z\s]+):\s*_{5,}/g, replacement: "$1: [TO BE FILLED]" },
      { pattern: /_{10,}/g, replacement: "[SIGNATURE LINE]" },
    ];

    return replacements.reduce(
      (result, { pattern, replacement }) =>
        result.replace(pattern, replacement),
      text,
    );
  }

  /**
   * Extracts document metadata from the Word document header
   */
  private async _extractHeaderMetadata(): Promise<DocumentHeaderMetadata> {
    const arrayBuffer = await this._file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const headerFile = zip.file("word/header1.xml");
    if (!headerFile) {
      throw new Error("Header file not found in document");
    }

    const headerXml = await headerFile.async("text");
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
    });
    const headerData = parser.parse(headerXml);

    return this._parseHeaderTable(headerData);
  }

  /**
   * Parses the header table structure to extract metadata fields
   */
  private _parseHeaderTable(headerData: any): DocumentHeaderMetadata {
    const table = headerData["w:hdr"]["w:tbl"];
    const rows = table["w:tr"];

    // Row 1, Cell 2 (index 1) - Procedure Title
    const titleCell = rows[0]["w:tc"][1];
    const procedureTitle = this._extractTextFromCell(titleCell);

    // Row 2 - Number, Effective, Revision
    const row2 = rows[1]["w:tc"];
    const numberCell = row2[1];
    const documentNumber = this._extractTextFromCell(numberCell);
    const effectiveCell = row2[2];
    const effectiveDate = this._extractTextFromCell(effectiveCell);
    const revisionCell = row2[3];
    const revision = this._extractTextFromCell(revisionCell);

    return {
      documentTitle: procedureTitle,
      documentNumber: documentNumber,
      effectiveDate: effectiveDate,
      revision: revision,
    };
  }

  /**
   * Extracts text content from a table cell
   */
  private _extractTextFromCell(cell: any): string {
    const paragraph = cell["w:p"];
    let text = "";

    // Extract from regular text runs (w:r)
    if (paragraph["w:r"]) {
      const runs = Array.isArray(paragraph["w:r"])
        ? paragraph["w:r"]
        : [paragraph["w:r"]];
      for (const run of runs) {
        if (run["w:t"] !== undefined) {
          let textContent;

          if (
            typeof run["w:t"] === "string" ||
            typeof run["w:t"] === "number"
          ) {
            textContent = run["w:t"];
          } else if (
            typeof run["w:t"] === "object" &&
            run["w:t"]["#text"] !== undefined
          ) {
            textContent = run["w:t"]["#text"];
          }

          if (textContent !== undefined && textContent !== null) {
            text += String(textContent);
          }
        }
      }
    }

    // Extract from field values (w:fldSimple)
    if (paragraph["w:fldSimple"]) {
      const field = paragraph["w:fldSimple"];
      if (field["w:r"] && field["w:r"]["w:t"] !== undefined) {
        let fieldText;

        if (
          typeof field["w:r"]["w:t"] === "string" ||
          typeof field["w:r"]["w:t"] === "number"
        ) {
          fieldText = field["w:r"]["w:t"];
        } else if (
          typeof field["w:r"]["w:t"] === "object" &&
          field["w:r"]["w:t"]["#text"] !== undefined
        ) {
          fieldText = field["w:r"]["w:t"]["#text"];
        }

        if (fieldText !== undefined && fieldText !== null) {
          text += String(fieldText);
        }
      }
    }

    // Clean up the text
    text = text
      .replace(/^(Procedure Title:|Number:|Effective:|Revision:)\s*/i, "")
      .trim();

    return text;
  }

  /**
   * Applies cleansing functions to the extracted text to remove
   * unwanted artifacts and normalize formatting
   */
  private _cleanseText(text: string): string {
    const cleansingFunctions = [
      this._removeImgTagsFromText,
      this._normalizeSignatureLines,
    ];

    text = cleansingFunctions.reduce((acc, fn) => fn.call(this, acc), text);
    return text;
  }
}

import {
  ChunkingModule,
  Chunk,
  DocumentHeaderMetadata,
  SectionResult,
  Section,
} from "../types";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import mammoth from "mammoth";
import { logSectionInfo, writeToMammothOutput } from "../lib/utils";

export class WordChunker implements ChunkingModule {
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
  static async create(file: File): Promise<WordChunker> {
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

    const documentHtml = result.value; // The generated HTML

    await writeToMammothOutput(documentHtml); // Save HTML for debugging

    // 2. Identify sections using strategies
    const sectionResult = await this._identifySections(documentHtml);
    logSectionInfo(sectionResult);

    // 3. Break sections into chunks
    // 4. Build Chunk objects with metadata
    return [];
  }

  /* ----- PRIVATE METHODS ----- */
  /**
   * Extracts document metadata from the Word document header.
   * Unzips the .docx file and parses the header XML to find:
   * - Procedure Title
   * - Document Number
   * - Effective Date
   * - Revision
   *
   * @returns {Promise<DocumentHeaderMetadata>} The extracted metadata
   * @throws {Error} If header cannot be found or parsed
   */
  private async _extractHeaderMetadata(): Promise<DocumentHeaderMetadata> {
    // Step 1: Read the file as an array buffer
    const arrayBuffer = await this._file.arrayBuffer();

    // Step 2: Unzip the .docx file
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Step 3: Get the header XML file
    const headerFile = zip.file("word/header1.xml");
    if (!headerFile) {
      throw new Error("Header file not found in document");
    }

    // Step 4: Read the header XML content
    const headerXml = await headerFile.async("text");

    // Step 5: Parse the XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
    });
    const headerData = parser.parse(headerXml);

    // Step 6: Extract the metadata from the parsed XML
    const metadata = this._parseHeaderTable(headerData);

    return metadata;
  }

  /**
   * Parses the header table structure to extract metadata fields.
   *
   * @param {any} headerData - The parsed XML data
   * @returns {DocumentHeaderMetadata} The extracted metadata
   */
  private _parseHeaderTable(headerData: any): DocumentHeaderMetadata {
    const table = headerData["w:hdr"]["w:tbl"];
    const rows = table["w:tr"];

    // Row 1, Cell 2 (index 1) - Procedure Title
    const titleCell = rows[0]["w:tc"][1];
    const procedureTitle = this._extractTextFromCell(titleCell);

    // Row 2 - Number, Effective, Revision
    const row2 = rows[1]["w:tc"];

    // Cell 2 (index 1) - Number
    const numberCell = row2[1];
    const documentNumber = this._extractTextFromCell(numberCell);

    // Cell 3 (index 2) - Effective Date
    const effectiveCell = row2[2];
    const effectiveDate = this._extractTextFromCell(effectiveCell);

    // Cell 4 (index 3) - Revision
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
   * Extracts text content from a table cell, handling both regular text
   * and field values (w:fldSimple).
   *
   * @param {any} cell - The table cell object
   * @returns {string} The extracted text
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

          // Handle different w:t formats
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
          // If it's an empty object (like {"@_xml:space": "preserve"}), skip it

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

    // Clean up the text - remove label prefixes like "Number:", "Effective:", etc.
    text = text
      .replace(/^(Procedure Title:|Number:|Effective:|Revision:)\s*/i, "")
      .trim();

    return text;
  }

  /*
      This method applies multiple strategies to identify sections in the document HTML.
  */
  private async _identifySections(
    documentHtml: string,
  ): Promise<SectionResult> {
    // Run all strategies
    const letterResult = this._applyLetterStrategy(documentHtml);
    const numberResult = this._applyNumberStrategy(documentHtml);
    // const headingResult = this._applyHeadingStrategy(documentHtml);

    // Find the one with highest confidence
    const results = [letterResult, numberResult];

    const bestResult = results.sort(
      (a, b) => b.confidence - a.confidence,
    )[0] ?? {
      strategy: "fallback",
      sections: [],
      confidence: 0,
    };

    return bestResult;
  }

  /*
    This strategy looks for <li><strong> patterns that indicate lettered sections (A, B, C, etc.).
  */
  private _applyLetterStrategy(html: string): SectionResult {
    const sections: Section[] = [];

    // Look for patterns that indicate lettered sections:
    // <li><strong>Title</strong> or <li><strong>Title.</strong>
    // We'll match these directly, assuming they're top-level sections
    const sectionRegex =
      /<li>\s*<strong>([A-Za-z\s]+?)\.?\s*<\/strong>([\s\S]*?)(?=<li>\s*<strong>[A-Za-z\s]+?\.?\s*<\/strong>|$)/gi;
    const matches = [...html.matchAll(sectionRegex)];

    if (matches.length === 0) {
      return {
        strategy: "lettered",
        sections: [],
        confidence: 0,
      };
    }

    // Check if titles look numbered (contain "1.0", "2.0", etc.)
    const hasNumberedTitles = matches.some((match) => {
      const title = match[1] ?? "";
      return /^\d+(\.\d+)?\s/.test(title.trim());
    });

    if (hasNumberedTitles) {
      return {
        strategy: "lettered",
        sections: [],
        confidence: 0,
      };
    }

    // Build sections
    matches.forEach((match, index) => {
      const title = match[1]?.trim() ?? "";
      const content = match[2]?.trim() ?? "";
      const marker = String.fromCharCode(65 + index); // A, B, C...

      sections.push({
        sectionTitle: title,
        content: content,
        heading: {
          type: "lettered",
          marker: marker,
        },
      });
    });

    // Calculate confidence
    let confidence = 0;
    if (sections.length >= 5) {
      confidence = 0.9;
    } else if (sections.length >= 3) {
      confidence = 0.7;
    } else if (sections.length >= 2) {
      confidence = 0.5;
    } else if (sections.length >= 1) {
      confidence = 0.3;
    }

    return {
      strategy: "lettered",
      sections,
      confidence,
    };
  }

  /*
    This strategy looks for <h1> tags that start with numbered patterns like "1.0", "2.0", etc.
   */
  private _applyNumberStrategy(html: string): SectionResult {
    const sections: Section[] = [];

    // Regex to match <h1> tags with numbered patterns
    const headingRegex =
      /<h1[^>]*>(?:<a[^>]*>.*?<\/a>)?(\d+(?:\.\d+)?)\s+([^<]+)<\/h1>/gi;
    const matches = [...html.matchAll(headingRegex)];

    if (matches.length === 0) {
      return {
        strategy: "numbered",
        sections: [],
        confidence: 0,
      };
    }

    // Extract content between each heading
    matches.forEach((match, index) => {
      const marker = match[1] ?? "";
      const title = match[2]?.trim() ?? "";

      // Find the start of this section's content (right after the </h1>)
      const sectionStart = (match.index ?? 0) + match[0].length;

      // Find the end of this section (start of next <h1> or end of document)
      const nextMatch = matches[index + 1];
      const sectionEnd = nextMatch?.index ?? html.length;

      // Extract all content between this heading and the next
      const content = html.substring(sectionStart, sectionEnd).trim();

      sections.push({
        sectionTitle: title,
        content: content, // This now includes ALL nested content
        heading: {
          type: "numbered",
          marker: marker,
        },
      });
    });

    // Calculate confidence based on how many sections we found
    let confidence = 0;
    if (sections.length >= 5) {
      confidence = 0.9;
    } else if (sections.length >= 3) {
      confidence = 0.7;
    } else if (sections.length >= 1) {
      confidence = 0.4;
    }

    return {
      strategy: "numbered",
      sections,
      confidence,
    };
  }
}

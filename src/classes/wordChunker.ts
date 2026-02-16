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
import { writeToMammothOutput } from "../lib/utils";

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
    console.log(sectionResult.sections.length);
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

  private _applyLetterStrategy(html: string): SectionResult {
    const sections: Section[] = [];

    // Look for root-level <ol> with <li> items that start with <strong>
    const olRegex = /<ol>([\s\S]*?)<\/ol>/gi;
    const olMatches = [...html.matchAll(olRegex)];

    if (olMatches.length === 0 || !olMatches[0]?.[1]) {
      return {
        strategy: "lettered",
        sections: [],
        confidence: 0,
      };
    }

    // Get the first (main) ordered list
    const mainList = olMatches[0][1];

    // Extract list items that start with <strong> (indicating they're section headers)
    const liRegex = /<li>\s*<strong>([^<]+)<\/strong>([\s\S]*?)<\/li>/gi;
    const liMatches = [...mainList.matchAll(liRegex)];

    // If we didn't find strong tags at the start of list items, this isn't a lettered strategy
    if (liMatches.length === 0) {
      return {
        strategy: "lettered",
        sections: [],
        confidence: 0,
      };
    }

    // Check if the strong content looks like titles (not numbered like "1.0")
    // Lettered sections typically have titles without numbers
    const hasNumberedTitles = liMatches.some((match) => {
      const strongContent = match[1] ?? "";
      return /^\d+(\.\d+)?\s/.test(strongContent); // Starts with "1.0 " or "1 "
    });

    // If they have numbered titles, this is probably NOT a lettered strategy
    if (hasNumberedTitles) {
      return {
        strategy: "lettered",
        sections: [],
        confidence: 0,
      };
    }

    // Build sections with inferred letter markers
    liMatches.forEach((match, index) => {
      const title = match[1]?.trim().replace(/\.$/, "") ?? ""; // Remove trailing period
      const content = match[2]?.trim() ?? "";

      // Map index to letter (0->A, 1->B, etc.)
      const marker = String.fromCharCode(65 + index); // 65 is 'A'

      sections.push({
        sectionTitle: title,
        content: content,
        heading: {
          type: "lettered",
          marker: marker,
        },
      });
    });

    // Calculate confidence based on:
    // 1. Number of sections found
    // 2. Whether the pattern is consistent (all <li> start with <strong>)
    const totalLiItems = (mainList.match(/<li>/g) || []).length;
    const strongLiItems = liMatches.length;
    const consistencyRatio = strongLiItems / totalLiItems;

    let confidence = 0;
    if (sections.length >= 5 && consistencyRatio > 0.8) {
      confidence = 0.9; // High confidence - many sections, consistent pattern
    } else if (sections.length >= 3 && consistencyRatio > 0.7) {
      confidence = 0.7; // Medium-high confidence
    } else if (sections.length >= 2 && consistencyRatio > 0.6) {
      confidence = 0.5; // Medium confidence
    } else if (sections.length >= 1) {
      confidence = 0.3; // Low confidence - not many sections
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

    // Regex to match <h1> tags with numbered patterns, accounting for nested <a> tags
    // Matches: <h1>...1.0 Purpose</h1> or <h1><a>...</a>1.0 Purpose</h1>
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

    // Split HTML by h1 tags to get content between sections
    const parts = html.split(/<h1[^>]*>.*?<\/h1>/gi);

    matches.forEach((match, index) => {
      const marker = match[1] ?? ""; // "1.0", "2.0", etc.
      const title = match[2]?.trim() ?? ""; // "Purpose", "Scope", etc.
      const content = parts[index + 1] || ""; // Content after this heading

      sections.push({
        sectionTitle: title,
        content: content.trim(),
        heading: {
          type: "numbered",
          marker: marker,
        },
      });
    });

    // Calculate confidence based on how many sections we found
    let confidence = 0;
    if (sections.length >= 5) {
      confidence = 0.9; // High confidence - many numbered sections
    } else if (sections.length >= 3) {
      confidence = 0.7; // Medium-high confidence
    } else if (sections.length >= 1) {
      confidence = 0.4; // Low confidence - only a few
    }

    return {
      strategy: "numbered",
      sections,
      confidence,
    };
  }

  // private _applyHeadingStrategy(html: string): SectionResult {
  //   // Parse heading-based sections
  //   return {} as SectionResult;
  // }
}

import { Chunk, DocumentHeaderMetadata, chunkingModule } from "../types";

export abstract class BaseChunker implements chunkingModule {
  protected _documentMetadata: DocumentHeaderMetadata | null = null;

  /**
   * Chunk text by paragraphs and tables, keeping tables intact with overlap
   */
  protected _chunkByParagraphsAndTables(text: string): Chunk[] {
    // Split on double newlines (paragraphs) but keep markdown tables together
    const sections = text.split(/\n\n+/).filter((s) => s.trim().length > 0);
    const chunks: Chunk[] = [];
    const targetWords = 400;
    const overlapWords = 50;

    let i = 0;
    let chunkIndex = 0;

    while (i < sections.length) {
      const currentSections: string[] = [];
      let wordCount = 0;

      // Build chunk until we hit target word count
      while (i < sections.length && wordCount < targetWords) {
        const section = sections[i];

        // Type guard: ensure section is defined
        if (!section) {
          i++;
          continue;
        }

        const sectionWords = this._countWords(section);
        const isTable = section.trim().startsWith("|");

        // Always include at least one section
        if (currentSections.length === 0) {
          currentSections.push(section);
          wordCount += sectionWords;
          i++;

          // If it's a table, stop here and make it its own chunk
          if (isTable) {
            break;
          }
        }
        // If this section would exceed target by too much, stop
        else if (wordCount + sectionWords > targetWords * 1.2) {
          break;
        }
        // If it's a table, save current chunk and start new one with table
        else if (isTable) {
          break;
        }
        // Otherwise add to current chunk
        else {
          currentSections.push(section);
          wordCount += sectionWords;
          i++;
        }
      }

      // Create chunk from collected sections
      const chunkContent = currentSections.join("\n\n");
      chunks.push(this._createChunk(chunkContent, chunkIndex++));

      // Create overlap for next chunk (skip if last chunk was a table)
      const lastSection = currentSections[currentSections.length - 1];
      const lastWasTable = lastSection?.trim().startsWith("|") ?? false;

      if (!lastWasTable && i < sections.length) {
        // Backtrack to create overlap
        let overlapCount = 0;
        let backtrackSteps = 0;

        // Count backwards until we have ~50 words
        while (
          overlapCount < overlapWords &&
          backtrackSteps < currentSections.length - 1
        ) {
          backtrackSteps++;
          const overlapSection = sections[i - backtrackSteps];
          if (overlapSection) {
            overlapCount += this._countWords(overlapSection);
          }
        }

        // Move index back for overlap
        i -= backtrackSteps;
      }
    }

    return chunks;
  }
  /**
   * Create a Chunk object with metadata
   */
  protected _createChunk(content: string, index: number): Chunk {
    const isTable = content.trim().startsWith("|");

    return {
      id: `${this._documentMetadata?.documentNumber ?? "doc"}_chunk_${index}`,
      text: content,
      documentTitle: this._documentMetadata?.documentTitle ?? "",
      documentNumber: this._documentMetadata?.documentNumber ?? "",
      effectiveDate: this._documentMetadata?.effectiveDate ?? "",
      revision: this._documentMetadata?.revision ?? "",
      chunkIndex: index,
      wordCount: this._countWords(content),
      contentType: isTable ? "table" : "text",
      createdAt: new Date(),
    };
  }

  /**
   * Count words in text
   */
  protected _countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  abstract chunkDocument(): Promise<Chunk[]>;
}

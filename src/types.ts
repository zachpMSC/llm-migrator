export type Strategy = "lettered" | "numbered" | "heading" | "fallback";

export type Confidence = number; // 0-1 scale

export type Section = {
  sectionTitle: string;
  content: string;
  heading: { type: Strategy; marker?: string };
};

export type SectionResult = {
  strategy: Strategy;
  sections: Section[];
  confidence: Confidence; // Now a number
};

export type DocumentHeaderMetadata = {
  documentTitle: string;
  documentNumber: string;
  revision: string;
  effectiveDate: string;
};

export type Chunk = {
  id: string; // ID for the chunk, could be a UUID or a combination of document ID and chunk index
  text: string; // actual chunk content

  // document-level metadata
  documentTitle: string;
  documentNumber: string;
  revision: string;
  effectiveDate: string;

  // chunking metadata
  chunkIndex: number; // order within section
  wordCount: number;
  contentType: "text" | "table";

  // audit / lifecycle
  createdAt: Date;
};

export interface ChunkingModule {
  chunkDocument(): Promise<Chunk[]>;
}

export interface ReplacementRule {
  pattern: RegExp;
  replacement: string;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

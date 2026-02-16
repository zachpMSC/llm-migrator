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
  id: string; // UUID
  text: string; // actual chunk content

  // document-level metadata
  documentTitle: string;
  documentNumber: string;
  revision: string;
  effectiveDate: string;

  // section-level metadata
  sectionTitle?: string;
  headingType?: Strategy; // lettered | title | fallback
  headingMarker?: string; // "A", "Dress Code Policy", etc.

  // chunking metadata
  chunkIndex: number; // order within section
  totalChunksInSection?: number;

  // audit / lifecycle
  createdAt: Date;
};

export interface ChunkingModule {
  chunkDocument(): Promise<Chunk[]>;
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createChunkerModule } from "../../src/lib/createChunkerModule";
import { PDFChunker } from "../../src/classes/pdfChunker";
import { WordChunker } from "../../src/classes/wordChunker";

// Mock WordChunker to avoid needing real .docx files
vi.mock("../../src/classes/wordChunker", () => ({
  WordChunker: {
    create: vi.fn().mockResolvedValue({
      chunkDocument: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe("createChunkerModule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PDF files", () => {
    it("should return a PDFChunker instance for PDF files", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const chunker = await createChunkerModule(mockFile);
      expect(chunker).toBeInstanceOf(PDFChunker);
    });

    it("should create a chunker that can process documents", async () => {
      const mockFile = new File(["test content"], "test.pdf", {
        type: "application/pdf",
      });
      const chunker = await createChunkerModule(mockFile);
      if (!chunker) {
        throw new Error("Chunker module was not created");
      }
      const chunks = await chunker.chunkDocument();
      expect(Array.isArray(chunks)).toBe(true);
    });
  });

  describe("Word documents", () => {
    it("should return a WordChunker instance for .docx files", async () => {
      const mockFile = new File(["test content"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      await createChunkerModule(mockFile);

      expect(WordChunker.create).toHaveBeenCalledWith(mockFile);
    });

    it("should create a chunker that can process documents", async () => {
      const mockFile = new File(["test content"], "test.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const chunker = await createChunkerModule(mockFile);
      if (!chunker) {
        throw new Error("Chunker module was not created");
      }
      const chunks = await chunker.chunkDocument();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(0);
    });
  });

  describe("Unsupported file types", () => {
    it("should throw an error for unsupported file types", async () => {
      const mockFile = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      await expect(createChunkerModule(mockFile)).rejects.toThrow(
        "Unsupported file type: text/plain",
      );
    });

    it("should throw an error for image files", async () => {
      const mockFile = new File(["test content"], "test.jpg", {
        type: "image/jpeg",
      });
      await expect(createChunkerModule(mockFile)).rejects.toThrow(
        "Unsupported file type: image/jpeg",
      );
    });

    it("should throw an error for unknown MIME types", async () => {
      const mockFile = new File(["test content"], "test.unknown", {
        type: "application/unknown",
      });
      await expect(createChunkerModule(mockFile)).rejects.toThrow(
        "Unsupported file type: application/unknown",
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty PDF files", async () => {
      const mockFile = new File([], "empty.pdf", {
        type: "application/pdf",
      });
      const chunker = await createChunkerModule(mockFile);
      expect(chunker).toBeInstanceOf(PDFChunker);
    });

    it("should handle empty Word files", async () => {
      const mockFile = new File([], "empty.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      await createChunkerModule(mockFile);

      expect(WordChunker.create).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Chunk, Strategy } from "../../src/types";
import { buildChunk } from "../../src/lib/utils";

describe("buildChunk", () => {
  const mockChunkData: Omit<Chunk, "id" | "createdAt"> = {
    text: "This is a sample chunk of text.",
    documentTitle: "Employee Handbook",
    documentNumber: "HR-001",
    revision: "2.0",
    effectiveDate: "2024-01-01",
    sectionTitle: "Dress Code Policy",
    headingType: "title" as Strategy,
    headingMarker: "Section A",
    chunkIndex: 0,
    totalChunksInSection: 5,
  };

  describe("Basic functionality", () => {
    it("should create a chunk with all provided properties", () => {
      const chunk = buildChunk(mockChunkData);

      expect(chunk.text).toBe(mockChunkData.text);
      expect(chunk.documentTitle).toBe(mockChunkData.documentTitle);
      expect(chunk.documentNumber).toBe(mockChunkData.documentNumber);
      expect(chunk.revision).toBe(mockChunkData.revision);
      expect(chunk.effectiveDate).toBe(mockChunkData.effectiveDate);
      expect(chunk.sectionTitle).toBe(mockChunkData.sectionTitle);
      expect(chunk.headingType).toBe(mockChunkData.headingType);
      expect(chunk.headingMarker).toBe(mockChunkData.headingMarker);
      expect(chunk.chunkIndex).toBe(mockChunkData.chunkIndex);
      expect(chunk.totalChunksInSection).toBe(
        mockChunkData.totalChunksInSection,
      );
    });

    it("should generate a unique id", () => {
      const chunk = buildChunk(mockChunkData);

      expect(chunk.id).toBeDefined();
      expect(typeof chunk.id).toBe("string");
      expect(chunk.id.length).toBeGreaterThan(0);
    });

    it("should generate different ids for multiple chunks", () => {
      const chunk1 = buildChunk(mockChunkData);
      const chunk2 = buildChunk(mockChunkData);

      expect(chunk1.id).not.toBe(chunk2.id);
    });

    it("should set createdAt to current date", () => {
      const beforeCreation = new Date();
      const chunk = buildChunk(mockChunkData);
      const afterCreation = new Date();

      expect(chunk.createdAt).toBeInstanceOf(Date);
      expect(chunk.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime(),
      );
      expect(chunk.createdAt.getTime()).toBeLessThanOrEqual(
        afterCreation.getTime(),
      );
    });
  });

  describe("Optional fields", () => {
    it("should handle missing optional fields", () => {
      const minimalData: Omit<Chunk, "id" | "createdAt"> = {
        text: "Minimal chunk",
        documentTitle: "Test Doc",
        documentNumber: "TEST-001",
        revision: "1.0",
        effectiveDate: "2024-01-01",
        chunkIndex: 0,
      };

      const chunk = buildChunk(minimalData);

      expect(chunk.sectionTitle).toBeUndefined();
      expect(chunk.headingType).toBeUndefined();
      expect(chunk.headingMarker).toBeUndefined();
      expect(chunk.totalChunksInSection).toBeUndefined();
    });

    it("should preserve undefined optional fields", () => {
      const dataWithUndefined: Omit<Chunk, "id" | "createdAt"> = {
        text: "Test",
        documentTitle: "Doc",
        documentNumber: "NUM",
        revision: "1",
        effectiveDate: "2024-01-01",
        chunkIndex: 0,
        sectionTitle: undefined,
        headingType: undefined,
        headingMarker: undefined,
        totalChunksInSection: undefined,
      };

      const chunk = buildChunk(dataWithUndefined);

      expect(chunk.sectionTitle).toBeUndefined();
      expect(chunk.headingType).toBeUndefined();
      expect(chunk.headingMarker).toBeUndefined();
      expect(chunk.totalChunksInSection).toBeUndefined();
    });
  });

  describe("Different strategy types", () => {
    it('should handle "lettered" strategy', () => {
      const chunk = buildChunk({
        ...mockChunkData,
        headingType: "lettered" as Strategy,
        headingMarker: "A",
      });

      expect(chunk.headingType).toBe("lettered");
      expect(chunk.headingMarker).toBe("A");
    });

    it('should handle "labeled" strategy', () => {
      const chunk = buildChunk({
        ...mockChunkData,
        headingType: "labeled" as Strategy,
        headingMarker: "Section 1.1",
      });

      expect(chunk.headingType).toBe("labeled");
      expect(chunk.headingMarker).toBe("Section 1.1");
    });

    it('should handle "fallback" strategy', () => {
      const chunk = buildChunk({
        ...mockChunkData,
        headingType: "fallback" as Strategy,
      });

      expect(chunk.headingType).toBe("fallback");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty text", () => {
      const chunk = buildChunk({
        ...mockChunkData,
        text: "",
      });

      expect(chunk.text).toBe("");
    });

    it("should handle chunkIndex of 0", () => {
      const chunk = buildChunk({
        ...mockChunkData,
        chunkIndex: 0,
      });

      expect(chunk.chunkIndex).toBe(0);
    });

    it("should handle large chunkIndex values", () => {
      const chunk = buildChunk({
        ...mockChunkData,
        chunkIndex: 9999,
        totalChunksInSection: 10000,
      });

      expect(chunk.chunkIndex).toBe(9999);
      expect(chunk.totalChunksInSection).toBe(10000);
    });

    it("should handle special characters in text", () => {
      const specialText = 'Text with "quotes", <tags>, & symbols!';
      const chunk = buildChunk({
        ...mockChunkData,
        text: specialText,
      });

      expect(chunk.text).toBe(specialText);
    });
  });

  describe("Immutability", () => {
    it("should not modify the input object", () => {
      const inputData = { ...mockChunkData };
      const inputCopy = { ...mockChunkData };

      buildChunk(inputData);

      expect(inputData).toEqual(inputCopy);
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { WordChunker } from "../../src/classes/wordChunker";
import { getFileFromPath } from "../../src/lib/utils";
import path from "node:path";
import fs from "node:fs";

describe("WordChunker", () => {
  const testDir = "__tests__/watched-dir";
  let testFiles: string[] = [];

  beforeAll(() => {
    // Get all .docx files in the test directory
    const files = fs.readdirSync(testDir);
    testFiles = files.filter((file) => file.endsWith(".docx"));

    if (testFiles.length === 0) {
      console.warn("No .docx files found in test directory");
    }
  });

  describe("create", () => {
    it("should create a WordChunker instance", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);

      const chunker = await WordChunker.create(file);

      expect(chunker).toBeInstanceOf(WordChunker);
    });

    it("should extract and store document metadata", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);

      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata).toBeDefined();
      expect(chunker.documentMetadata).not.toBeNull();
    });

    it("should store the original file", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);

      const chunker = await WordChunker.create(file);

      expect(chunker.file).toBe(file);
    });
  });

  describe("_extractHeaderMetadata", () => {
    it("should extract document title", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.documentTitle).toBeDefined();
      expect(typeof chunker.documentMetadata?.documentTitle).toBe("string");
      expect(chunker.documentMetadata?.documentTitle.length).toBeGreaterThan(0);
    });

    it("should extract document number", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.documentNumber).toBeDefined();
      expect(typeof chunker.documentMetadata?.documentNumber).toBe("string");
      expect(chunker.documentMetadata?.documentNumber).toMatch(/MSC-/i);
    });

    it("should extract effective date", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.effectiveDate).toBeDefined();
      expect(typeof chunker.documentMetadata?.effectiveDate).toBe("string");
      expect(chunker.documentMetadata?.effectiveDate.length).toBeGreaterThan(0);
    });

    it("should extract revision number", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.revision).toBeDefined();
      expect(typeof chunker.documentMetadata?.revision).toBe("string");
      expect(chunker.documentMetadata?.revision.length).toBeGreaterThan(0);
    });

    it("should not include label prefixes in extracted text", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.documentTitle).not.toMatch(
        /^Procedure Title:/i,
      );
      expect(chunker.documentMetadata?.documentNumber).not.toMatch(/^Number:/i);
      expect(chunker.documentMetadata?.effectiveDate).not.toMatch(
        /^Effective:/i,
      );
      expect(chunker.documentMetadata?.revision).not.toMatch(/^Revision:/i);
    });

    it("should not include [object Object] in extracted text", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.documentTitle).not.toContain(
        "[object Object]",
      );
      expect(chunker.documentMetadata?.documentNumber).not.toContain(
        "[object Object]",
      );
      expect(chunker.documentMetadata?.effectiveDate).not.toContain(
        "[object Object]",
      );
      expect(chunker.documentMetadata?.revision).not.toContain(
        "[object Object]",
      );
    });

    it("should handle multiple test documents", async () => {
      if (testFiles.length < 2) return;

      for (const filename of testFiles) {
        const filePath = path.join(testDir, filename);
        const file = getFileFromPath(filePath);
        const chunker = await WordChunker.create(file);

        expect(chunker.documentMetadata).toBeDefined();
        expect(chunker.documentMetadata?.documentTitle).toBeTruthy();
        expect(chunker.documentMetadata?.documentNumber).toBeTruthy();
        expect(chunker.documentMetadata?.effectiveDate).toBeTruthy();
        expect(chunker.documentMetadata?.revision).toBeTruthy();
      }
    });
  });

  describe("Specific document validation", () => {
    it("should correctly extract MSC-SOP-0028 metadata", async () => {
      const sop0028Files = testFiles.filter((f) => f.includes("0028"));
      if (sop0028Files.length === 0) return;

      const filePath = path.join(testDir, sop0028Files[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      expect(chunker.documentMetadata?.documentNumber).toBe("MSC-SOP-0028");
      expect(chunker.documentMetadata?.documentTitle).toContain("Software");
      expect(chunker.documentMetadata?.effectiveDate).toMatch(
        /\d{1,2}\s+\w+\s+\d{4}/,
      );
      expect(chunker.documentMetadata?.revision).toMatch(/\d+/);
    });
  });

  describe("Metadata format validation", () => {
    it("should have trimmed metadata values (no leading/trailing spaces)", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      const metadata = chunker.documentMetadata!;
      expect(metadata.documentTitle).toBe(metadata.documentTitle.trim());
      expect(metadata.documentNumber).toBe(metadata.documentNumber.trim());
      expect(metadata.effectiveDate).toBe(metadata.effectiveDate.trim());
      expect(metadata.revision).toBe(metadata.revision.trim());
    });

    it("should handle revision numbers as strings", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      // Revision should be a string even if it's a number in the XML
      expect(typeof chunker.documentMetadata?.revision).toBe("string");
      // Should be convertible to a number
      expect(isNaN(Number(chunker.documentMetadata?.revision))).toBe(false);
    });
  });

  describe("chunkDocument", () => {
    it("should return an empty array (not yet implemented)", async () => {
      if (testFiles.length === 0) return;

      const filePath = path.join(testDir, testFiles[0]);
      const file = getFileFromPath(filePath);
      const chunker = await WordChunker.create(file);

      const chunks = await chunker.chunkDocument();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBe(0);
    });
  });
});

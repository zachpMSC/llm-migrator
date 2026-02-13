import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getFileFromPath } from "../../src/utils";

describe("getFileFromPath", () => {
  const testDir = "__tests__/test-files";

  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.readdirSync(testDir).forEach((file) => {
        fs.unlinkSync(path.join(testDir, file));
      });
      fs.rmdirSync(testDir);
    }
  });

  describe("PDF files", () => {
    it("should create a File object from a PDF path", () => {
      const testFilePath = path.join(testDir, "test.pdf");
      fs.writeFileSync(testFilePath, "fake pdf content");

      const file = getFileFromPath(testFilePath);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("test.pdf");
      expect(file.type).toBe("application/pdf");
    });
  });

  describe("Word documents", () => {
    it("should create a File object from a .docx path", () => {
      const testFilePath = path.join(testDir, "test.docx");
      fs.writeFileSync(testFilePath, "fake docx content");

      const file = getFileFromPath(testFilePath);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("test.docx");
      expect(file.type).toBe(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });

    it("should create a File object from a .doc path", () => {
      const testFilePath = path.join(testDir, "test.doc");
      fs.writeFileSync(testFilePath, "fake doc content");

      const file = getFileFromPath(testFilePath);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("test.doc");
      expect(file.type).toBe("application/msword");
    });
  });

  describe("Text files", () => {
    it("should create a File object from a .txt path", () => {
      const testFilePath = path.join(testDir, "test.txt");
      fs.writeFileSync(testFilePath, "Hello, world!");

      const file = getFileFromPath(testFilePath);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("test.txt");
      expect(file.type).toBe("text/plain");
    });
  });

  describe("Image files", () => {
    it("should handle .jpg files", () => {
      const testFilePath = path.join(testDir, "test.jpg");
      fs.writeFileSync(testFilePath, "fake jpg content");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("test.jpg");
      expect(file.type).toBe("image/jpeg");
    });

    it("should handle .png files", () => {
      const testFilePath = path.join(testDir, "test.png");
      fs.writeFileSync(testFilePath, "fake png content");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("test.png");
      expect(file.type).toBe("image/png");
    });
  });

  describe("Unknown file types", () => {
    it("should use default MIME type for unknown extensions", () => {
      const testFilePath = path.join(testDir, "test.xyz");
      fs.writeFileSync(testFilePath, "unknown content");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("test.xyz");
      expect(file.type).toBe("application/octet-stream");
    });
  });

  describe("Error handling", () => {
    it("should throw an error if file does not exist", () => {
      const nonExistentPath = path.join(testDir, "non-existent.pdf");

      expect(() => {
        getFileFromPath(nonExistentPath);
      }).toThrow(`File does not exist: ${nonExistentPath}`);
    });

    it("should throw an error for invalid paths", () => {
      const invalidPath = "Z:\\completely\\fake\\path\\file.pdf";

      expect(() => {
        getFileFromPath(invalidPath);
      }).toThrow();
    });
  });

  describe("File contents", () => {
    it("should preserve file contents", async () => {
      const testFilePath = path.join(testDir, "content-test.txt");
      const testContent = "This is test content!";
      fs.writeFileSync(testFilePath, testContent);

      const file = getFileFromPath(testFilePath);
      const fileText = await file.text();

      expect(fileText).toBe(testContent);
    });

    it("should handle binary content", async () => {
      const testFilePath = path.join(testDir, "binary-test.bin");
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]);
      fs.writeFileSync(testFilePath, binaryData);

      const file = getFileFromPath(testFilePath);
      const arrayBuffer = await file.arrayBuffer();
      const resultBuffer = Buffer.from(arrayBuffer);

      expect(resultBuffer).toEqual(binaryData);
    });
  });

  describe("Path handling", () => {
    it("should handle absolute paths", () => {
      const testFilePath = path.join(testDir, "absolute.txt");
      fs.writeFileSync(testFilePath, "content");
      const absolutePath = path.resolve(testFilePath);

      const file = getFileFromPath(absolutePath);

      expect(file.name).toBe("absolute.txt");
    });

    it("should handle relative paths", () => {
      const testFilePath = path.join(testDir, "relative.txt");
      fs.writeFileSync(testFilePath, "content");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("relative.txt");
    });

    it("should extract filename correctly from nested paths", () => {
      const nestedDir = path.join(testDir, "nested", "deep");
      fs.mkdirSync(nestedDir, { recursive: true });
      const testFilePath = path.join(nestedDir, "nested-file.pdf");
      fs.writeFileSync(testFilePath, "content");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("nested-file.pdf");

      // Clean up nested structure
      fs.unlinkSync(testFilePath);
      fs.rmdirSync(nestedDir);
      fs.rmdirSync(path.join(testDir, "nested"));
    });
  });

  describe("Empty files", () => {
    it("should handle empty files", () => {
      const testFilePath = path.join(testDir, "empty.txt");
      fs.writeFileSync(testFilePath, "");

      const file = getFileFromPath(testFilePath);

      expect(file.name).toBe("empty.txt");
      expect(file.size).toBe(0);
    });
  });
});

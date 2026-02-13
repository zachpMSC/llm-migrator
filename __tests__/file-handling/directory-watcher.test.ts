import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watchDirectory, testDir } from "../../src/lib/directory-watcher";
import fs from "node:fs";
import path from "node:path";

// Mock chokidar
vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

import chokidar from "chokidar";

describe("watchDirectory", () => {
  let mockWatcher: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWatcher = {
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    (chokidar.watch as any) = vi.fn().mockReturnValue(mockWatcher);
  });

  describe("Valid directory watching", () => {
    it("should return an FSWatcher instance", () => {
      const callback = vi.fn();

      const watcher = watchDirectory({
        path: testDir,
        cb: callback,
      });

      expect(watcher).toBeDefined();
      expect(chokidar.watch).toHaveBeenCalledWith(path.resolve(testDir));
      expect(mockWatcher.on).toHaveBeenCalledWith("all", callback);
    });

    it("should watch a valid directory path", () => {
      const callback = vi.fn();

      expect(() => {
        watchDirectory({
          path: testDir,
          cb: callback,
        });
      }).not.toThrow();
    });

    it("should resolve relative paths to absolute paths", () => {
      const callback = vi.fn();
      const relativePath = "./__tests__/watched-dir";

      watchDirectory({
        path: relativePath,
        cb: callback,
      });

      expect(chokidar.watch).toHaveBeenCalledWith(path.resolve(relativePath));
    });
  });

  describe("Error handling", () => {
    it("should throw an error if directory does not exist", () => {
      const callback = vi.fn();
      const nonExistentPath = "__tests__/non-existent-directory";

      expect(() => {
        watchDirectory({
          path: nonExistentPath,
          cb: callback,
        });
      }).toThrow(`Directory does not exist: ${path.resolve(nonExistentPath)}`);
    });

    it("should throw an error if path is a file, not a directory", () => {
      const callback = vi.fn();
      const testFilePath = "__tests__/test-file.txt";

      // Create a test file
      fs.writeFileSync(testFilePath, "test content");

      try {
        expect(() => {
          watchDirectory({
            path: testFilePath,
            cb: callback,
          });
        }).toThrow(`Path is not a directory: ${path.resolve(testFilePath)}`);
      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });
  });

  describe("Callback registration", () => {
    it("should register the callback with chokidar watcher", () => {
      const callback = vi.fn();

      watchDirectory({
        path: testDir,
        cb: callback,
      });

      expect(mockWatcher.on).toHaveBeenCalledWith("all", callback);
    });

    it("should call the callback with correct event and path", () => {
      const callback = vi.fn();

      watchDirectory({
        path: testDir,
        cb: callback,
      });

      // Simulate chokidar calling the callback
      const registeredCallback = mockWatcher.on.mock.calls[0][1];
      registeredCallback("add", "/test/path/file.txt");

      expect(callback).toHaveBeenCalledWith("add", "/test/path/file.txt");
    });
  });
});

import fs from "node:fs";
import path from "node:path";
import type { Chunk } from "../types";
import chalk from "chalk";

/**
 * Creates a File object from a file path.
 *
 * @param {string} filePath - The absolute or relative path to the file.
 * @returns {File} A File object containing the file's contents and metadata.
 * @throws {Error} If the file does not exist or cannot be read.
 *
 * @example
 * const file = getFileFromPath("C:\\Users\\John\\Documents\\file.pdf");
 * console.log(file.name); // "file.pdf"
 * console.log(file.type); // "application/pdf"
 */
export function getFileFromPath(filePath: string): File {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  // Read file contents
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(filePath);

  // Create File object
  const file = new File([fileBuffer], fileName, { type: mimeType });

  return file;
}

/**
 * Get MIME type based on file extension.
 *
 * @param {string} filePath - The file path.
 * @returns {string} The MIME type.
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".json": "application/json",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".zip": "application/zip",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Builds a Chunk object from the provided properties.
 *
 * @param {Omit<Chunk, "id" | "createdAt">} props - The properties to build the Chunk, excluding
 * "id" and "createdAt" which are generated automatically.
 * @returns {Chunk} A new Chunk object with a unique ID and creation timestamp.
 */
export function buildChunk(props: Omit<Chunk, "id" | "createdAt">): Chunk {
  return {
    ...props,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
}

/**
 * @param fileName pass the name of the file to be checked in the db
 * @return boolean indicating whether the file has been chunked or not
 */
export function checkIfFileHasBeenChunked(fileName: string): boolean {
  // TODO: Implement logic to check if the file has been chunked in the database
  const uploadedFiles = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../__tests__/testDb/uploadedFiles.json"),
      "utf-8",
    ),
  );
  for (const file of uploadedFiles.files) {
    if (file.name === fileName) {
      console.log(chalk.blue(`File ${fileName} has already been chunked.`));
      return true;
    }
  }
  return false;
}

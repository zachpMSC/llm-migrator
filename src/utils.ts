import fs from "node:fs";
import path from "node:path";

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

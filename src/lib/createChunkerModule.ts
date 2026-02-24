import chalk from "chalk";
import { PDFChunker } from "../classes/pdfChunker";
import { WordChunker } from "../classes/wordChunker";
import { db } from "./db";

export async function createChunkerModule(file: File, path: string) {
  // Check if the file has already been chunked before creating a new chunker module
  // This prevents unnecessary processing and ensures that we don't create multiple chunker modules for the same file
  if (await db.checkIfFileHasBeenChunked(path)) {
    console.log(
      chalk.yellow(
        `File at path "${path}" has already been chunked. Skipping chunker module creation.`,
      ),
    );
    return null;
  }

  switch (file.type) {
    case "application/pdf":
      return await PDFChunker.create(file);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
    case "application/vnd.ms-word.document.macroEnabled.12": // .docm
      return await WordChunker.create(file);
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

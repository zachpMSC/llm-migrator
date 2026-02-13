import { PDFChunker } from "../classes/pdfChunker";
import { WordChunker } from "../classes/wordChunker";

export async function createChunkerModule(file: File) {
  switch (file.type) {
    case "application/pdf":
      return await PDFChunker.create(file);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return await WordChunker.create(file);
    default:
      throw new Error(`Unsupported file type: ${file.type}`);
  }
}

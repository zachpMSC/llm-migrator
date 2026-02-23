import { OllamaTagsResponse } from "../types";

function createOllamaModule() {
  const OLLAMA_BASE_URL = "http://localhost:11434";
  const EMBEDDING_MODEL = "nomic-embed-text";

  /**
   * Initialize the Ollama module by checking if required models are available
   */
  async function initialize(): Promise<void> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

      if (!response.ok) {
        throw new Error("Ollama server is not running. Please start Ollama.");
      }

      const data = (await response.json()) as OllamaTagsResponse;
      const models = data.models || [];

      // Check if embedding model is installed
      const hasEmbeddingModel = models.some(
        (model) =>
          model.name === EMBEDDING_MODEL ||
          model.name.startsWith(EMBEDDING_MODEL),
      );

      if (!hasEmbeddingModel) {
        throw new Error(
          `Required embedding model '${EMBEDDING_MODEL}' is not installed.\n` +
            `Please run: ollama pull ${EMBEDDING_MODEL}`,
        );
      }

      console.log(`✅ Ollama initialized with model: ${EMBEDDING_MODEL}`);
    } catch (error: any) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          "Cannot connect to Ollama. Make sure Ollama is running on port 11434.",
        );
      }
      throw error;
    }
  }

  function createEmbedding() {}
  return {
    initialize,
    createEmbedding,
  };
}

export const ollama = createOllamaModule();

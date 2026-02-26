import 'dotenv/config';
import { generateMiniLMEmbedding, generateMiniLMEmbeddings } from './minilm';

/**
 * Generates an embedding for a given text using local MiniLM model (via Xenova/transformers).
 * This produces 384-dimensional vectors compatible with the existing 700k records.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) return [];
    // MiniLM doesn't need prefixes like 'search_query: ' usually, but let's stick to raw for now as user said "MiniLM"
    return await generateMiniLMEmbedding(text);
}

/**
 * Generates embeddings for multiple texts in a batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    return await generateMiniLMEmbeddings(texts);
}

// Export legacy functions as no-ops or aliases if needed, but for now we replace.
// We keep the signature same so other files don't break.


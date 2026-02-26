
import { pipeline, env } from '@xenova/transformers';

// Skip local model checks to avoid downloading issues if not needed, 
// but for first run it needs to download. 
// We set cache dir to a local folder to avoid permission issues if any
env.cacheDir = './.cache';

// Singleton to hold the pipeline
let extractor: any = null;

export async function getExtractor() {
    if (!extractor) {
        console.log('📦 Loading MiniLM model (Xenova/paraphrase-multilingual-MiniLM-L12-v2)...');
        // Using the exact model that matches sentence-transformers default for this name
        extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        console.log('✅ MiniLM model loaded.');
    }
    return extractor;
}

export async function generateMiniLMEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) return [];

    try {
        const pipe = await getExtractor();

        // Generate embedding
        // pooling: 'mean', normalize: true is standard for sentence-transformers
        const output = await pipe(text, { pooling: 'mean', normalize: true });

        // Convert Tensor to standard array
        const embedding = Array.from(output.data) as number[];

        // Verify dimension (should be 384)
        if (embedding.length !== 384) {
            console.warn(`⚠️ Warning: MiniLM produced ${embedding.length} dimensions, expected 384.`);
        }

        return embedding;
    } catch (error) {
        console.error('❌ MiniLM Embedding Error:', error);
        return [];
    }
}

export async function generateMiniLMEmbeddings(texts: string[]): Promise<number[][]> {
    const pipe = await getExtractor();
    const results: number[][] = [];

    for (const text of texts) {
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        results.push(Array.from(output.data) as number[]);
    }
    return results;
}

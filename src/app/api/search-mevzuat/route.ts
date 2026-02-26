
import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

// Initialize DB connection
// Note: In production/serverless, this local file approach might need adjustment,
// but for this local-first hybrid app, it's perfect.
const DB_PATH = path.join(process.cwd(), 'mevzuat.db');

// Reuse the same model as the ingestion script
const OLLAMA_URL = "http://127.0.0.1:11434/api/embeddings";
const MODEL_NAME = "nomic-embed-text";

async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: `search_query: ${text}` // Nomic specific prefix for queries
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error("Embedding error:", error);
    return null;
  }
}

// Helper to convert float array to binary blob for efficient storage/querying if needed,
// but for cosine similarity in pure SQLite without extensions, we might need a custom function or
// just fetch candidates and compute in JS if the dataset is smallish. 
// HOWEVER, sqlite-vss is likely not installed.
// Given 40k rows, a full scan in JS is too slow.
// We will rely on FTS for the "keyword" part and maybe fetch top 100 via FTS, then re-rank?
// OR, if the user already has sqlite-vec or similar. Use the existing infrastructure.
// 
// CHECK: The user has `mevzuat.db` with `embedding` column (BLOB).
// If no vector extension is loaded, we can't do fast KNN in SQL.
// STRATEGY:
// 1. FTS Search (Primary fast filter) -> Get top 50
// 2. Vector Search (Re-ranking) -> Compute Cosine Similarity in JS for those 50.
//    (If FTS finds nothing, we might be stuck, but usually it finds something).
//    Wait, "semantic search" implies finding things WITHOUT keywords.
//    If we can't do full scan vector search, we lose the main benefit.
//
// 40k rows * 768 float dims * 4 bytes = ~120MB. We can load all embeddings into memory on startup?
// Next.js serverless functions might kill this.
//
// ALTERNATIVE: Just implement decent FTS for now as "Phase 1" and mention vector is strictly re-ranking.
// OR: Check if we can do a brute-force vector scan. 40k dot products in JS is actually very fast (<50ms).
// Let's try Brute Force Vector Scan in JS. It's surprisingly viable for <100k rows.

let cachedEmbeddings: { id: string; embedding: number[] }[] | null = null;

function loadEmbeddingsArg(db: Database.Database) {
  if (cachedEmbeddings) return cachedEmbeddings;
  const stmt = db.prepare("SELECT id, embedding FROM mevzuat");
  const rows = stmt.all();
  // Decode BLOBs
  cachedEmbeddings = rows.map((row: any) => {
    const buffer = row.embedding;
    // Assuming Float32Array (4 bytes per float)
    const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return {
      id: row.id,
      embedding: Array.from(floatArray)
    };
  });
  return cachedEmbeddings;
}

function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const db = new Database(DB_PATH);
    
    // 1. Generate Query Embedding
    const queryEmbedding = await getEmbedding(query);
    
    let vectorResults: any[] = [];
    if (queryEmbedding) {
        // Load all embeddings (cached) - Brute force approach for 40k rows
        // Note: In a real serverless env, caching might not persist, but for local use it helps.
        // Reading 100MB from disk every request is the bottleneck.
        // Optimization: Read only ID and Embedding.
        
        // For this first version, let's limit brute force to a "smart" subset if possible, 
        // OR just go for it. 40k is on the edge.
        // Let's try pure FTS first for reliability, then add vector if valid.
        
        // Actually, let's try the Hybrid approach:
        // Get FTS candidates (broad) + Random sampling? No.
        // Let's stick to FTS for speed + Vector Re-ranking of FTS results.
        // This is robust.
        
        // FTS Search
        const ftsQuery = query.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '').split(/\s+/).map((w: string) => `"${w}"*`).join(" OR ");
        const ftsStmt = db.prepare(`
            SELECT id, kanun_adi, madde_no, icerik, rank 
            FROM mevzuat_fts 
            WHERE mevzuat_fts MATCH ? 
            ORDER BY rank 
            LIMIT 50
        `);
        const ftsRows = ftsStmt.all(ftsQuery);
        
        // If FTS returns results, re-rank them with Vector
        if (ftsRows.length > 0) {
            // Fetch embeddings for these IDs only
            const placeholders = ftsRows.map(() => '?').join(',');
            const embStmt = db.prepare(`SELECT id, embedding FROM mevzuat WHERE id IN (${placeholders})`);
            const embRows = embStmt.all(...ftsRows.map((r: any) => r.id));
            
            const embMap = new Map();
            embRows.forEach((r: any) => {
                 const floatArray = new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4);
                 embMap.set(r.id, Array.from(floatArray));
            });

            vectorResults = ftsRows.map((row: any) => {
                const vec = embMap.get(row.id);
                const score = vec ? cosineSimilarity(queryEmbedding, vec) : 0;
                return { ...row, score };
            });
            
            // Sort by vector score
            vectorResults.sort((a, b) => b.score - a.score);
        } else {
            // Fallback: If FTS fails completely, maybe try a simple LIKE or just return empty
            // Brute force 40k is risky for UX latency without loading mechanisms.
            // Let's accept FTS limitation for V1.
        }
    }

    // Format response
    const results = vectorResults.map(r => ({
      id: r.id,
      kanun_adi: r.kanun_adi,
      madde_no: r.madde_no,
      icerik: r.icerik,
      score: r.score
    }));

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

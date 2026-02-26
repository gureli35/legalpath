#!/usr/bin/env npx tsx
/**
 * Hukuk Sözlüğü Vektörize Script
 * Reads hukuk_sozlugu.json and creates embeddings using existing embeddings module
 * Stores results in SQLite database
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { generateEmbedding } from '../src/lib/embeddings';

const INPUT_FILE = path.join(process.cwd(), 'hukuk_sozlugu.json');
const DB_PATH = path.join(process.cwd(), 'emsal.db');

interface Terim {
    terim: string;
    anlam: string;
    harf?: string;
}

async function main() {
    console.log('🚀 Hukuk Sözlüğü Vectorization Script\n');

    // Read terms
    console.log(`📖 Reading ${INPUT_FILE}...`);
    const terimler: Terim[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`   Found ${terimler.length} terms\n`);

    // Initialize database
    console.log(`📁 Opening database: ${DB_PATH}`);
    const db = new Database(DB_PATH);

    // Create table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS hukuk_sozlugu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            terim TEXT NOT NULL UNIQUE,
            anlam TEXT NOT NULL,
            harf TEXT,
            embedding BLOB,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create FTS5 virtual table for keyword search
    try {
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS hukuk_sozlugu_fts USING fts5(
                terim, anlam, content='hukuk_sozlugu', content_rowid='id'
            )
        `);
    } catch (e) {
        // FTS table might already exist
    }

    // Prepare statements
    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO hukuk_sozlugu (terim, anlam, harf, embedding)
        VALUES (?, ?, ?, ?)
    `);

    const checkStmt = db.prepare(`
        SELECT embedding FROM hukuk_sozlugu WHERE terim = ?
    `);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Filter unique terms
    const uniqueTerms = new Map<string, Terim>();
    for (const t of terimler) {
        if (!uniqueTerms.has(t.terim.toLowerCase())) {
            uniqueTerms.set(t.terim.toLowerCase(), t);
        }
    }
    console.log(`   Unique terms: ${uniqueTerms.size}\n`);

    const terms = Array.from(uniqueTerms.values());

    for (let i = 0; i < terms.length; i++) {
        const t = terms[i];

        // Skip if already has embedding
        const existing = checkStmt.get(t.terim) as { embedding: Buffer } | undefined;
        if (existing?.embedding) {
            skipCount++;
            continue;
        }

        // Create text for embedding: term + definition
        const textToEmbed = `${t.terim}: ${t.anlam}`;

        try {
            process.stdout.write(`[${i + 1}/${terms.length}] ${t.terim.substring(0, 30).padEnd(30)}... `);

            const embedding = await generateEmbedding(textToEmbed);

            if (embedding.length === 0) {
                console.log('⚠️ Empty embedding');
                errorCount++;
                continue;
            }

            const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

            insertStmt.run(t.terim, t.anlam, t.harf || '', embeddingBuffer);
            successCount++;

            console.log('✅');

            // Progress update
            if ((successCount + 1) % 50 === 0) {
                console.log(`   💾 Progress: ${successCount} embedded, ${skipCount} skipped\n`);
            }

            // Rate limit - Gemini free tier: ~40ms delay
            await new Promise(r => setTimeout(r, 40));

        } catch (e: any) {
            console.log(`❌ ${e.message}`);
            errorCount++;

            // If rate limited, wait and retry
            if (e.message?.includes('429') || e.message?.includes('quota')) {
                console.log('   ⏳ Rate limited, waiting 60s...');
                await new Promise(r => setTimeout(r, 60000));
            }
        }
    }

    // Rebuild FTS index
    console.log('\n🔍 Rebuilding FTS index...');
    try {
        db.exec(`INSERT INTO hukuk_sozlugu_fts(hukuk_sozlugu_fts) VALUES('rebuild')`);
    } catch (e) {
        console.log('   FTS rebuild skipped');
    }

    db.close();

    console.log('\n========== SUMMARY ==========');
    console.log(`✅ Successfully vectorized: ${successCount}`);
    console.log(`⏭️  Skipped (already done): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Database: ${DB_PATH}`);
}

main().catch(console.error);

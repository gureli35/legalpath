#!/usr/bin/env npx tsx
/**
 * Ingest Hugging Face Mevzuat Dataset
 * Fetches from HuggingFace Datasets Server (JSON) and converts to SQL with Gemini embeddings
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateEmbedding } from '../src/lib/embeddings';

const ROWS_API_URL = 'https://datasets-server.huggingface.co/rows?dataset=muhammetakkurt/mevzuat-gov-dataset&config=default&split=train';
const OUTPUT_FILE = path.join(process.cwd(), 'mevzuat_rows_gemini.sql');

interface Madde {
    madde_numarasi: string;
    text: string;
}

interface KanunRow {
    row: {
        url: string;
        'Kanun Adı': string;
        kanun_numarasi: number;
        kabul_tarihi: string;
        resmi_gazete: { tarih: string; sayi: string };
        dustur: { tertip: string; cilt: string; sayfa: string };
        maddeler: Madde[];
    }
}

function embeddingToHex(embedding: number[]): string {
    const buffer = Buffer.alloc(embedding.length * 4);
    embedding.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
    return buffer.toString('hex');
}

function escapeSQL(str: string): string {
    if (!str) return '';
    return str.replace(/'/g, "''").replace(/\n/g, ' ').replace(/\r/g, '');
}

async function fetchAllRows(): Promise<any[]> {
    const allKanunlar: any[] = [];
    let offset = 0;
    const length = 100;

    console.log('📥 Fetching data from HuggingFace JSON API...');

    while (true) {
        const url = `${ROWS_API_URL}&offset=${offset}&length=${length}`;
        console.log(`Fetching offset ${offset}...`);

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);

            const data = await res.json();
            if (!data.rows || data.rows.length === 0) break;

            // Extract the actual row data from the wrapper
            const fetchedRows = data.rows.map((r: KanunRow) => r.row);
            allKanunlar.push(...fetchedRows);

            if (fetchedRows.length < length) break;
            offset += length;

            // Be nice to the API
            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error('Error fetching data:', e);
            break;
        }
    }

    return allKanunlar;
}

async function processAndAppend(): Promise<void> {
    const kanunlar = await fetchAllRows();
    console.log(`📊 Loaded ${kanunlar.length} kanun from API`);

    // Count total maddeler
    let totalMaddeler = 0;
    for (const kanun of kanunlar) {
        if (kanun.maddeler && Array.isArray(kanun.maddeler)) {
            totalMaddeler += kanun.maddeler.length;
        }
    }
    console.log(`📝 Total maddeler to process: ${totalMaddeler}`);

    // Check existing entries to avoid duplicates
    const existingContent = fs.existsSync(OUTPUT_FILE) ? fs.readFileSync(OUTPUT_FILE, 'utf-8') : '';
    const existingKanunNames = new Set<string>();
    const matches = existingContent.matchAll(/INSERT INTO mevzuat VALUES\('[^']+','([^']+)'/g);
    for (const match of matches) {
        existingKanunNames.add(match[1]);
    }
    console.log(`📌 Found ${existingKanunNames.size} existing kanun entries`);

    const outputStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const kanun of kanunlar) {
        const kanunAdi = kanun['Kanun Adı'];

        if (!kanun.maddeler || !Array.isArray(kanun.maddeler) || kanun.maddeler.length === 0) {
            continue;
        }

        // Filter removed to process ALL kanun
        // if (!kanunAdi.toLocaleUpperCase('tr-TR').includes('ÇEK KANUNU')) {
        //    continue;
        // }

        console.log(`🎯 FOUND: ${kanunAdi} - Processing...`);

        // Check if this kanun already exists
        if (existingKanunNames.has(kanunAdi)) {
            skippedCount += kanun.maddeler.length;
            continue;
        }

        for (const madde of kanun.maddeler) {
            const maddeNo = madde.madde_numarasi || 'MADDE ?';
            const maddeText = madde.text || '';

            if (!maddeText.trim()) continue;

            try {
                // Generate Gemini embedding
                const embedding = await generateEmbedding(maddeText);

                if (embedding.length === 0) {
                    console.error(`❌ Empty embedding for ${kanunAdi} ${maddeNo}`);
                    errorCount++;
                    continue;
                }

                const id = uuidv4();
                const timestamp = new Date().toISOString();
                const hexEmbed = embeddingToHex(embedding);

                const sql = `INSERT INTO mevzuat VALUES('${id}','${escapeSQL(kanunAdi)}','${escapeSQL(maddeNo)}',NULL,'${escapeSQL(maddeText)}','${timestamp}',X'${hexEmbed}');\n`;
                outputStream.write(sql);

                processedCount++;
                if (processedCount % 100 === 0) {
                    console.log(`✅ Processed ${processedCount}/${totalMaddeler} maddeler...`);
                }

                // Rate limit: small delay between API calls
                await new Promise(r => setTimeout(r, 50));

            } catch (err) {
                console.error(`❌ Error processing ${kanunAdi} ${maddeNo}:`, err);
                errorCount++;
            }
        }
    }

    outputStream.end();

    console.log('\n========== SUMMARY ==========');
    console.log(`✅ Successfully processed: ${processedCount} maddeler`);
    console.log(`⏭️ Skipped (already exists): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
}

async function main() {
    console.log('🚀 Starting Mevzuat Ingest via API...\n');

    try {
        await processAndAppend();
        console.log('\n✅ Done! New rows appended to mevzuat_rows_gemini.sql');
    } catch (err) {
        console.error('❌ Fatal error:', err);
        process.exit(1);
    }
}

main();

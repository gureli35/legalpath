
import Database from 'better-sqlite3';
import path from 'path';
import { generateEmbedding } from '../src/lib/embeddings';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);

async function reindexMevzuat() {
    console.log('🔄 Re-indexing Mevzuat Table with Ollama (nomic-embed-text)...');

    const rows = db.prepare('SELECT id, kanun_adi, madde_no, icerik FROM mevzuat').all() as any[];
    console.log(`📊 Found ${rows.length} rows to process.`);

    let success = 0;
    let skipped = 0;

    const updateStmt = db.prepare('UPDATE mevzuat SET embedding = ? WHERE id = ?');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = `${row.kanun_adi} ${row.madde_no} ${row.icerik}`;

        try {
            const embedding = await generateEmbedding(text);
            if (embedding && embedding.length > 0) {
                updateStmt.run(Buffer.from(new Float32Array(embedding).buffer), row.id);
                success++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`❌ Error processing row ${row.id}:`, err);
            skipped++;
        }

        if (i % 50 === 0) {
            process.stdout.write(`\r⏳ Progress: ${i}/${rows.length} (${Math.round(i / rows.length * 100)}%)`);
        }
    }

    console.log(`\n✅ Finished! Re-indexed: ${success}, Skipped: ${skipped}`);
}

async function main() {
    await reindexMevzuat();
    console.log('\n🎉 Database is now fully compatible with Ollama!');
    console.log('You can now re-enable Semantic Search in emsal-client.ts');
}

main();

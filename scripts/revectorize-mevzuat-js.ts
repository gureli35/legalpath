
import 'dotenv/config';
import Database from 'better-sqlite3';
import { generateEmbedding } from '../src/lib/embeddings';

const db = new Database('emsal.db');

async function revectorizeMevzuat() {
    console.log('--- 📜 Mevzuat Re-Vectorization (MiniLM JS) ---');

    // Select all rows where embedding is NULL (we cleared them)
    // or select all just to be safe if any were missed
    const rows = db.prepare("SELECT id, baslik, icerik FROM mevzuat WHERE embedding IS NULL").all() as any[];

    if (rows.length === 0) {
        console.log('✅ No rows to vectorize.');
        return;
    }

    console.log(`Processing ${rows.length} legislation items...`);

    const update = db.prepare('UPDATE mevzuat SET embedding = ? WHERE id = ?');
    let success = 0;

    for (const [i, row] of rows.entries()) {
        const text = `Madde: ${row.baslik}\nİçerik: ${row.icerik}`;

        try {
            const vector = await generateEmbedding(text);

            if (vector && vector.length === 384) {
                const buffer = Buffer.from(new Float32Array(vector).buffer);
                update.run(buffer, row.id);
                success++;
            } else {
                console.warn(`⚠️ Empty or wrong dim vector for ${row.id}`);
            }
        } catch (e) {
            console.error(`❌ Error on ${row.id}:`, e);
        }

        if ((i + 1) % 50 === 0) {
            console.log(`   Progress: ${i + 1}/${rows.length}`);
        }
    }

    console.log(`\n✨ Done! Updated ${success}/${rows.length} records.`);
}

revectorizeMevzuat();

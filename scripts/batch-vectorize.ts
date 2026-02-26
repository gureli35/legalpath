
import { config } from 'dotenv';
import path from 'path';
import Database from 'better-sqlite3';

// Load env vars
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

const db = new Database('emsal.db');

async function batchVectorize() {
    const { generateEmbeddings } = await import('../src/lib/embeddings');

    console.log('--- 🧠 TOPLU VEKTÖRLEŞTİRME BAŞLADI ---');

    // Standard Mode: Only process rows missing embeddings
    // User decided to keep the 700k MiniLM records, so we just fill the gaps.
    const missing = db.prepare('SELECT id, metin FROM kararlar WHERE embedding IS NULL').all() as any[];

    if (missing.length === 0) {
        console.log('✅ Tüm kararlar zaten vektörleştirilmiş.');
        return;
    }

    console.log(`📊 Toplam ${missing.length} eksik karar vektörleştirilecek (Fill Mode).`);

    let processed = 0;
    const startTime = Date.now();
    const BATCH_SIZE = 50;

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const ids = batch.map(b => b.id);
        const texts = batch.map(b => b.metin);

        try {
            console.log(`🔄 İşleniyor: ${processed + 1} - ${processed + batch.length} / ${missing.length}`);

            const embeddings = await generateEmbeddings(texts);

            if (embeddings.length === batch.length) {
                const update = db.prepare('UPDATE kararlar SET embedding = ? WHERE id = ?');

                const transaction = db.transaction((items) => {
                    for (let j = 0; j < items.length; j++) {
                        const vector = new Float32Array(items[j].vector);
                        update.run(Buffer.from(vector.buffer), items[j].id);
                    }
                });

                transaction(embeddings.map((emb, idx) => ({ id: ids[idx], vector: emb })));

                processed += batch.length;
                const elapsedMin = (Date.now() - startTime) / 60000;
                const speed = Math.round(processed / elapsedMin);
                const remaining = (missing.length - processed) / speed;
                console.log(`✅ Hız: ${speed} karar/dk | Tahmini Kalan: ${Math.round(remaining)} dk`);
            } else {
                console.error('⚠️ Eksik embedding döndü, bu grubu atlıyorum.');
            }

            // No pause needed for local Ollama
            // await new Promise(r => setTimeout(r, 0)); 

        } catch (err) {
            console.error('❌ Batch hatası:', err);
            console.log('🚦 10 saniye mola veriliyor...');
            await new Promise(r => setTimeout(r, 10000));
        }
    }

    console.log(`\n✨ SEANS TAMAMLANDI: ${processed} karar vektörleştirildi.`);
    db.close();
}

batchVectorize().catch(console.error);

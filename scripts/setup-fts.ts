import Database from 'better-sqlite3';
import path from 'path';

async function setupFTS() {
    const dbPath = path.resolve(process.cwd(), 'emsal.db');
    console.log(`Setting up FTS5 on ${dbPath}...`);
    const db = new Database(dbPath);

    // Create FTS5 table for kararlar
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS kararlar_fts USING fts5(
            id UNINDEXED,
            mahkeme,
            daire,
            esas_no,
            karar_no,
            tarih,
            konu,
            metin,
            ozet,
            content='kararlar',
            content_rowid='rowid'
        );
    `);

    // Create triggers to keep kararlar_fts in sync
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS kararlar_ai AFTER INSERT ON kararlar BEGIN
            INSERT INTO kararlar_fts(rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet)
            VALUES (new.rowid, new.id, new.mahkeme, new.daire, new.esas_no, new.karar_no, new.tarih, new.konu, new.metin, new.ozet);
        END;
        CREATE TRIGGER IF NOT EXISTS kararlar_ad AFTER DELETE ON kararlar BEGIN
            INSERT INTO kararlar_fts(kararlar_fts, rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet)
            VALUES('delete', old.rowid, old.id, old.mahkeme, old.daire, old.esas_no, old.karar_no, old.tarih, old.konu, old.metin, old.ozet);
        END;
        CREATE TRIGGER IF NOT EXISTS kararlar_au AFTER UPDATE ON kararlar BEGIN
            INSERT INTO kararlar_fts(kararlar_fts, rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet)
            VALUES('delete', old.rowid, old.id, old.mahkeme, old.daire, old.esas_no, old.karar_no, old.tarih, old.konu, old.metin, old.ozet);
            INSERT INTO kararlar_fts(rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet)
            VALUES (new.rowid, new.id, new.mahkeme, new.daire, new.esas_no, new.karar_no, new.tarih, new.konu, new.metin, new.ozet);
        END;
    `);

    // Create FTS5 table for mevzuat
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS mevzuat_fts USING fts5(
            id UNINDEXED,
            kanun_adi,
            madde_no,
            baslik,
            icerik,
            content='mevzuat',
            content_rowid='rowid'
        );
    `);

    // Create triggers for mevzuat
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS mevzuat_ai AFTER INSERT ON mevzuat BEGIN
            INSERT INTO mevzuat_fts(rowid, id, kanun_adi, madde_no, baslik, icerik)
            VALUES (new.rowid, new.id, new.kanun_adi, new.madde_no, new.baslik, new.icerik);
        END;
        CREATE TRIGGER IF NOT EXISTS mevzuat_ad AFTER DELETE ON mevzuat BEGIN
            INSERT INTO mevzuat_fts(mevzuat_fts, rowid, id, kanun_adi, madde_no, baslik, icerik)
            VALUES('delete', old.rowid, old.id, old.kanun_adi, old.madde_no, old.baslik, old.icerik);
        END;
        CREATE TRIGGER IF NOT EXISTS mevzuat_au AFTER UPDATE ON mevzuat BEGIN
            INSERT INTO mevzuat_fts(mevzuat_fts, rowid, id, kanun_adi, madde_no, baslik, icerik)
            VALUES('delete', old.rowid, old.id, old.kanun_adi, old.madde_no, old.baslik, old.icerik);
            INSERT INTO mevzuat_fts(rowid, id, kanun_adi, madde_no, baslik, icerik)
            VALUES (new.rowid, new.id, new.kanun_adi, new.madde_no, new.baslik, new.icerik);
        END;
    `);

    // Initially populate FTS tables
    console.log('Populating kararlar_fts...');
    db.exec('INSERT INTO kararlar_fts(rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet) SELECT rowid, id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet FROM kararlar;');

    console.log('Populating mevzuat_fts...');
    db.exec('INSERT INTO mevzuat_fts(rowid, id, kanun_adi, madde_no, baslik, icerik) SELECT rowid, id, kanun_adi, madde_no, baslik, icerik FROM mevzuat;');

    console.log('FTS5 setup complete.');
}

setupFTS().catch(console.error);

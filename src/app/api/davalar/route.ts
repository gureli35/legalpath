import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);

// Create tables if not exist
db.exec(`
    CREATE TABLE IF NOT EXISTS davalar (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'aktif',
        court TEXT,
        case_no TEXT,
        client_name TEXT,
        opponent_name TEXT,
        case_type TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dava_items (
        id TEXT PRIMARY KEY,
        dava_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        reference_id TEXT,
        reference_url TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (dava_id) REFERENCES davalar(id) ON DELETE CASCADE
    );
`);

// GET /api/davalar - List all cases
export async function GET(req: NextRequest) {
    try {
        const status = req.nextUrl.searchParams.get('status') || '';

        let query = `
            SELECT d.*, 
                   (SELECT COUNT(*) FROM dava_items WHERE dava_id = d.id) as item_count
            FROM davalar d
        `;
        const params: string[] = [];

        if (status) {
            query += ' WHERE d.status = ?';
            params.push(status);
        }

        query += ' ORDER BY d.updated_at DESC LIMIT 100';

        const davalar = params.length > 0
            ? db.prepare(query).all(...params)
            : db.prepare(query).all();

        return NextResponse.json({ davalar });
    } catch (error: any) {
        console.error('Failed to list davalar:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/davalar - Create new case
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, court, case_no, client_name, opponent_name, case_type } = body;

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Dava başlığı gerekli' }, { status: 400 });
        }

        const id = randomUUID();
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO davalar (id, title, description, status, court, case_no, client_name, opponent_name, case_type, created_at, updated_at)
            VALUES (?, ?, ?, 'aktif', ?, ?, ?, ?, ?, ?, ?)
        `).run(id, title.trim(), description || '', court || '', case_no || '', client_name || '', opponent_name || '', case_type || '', now, now);

        return NextResponse.json({ id, message: 'Dava oluşturuldu' });
    } catch (error: any) {
        console.error('Failed to create dava:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

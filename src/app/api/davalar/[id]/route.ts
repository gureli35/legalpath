import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);

// GET /api/davalar/[id] - Get case details with items
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const dava = db.prepare(`
            SELECT * FROM davalar WHERE id = ?
        `).get(id);

        if (!dava) {
            return NextResponse.json({ error: 'Dava bulunamadı' }, { status: 404 });
        }

        const items = db.prepare(`
            SELECT * FROM dava_items WHERE dava_id = ? ORDER BY created_at DESC
        `).all(id);

        return NextResponse.json({ dava, items });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/davalar/[id] - Update case
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const now = new Date().toISOString();

        // Update case fields
        if (body.title !== undefined) {
            db.prepare('UPDATE davalar SET title = ?, updated_at = ? WHERE id = ?').run(body.title, now, id);
        }
        if (body.description !== undefined) {
            db.prepare('UPDATE davalar SET description = ?, updated_at = ? WHERE id = ?').run(body.description, now, id);
        }
        if (body.status !== undefined) {
            db.prepare('UPDATE davalar SET status = ?, updated_at = ? WHERE id = ?').run(body.status, now, id);
        }
        if (body.court !== undefined) {
            db.prepare('UPDATE davalar SET court = ?, updated_at = ? WHERE id = ?').run(body.court, now, id);
        }
        if (body.case_no !== undefined) {
            db.prepare('UPDATE davalar SET case_no = ?, updated_at = ? WHERE id = ?').run(body.case_no, now, id);
        }
        if (body.client_name !== undefined) {
            db.prepare('UPDATE davalar SET client_name = ?, updated_at = ? WHERE id = ?').run(body.client_name, now, id);
        }
        if (body.opponent_name !== undefined) {
            db.prepare('UPDATE davalar SET opponent_name = ?, updated_at = ? WHERE id = ?').run(body.opponent_name, now, id);
        }
        if (body.case_type !== undefined) {
            db.prepare('UPDATE davalar SET case_type = ?, updated_at = ? WHERE id = ?').run(body.case_type, now, id);
        }

        // Add item if provided
        if (body.addItem) {
            const item = body.addItem;
            const itemId = randomUUID();
            db.prepare(`
                INSERT INTO dava_items (id, dava_id, item_type, title, content, reference_id, reference_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(itemId, id, item.item_type, item.title, item.content || '', item.reference_id || '', item.reference_url || '', now);

            db.prepare('UPDATE davalar SET updated_at = ? WHERE id = ?').run(now, id);
        }

        // Remove item if provided
        if (body.removeItemId) {
            db.prepare('DELETE FROM dava_items WHERE id = ? AND dava_id = ?').run(body.removeItemId, id);
            db.prepare('UPDATE davalar SET updated_at = ? WHERE id = ?').run(now, id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/davalar/[id] - Delete case
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        db.prepare('DELETE FROM dava_items WHERE dava_id = ?').run(id);
        db.prepare('DELETE FROM davalar WHERE id = ?').run(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

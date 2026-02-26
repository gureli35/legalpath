import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);

// GET /api/conversations/[id] - Get conversation with messages
// PUT /api/conversations/[id] - Update conversation (add messages)
// DELETE /api/conversations/[id] - Delete conversation

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const conversation = db.prepare(`
            SELECT id, title, created_at, updated_at
            FROM conversations WHERE id = ?
        `).get(id);

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const messages = db.prepare(`
            SELECT id, role, content, created_at
            FROM chat_messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        `).all(id);

        return NextResponse.json({ ...conversation, messages });
    } catch (error: any) {
        console.error('Failed to get conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { title, messages } = await req.json();

        // Update title if provided
        if (title) {
            db.prepare(`
                UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?
            `).run(title, new Date().toISOString(), id);
        }

        // Add new messages if provided
        if (messages && Array.isArray(messages)) {
            const insertMessage = db.prepare(`
                INSERT OR REPLACE INTO chat_messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            const now = new Date().toISOString();
            for (const msg of messages) {
                insertMessage.run(
                    msg.id || randomUUID(),
                    id,
                    msg.role,
                    msg.content,
                    msg.created_at || now
                );
            }

            // Update conversation timestamp
            db.prepare(`
                UPDATE conversations SET updated_at = ? WHERE id = ?
            `).run(now, id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to update conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Delete messages first (cascade should handle, but explicit is safer)
        db.prepare(`DELETE FROM chat_messages WHERE conversation_id = ?`).run(id);
        db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

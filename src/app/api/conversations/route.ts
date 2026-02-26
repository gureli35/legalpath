import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);

// GET /api/conversations - List all conversations
// POST /api/conversations - Create new conversation

export async function GET() {
    try {
        const conversations = db.prepare(`
            SELECT c.id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
            FROM conversations c
            ORDER BY c.updated_at DESC
            LIMIT 50
        `).all();

        return NextResponse.json({ conversations });
    } catch (error: any) {
        console.error('Failed to list conversations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { title, messages } = await req.json();

        const conversationId = randomUUID();
        const now = new Date().toISOString();

        // Create conversation
        db.prepare(`
            INSERT INTO conversations (id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
        `).run(conversationId, title || 'Yeni Sohbet', now, now);

        // Insert messages if provided
        if (messages && Array.isArray(messages)) {
            const insertMessage = db.prepare(`
                INSERT OR IGNORE INTO chat_messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const msg of messages) {
                insertMessage.run(
                    msg.id || randomUUID(),
                    conversationId,
                    msg.role,
                    msg.content,
                    msg.created_at || now
                );
            }
        }

        return NextResponse.json({
            id: conversationId,
            title: title || 'Yeni Sohbet',
            created_at: now
        });
    } catch (error: any) {
        console.error('Failed to create conversation:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

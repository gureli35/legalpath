#!/usr/bin/env python3
"""
Hukuk Sözlüğü Vektörize Script
Uses sentence-transformers MiniLM for local embeddings
Stores results in SQLite database
"""

import json
import sqlite3
import struct
from pathlib import Path
from sentence_transformers import SentenceTransformer

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
INPUT_FILE = PROJECT_DIR / "hukuk_sozlugu.json"
DB_PATH = PROJECT_DIR / "emsal.db"
OLLAMA_URL = "http://127.0.0.1:11434/api/embeddings"
MODEL_NAME = "nomic-embed-text"

def generate_ollama_embedding(text):
    try:
        import requests
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL_NAME,
            "prompt": f"search_document: {text}"
        })
        if response.status_code == 200:
            return response.json().get("embedding", [])
        return []
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return []

def main():
    print(f"🚀 Hukuk Sözlüğü Vectorization Script (Ollama: {MODEL_NAME})\n")
    
    # Read terms
    print(f"📖 Reading {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        terimler = json.load(f)
    print(f"   Found {len(terimler)} terms\n")
    
    # Initialize database
    print(f"📁 Opening database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hukuk_sozlugu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            terim TEXT NOT NULL UNIQUE,
            anlam TEXT NOT NULL,
            harf TEXT,
            embedding BLOB,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create FTS5 virtual table for keyword search
    try:
        cursor.execute('''
            CREATE VIRTUAL TABLE IF NOT EXISTS hukuk_sozlugu_fts USING fts5(
                terim, anlam, content='hukuk_sozlugu', content_rowid='id'
            )
        ''')
    except:
        pass
    
    conn.commit()
    
    # Filter unique terms
    unique_terms = {}
    for t in terimler:
        key = t['terim'].lower()
        if key not in unique_terms:
            unique_terms[key] = t
    
    terms = list(unique_terms.values())
    print(f"   Unique terms: {len(terms)}\n")
    
    # Check existing
    # Note: We might want to force update if model changed, but for now logic is same
    # Actually, if model changed, we should probably clear embeddings. 
    # But let's just insert/replace for now.
    
    cursor.execute("SELECT terim FROM hukuk_sozlugu WHERE embedding IS NOT NULL")
    existing = set(row[0] for row in cursor.fetchall())
    print(f"   Already vectorized: {len(existing)}\n")
    
    # Filter terms to process
    # CAUTION: If we changed model, we should re-process ALL. 
    # Let's assume we want to re-process ALL if user runs this.
    to_process = terms # [t for t in terms if t['terim'] not in existing]
    print(f"   To process: {len(to_process)} (Forcing re-vectorization)\n")
    
    if not to_process:
        print("✅ All terms already vectorized!")
        conn.close()
        return
    
    # Generate embeddings in batch (one by one for ollama logic here)
    print("🔄 Generating embeddings...")
    
    success = 0
    import requests # imported here just in case
    
    for i, t in enumerate(to_process):
        text = f"{t['terim']}: {t['anlam']}"
        emb = generate_ollama_embedding(text)
        
        if emb:
            # Convert embedding to bytes (float32)
            emb_bytes = struct.pack(f'{len(emb)}f', *emb)
            
            cursor.execute('''
                INSERT OR REPLACE INTO hukuk_sozlugu (terim, anlam, harf, embedding)
                VALUES (?, ?, ?, ?)
            ''', (t['terim'], t['anlam'], t.get('harf', ''), emb_bytes))
            success += 1
        
        if (i+1) % 10 == 0:
            print(f"   Saved {i+1}/{len(to_process)}")
            conn.commit()
            
    conn.commit()
    
    conn.commit()
    
    # Rebuild FTS index
    print("\n🔍 Rebuilding FTS index...")
    try:
        cursor.execute("INSERT INTO hukuk_sozlugu_fts(hukuk_sozlugu_fts) VALUES('rebuild')")
        conn.commit()
    except Exception as e:
        print(f"   FTS rebuild skipped: {e}")
    
    conn.close()
    
    print("\n========== SUMMARY ==========")
    print(f"✅ Successfully vectorized: {success}")
    print(f"📁 Database: {DB_PATH}")
    print(f"🔢 Embedding dimension: {len(embeddings[0])}")

if __name__ == "__main__":
    main()

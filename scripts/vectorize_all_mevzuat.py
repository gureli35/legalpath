#!/usr/bin/env python3
"""
Mevzuat Vectorization Script
Fetches all 961 laws from HuggingFace, generates MiniLM embeddings,
and saves to SQLite (emsal.db).
"""

import requests
import sqlite3
import struct
import uuid
import os
import time
from datetime import datetime
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Configuration
ROWS_API_URL = 'https://datasets-server.huggingface.co/rows?dataset=muhammetakkurt/mevzuat-gov-dataset&config=default&split=train'
PROJECT_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(PROJECT_DIR, "emsal.db")  # Use main DB
OLLAMA_URL = "http://127.0.0.1:11434/api/embeddings"
MODEL_NAME = "nomic-embed-text"

def generate_ollama_embedding(text):
    try:
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
    print(f"🚀 Legislation (Mevzuat) Vectorization Script (Ollama: {MODEL_NAME})\n")
    
    # Connect to SQLite
    print(f"📁 Opening database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Ensure table exists with correctly named columns
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mevzuat (
            id TEXT PRIMARY KEY,
            kanun_adi TEXT,
            madde_no TEXT,
            baslik TEXT,
            icerik TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            embedding BLOB
        )
    ''')
    conn.commit()
    
    # Fetch data from HF API in chunks
    print("📥 Fetching legislation data from HuggingFace...")
    all_rows = []
    offset = 0
    length = 100
    
    while True:
        url = f"{ROWS_API_URL}&offset={offset}&length={length}"
        try:
            response = requests.get(url)
            if response.status_code != 200:
                print(f"❌ API Error at offset {offset}: {response.status_code}")
                break
            
            data = response.json()
            rows = data.get('rows', [])
            if not rows:
                break
                
            all_rows.extend([r['row'] for r in rows])
            print(f"   Fetched {len(all_rows)} laws...")
            
            if len(rows) < length:
                break
                
            offset += length
            time.sleep(0.1) # Be gentle
            
        except Exception as e:
            print(f"❌ Error fetching data: {e}")
            break
            
    print(f"\n📊 Total laws to process: {len(all_rows)}")
    
    # Process each law and its maddeler
    processed_maddeler = 0
    start_time = time.time()
    
    for kanun in tqdm(all_rows, desc="Laws"):
        kanun_adi = kanun.get('Kanun Adı', 'Bilinmeyen Kanun')
        maddeler = kanun.get('maddeler', [])
        
        if not maddeler:
            continue
            
        # Prepare batch for embeddings
        
        for madde in maddeler:
            madde_no = madde.get('madde_numarasi', '')
            madde_text = madde.get('text', '')
            
            if not madde_text.strip():
                continue
                
            combined_text = f"{kanun_adi} {madde_no}: {madde_text}"
            
            # Generate embedding using Ollama
            emb = generate_ollama_embedding(combined_text)
            
            if emb:
                item_id = str(uuid.uuid4())
                emb_bytes = struct.pack(f'{len(emb)}f', *emb)
                
                cursor.execute('''
                    INSERT OR REPLACE INTO mevzuat (id, kanun_adi, madde_no, icerik, embedding)
                    VALUES (?, ?, ?, ?, ?)
                ''', (item_id, kanun_adi, madde_no, madde_text, emb_bytes))
            

        conn.commit()
        processed_maddeler += len(maddeler)
        
    # Rebuild FTS index for mevzuat
    print("\n🔍 Rebuilding FTS index for mevzuat...")
    try:
        cursor.execute("DROP TABLE IF EXISTS mevzuat_fts") # Recreate fresh
        cursor.execute('''
            CREATE VIRTUAL TABLE mevzuat_fts USING fts5(
                kanun_adi, madde_no, icerik, content='mevzuat', content_rowid='id'
            )
        ''')
        cursor.execute("INSERT INTO mevzuat_fts(mevzuat_fts) VALUES('rebuild')")
        conn.commit()
    except Exception as e:
        print(f"   FTS error: {e}")
        
    conn.close()
    
    duration = time.time() - start_time
    print(f"\n========== SUMMARY ==========")
    print(f"✅ Processed Laws: {len(all_rows)}")
    print(f"✅ Total Maddeler: {processed_maddeler}")
    print(f"⏱️ Total Time: {duration:.2f} seconds")
    print(f"📁 Database: {DB_PATH}")

if __name__ == "__main__":
    main()

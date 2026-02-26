# 🏗️ Avukat Asistanı: Sistem Mimarisi ve Rebuild Kılavuzu

Bu belge, uygulamanın sıfırdan nasıl kurulacağını, hibrit arama motorunun çalışma mantığını ve kritik dosya yollarını içerir.

---

## 1. Genel Akış (Pipeline)

Sistemin çalışma sırası şöyledir:
1.  **Sorgu Çevirisi:** Kullanıcı "Kovuldum" der -> AI (Llama 3/Gemini) bunu "İş akdinin feshi" gibi terimlere çevirir.
2.  **Hibrit Arama (Mevzuat):** Yerel SQLite tablosunda hem Vektör (Anlamsal) hem FTS5 (Kelime) araması yapılır.
3.  **Canlı Arama (Emsal):** `emsal.uyap.gov.tr` üzerinden en güncel kararlar çekilir.
4.  **Sentez ve Analiz:** Toplanan tüm veriler AI modeline verilir ve kullanıcıya bir hukukçu diliyle "Yorum" yapılır.

---

## 2. Arama Motoru (Hybrid Search Motor)

`emsal-client.ts` içerisinde yer alan bu motor, verileri iki koldan tarar:

### A. Kelime Motoru (FTS5)
- **Teknoloji:** SQLite FTS5 modülü.
- **Mantık:** BM25 algoritması ile alaka düzeyi puanlanır.
- **Ağırlıklar:** Kanun Adı (10.0), Madde No (5.0), Başlık (5.0), İçerik (1.0).
- **Kod:** `bm25(mevzuat_fts, 0, 10.0, 5.0, 5.0, 1.0)`

### B. Anlamsal Motor (Vector Search)
- **Teknoloji:** `nomic-embed-text` yerel vektörleme (Ollama).
- **Mantık:** Cosine Similarity (Kosinüs Benzerliği).
- **Avantaj:** Kullanıcı "Kovuldum" yazsa bile, içinde "Kovulmak" geçmeyen ama anlamı aynı olan "İş akdinin feshi" maddesini bulur.

### C. Füzyon (Birleştirme)
Sistem, en iyi 5 Vektör sonucunu ve en iyi 5 Kelime sonucunu alır, bunları birleştirir. Eğer bir madde her iki motor tarafından da bulunmuşsa, ona **+0.5 Bonus** puan verir ve en üste taşır.

---

## 3. Veritabanı Şeması (SQLite)

Uygulamanın kalbi `emsal.db` dosyasıdır.

-   **`mevzuat` Tablosu:** Tüm kanunlar. `embedding` kolonu (BLOB) vektör verilerini tutar.
-   **`mevzuat_fts` Tablosu:** Kanunların kelime bazlı hızlı araması için sanal tablo (Virtual Table).
-   **`kararlar` Tablosu:** UYAP'tan çekilen ve yerelde önbelleğe alınan tam metinler.

---

## 4. Sıfırdan Kurulum (Rebuild) Adımları

Sistemi başka bir bilgisayara kurmak isterseniz:

1.  **Dizin Yapısı:**
    - `src/lib/`: Veritabanı ve API istemcileri (`emsal-client.ts`, `embeddings.ts`).
    - `src/app/api/`: Sunucu tarafı logicler (`chat/`, `chat-gemini/`).
    - `scripts/`: Veri işleme ve re-index araçları.
    - `docs/`: Teknik raporlar.

2.  **Bağımlılıklar:**
    - `ollama`: Yerel modeller için.
    - `ai-sdk`: Vercel AI SDK (Unified interface).
    - `better-sqlite3`: Yüksek performanslı SQL işlemleri.

3.  **Veritabanı Oluşturma:**
    - `npm run dev` ile sistemi ayağa kaldırın.
    - `scripts/reindex-local.ts` scriptini çalıştırarak ham kanunları vektörleyin: `npx tsx scripts/reindex-local.ts`.

4.  **Arama Motoru Ayarı:**
    - `emsal-client.ts` her zaman aktiftir. Eğer Gemini kullanılacaksa `.env` dosyasına `GOOGLE_GENERATIVE_AI_API_KEY` eklenmelidir.

---

## 5. Hibrit Motor Detayları (Kod Seviyesi)

### Sorgu Temizleme (Sanitization)
Kullanıcıdan gelen ham sorgu `createFtsQuery` fonksiyonu ile temizlenir:
- Noktalama işaretleri kaldırılır.
- Mantıksal operatörler (AND, OR) temizlenir.
- Önce **"AND"** (Sıkı) arama yapılır. Eğer sonuç <= 2 ise otomatik olarak **"OR"** (Gevşek) aramaya geçilir.

### Vektör Karşılaştırma
SQLite'dan çekilen BLOB verileri `Float32Array` olarak okunur ve `cosineSimilarity` fonksiyonu ile ana sorguyla kıyaslanır.

---

## 6. Gemini-Hızlı Versiyonu Kurulumu

Eğer yerel Llama yerine Gemini kullanmak isterseniz:
1. `/api/chat-gemini` endpoint'ini kullanın.
2. Bu mode'da anlamsal arama (Vectors) yerine sadece **Keywords (FTS)** kullanılır çünkü Gemini yereldeki vektörleri doğrudan okuyamaz.
3. Ancak Gemini'nin akıl yürütme kapasitesi sayesinde, bulunan kelimeleri çok daha iyi sentezleyebilir.

---
*Bu sistem, bir hukukçunun ihtiyacı olan "Kesinlik" (Mevzuat) ve "Emsal" (UYAP) dengesini yerel gizlilikle birleştiren bir mühendislik örneğidir.*

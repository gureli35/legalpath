import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'emsal.db');
const db = new Database(dbPath);


interface SearchResult {
  id: string;
  mahkeme: string;
  daire: string;
  esasNo: string;
  kararNo: string;
  tarih: string;
  ozet: string;
  metin?: string;
  similarity?: number;
  kaynak?: 'Yerel' | 'Bedesten';
}

interface MevzuatItem {
  id: string;
  kanun_adi: string;
  madde_no: string;
  baslik: string;
  icerik: string;
  score?: number;
}

interface YargiMCPResult {
  id: string;
  mahkeme: string;
  daire: string;
  esasNo: string;
  kararNo: string;
  tarih: string;
  metin?: string;
  score?: number;
  kaynak?: 'Yerel' | 'Bedesten';
  ozet?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
}

interface KararDetay {
  id: string;
  mahkeme: string;
  daire: string;
  esasNo: string;
  kararNo: string;
  tarih: string;
  metin: string;
  konu: string;
  ozet?: string;
  fromCache?: boolean;
}


interface SearchFilters {
  baslangicTarihi?: string;
  bitisTarihi?: string;
  durum?: string;
  esasNoYil?: string | number;
  kararYil?: string | number;
  keyword?: string;
}

// HTML'den metin çıkar
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Karar metninden metadata çıkar
function extractMetadata(text: string): Partial<KararDetay> {
  const mahkemeMatch = text.match(/T\.C\.\s*\n?([A-ZİĞÜŞÖÇ\s\n]+?(?:MAHKEMESİ|DAİRESİ))/i);
  // Match both "9. Hukuk Dairesi" at start of text AND "X. HUKUK DAİRESİ" pattern
  const daireMatch = text.match(/(\d+)\.\s*(?:Hukuk|Ceza|HUKUK|CEZA)\s*(?:Dairesi|DAİRESİ)/i);
  // Match "ESAS NO: 2016/18275" AND "2016/18275 E." format
  const esasMatch = text.match(/ESAS\s*(?:NO)?\s*:?\s*(\d{4}\/\d+)/i)
    || text.match(/(\d{4}\/\d+)\s*E\b/i);
  const kararMatch = text.match(/KARAR\s*(?:NO)?\s*:?\s*(\d{4}\/\d+)/i)
    || text.match(/(\d{4}\/\d+)\s*K\b/i);
  const tarihMatch = text.match(/KARAR\s*TARİHİ?\s*:?\s*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i)
    || text.match(/TAR[İI]H[İI]?\s*:?\s*(\d{2}[\.\/]\d{2}[\.\/]\d{4})/i);
  const konuMatch = text.match(/(?:DAVANIN?\s*)?KONUSU?\s*:?\s*([^\n<]+)/i)
    || text.match(/DAVA\s*TÜRÜ\s*:?\s*([^\n<]+)/i);

  // Determine mahkeme from daire match if mahkemeMatch not found
  let mahkeme = mahkemeMatch ? mahkemeMatch[1].replace(/\n/g, ' ').trim() : '';
  const daireStr = daireMatch ? daireMatch[0].trim() : '';
  if (!mahkeme && daireStr) {
    // If daire contains "Hukuk Dairesi" it's likely Yargıtay
    if (/Hukuk\s*Dairesi/i.test(daireStr)) mahkeme = 'Yargıtay';
    else if (/Ceza\s*Dairesi/i.test(daireStr)) mahkeme = 'Yargıtay';
  }

  return {
    mahkeme,
    daire: daireStr || '',
    esasNo: esasMatch ? esasMatch[1] : '',
    kararNo: kararMatch ? kararMatch[1] : '',
    tarih: tarihMatch ? tarihMatch[1] : '',
    konu: konuMatch ? konuMatch[1].trim() : '',
  };
}

// Tarih formatını UYAP formatına çevir (YYYY-MM-DD -> DD.MM.YYYY)
function formatDateForUyap(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// Yardımcı: Karar kalitesini kontrol et (Sadece yeterince uzun ve doyurucu kararları al)
function checkQuality(metin: string): boolean {
  if (!metin) return false;

  // Sadece 2000 karakterden uzun olan kararları kabul ediyoruz.
  // Bu sınır, usul (görevsizlik/iade) kararlarını otomatik olarak eler.
  return metin.length >= 2000;
}

// Akıllı Snippet Çıkarıcı: Sorgu kelimelerinin en yoğun olduğu paragrafı bulur
function getSmartSnippet(text: string, query: string, maxLength: number = 400): string {
  if (!text) return '';
  const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  if (terms.length === 0) return text.substring(0, maxLength) + '...';

  // Find all indices of terms
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let bestSentenceIndex = -1;
  let maxScore = -1;

  for (let i = 0; i < sentences.length; i++) {
    let score = 0;
    const sentence = sentences[i].toLowerCase();

    // Basit TF-IDF benzeri skorlama
    for (const term of terms) {
      if (sentence.includes(term)) score += 1;
    }

    if (score > maxScore) {
      maxScore = score;
      bestSentenceIndex = i;
    }
  }

  if (bestSentenceIndex !== -1 && maxScore > 0) {
    // Return best sentence + neighbors if short
    let snippet = sentences[bestSentenceIndex].trim();

    // Add neighbor sentences if snippet is too short
    if (snippet.length < 100) {
      if (bestSentenceIndex > 0) snippet = sentences[bestSentenceIndex - 1].trim() + ' ' + snippet;
      if (bestSentenceIndex < sentences.length - 1) snippet = snippet + ' ' + sentences[bestSentenceIndex + 1].trim();
    }

    // Highlight terms (simple HTML wrapper for UI to handle if needed, or just markdown)
    // For now returning plain text window, UI can highlight. 
    // Wait, user said "tam alıntıladığı kısmını versin". Returning a focused snippet is key.
    return snippet.substring(0, maxLength) + (snippet.length > maxLength ? '...' : '');
  }

  // Fallback: Return text containing first occurrence of first keyword
  const firstTermIndex = normalizedText.indexOf(terms[0]);
  if (firstTermIndex !== -1) {
    const start = Math.max(0, firstTermIndex - 50);
    return '...' + text.substring(start, start + maxLength) + '...';
  }

  return text.substring(0, maxLength) + '...';
}

interface HukukSozluguItem {
  id: number;
  terim: string;
  anlam: string;
  harf?: string;
  score?: number;
}

class EmsalClient {
  private baseUrl = 'https://emsal.uyap.gov.tr';
  private sessionId: string | null = null;
  private currentSessionUA: string | null = null;
  private cookieJar: string = '';

  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];

  private getRandomUA() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private getCommonHeaders() {
    return {
      'User-Agent': this.currentSessionUA || this.getRandomUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  async initSession(): Promise<string> {
    this.currentSessionUA = this.getRandomUA();
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: this.getCommonHeaders(),
      });

      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        // Simple cookie jar implementation: just concat all for now as fetch handles array headers poorly in some envs
        // In Node fetch, set-cookie might be a string or array. We need to capture the full string.
        this.cookieJar = setCookie;

        const match = this.cookieJar.match(/JSESSIONID=([^;]+)/);
        if (match) {
          this.sessionId = match[1];
          await new Promise(r => setTimeout(r, 1000));
          return this.sessionId;
        }
      }

      // Fallback: if no cookie returned, maybe we already have a session? 
      // But UYAP usually sets it on first hit.
      console.warn('UYAP initSession: No Set-Cookie header found.');
      return ''; // Attempting to continue might fail but better than throwing immediately if sporadic
    } catch (err) {
      // Silent fail to allow retry
      console.error('Session Init Error:', err);
      throw new Error('Session initialization failed');
    }
    throw new Error('Session ID not found in cookies');
  }

  async searchLive(query: string, page: number = 1, filters: SearchFilters = {}, pageSize: number = 10, forceNewSession: boolean = false): Promise<SearchResponse> {
    if (!this.sessionId || forceNewSession) {
      await this.initSession();
    }

    const headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cookie': this.cookieJar,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // Fixed trusted UA
      'Accept': 'application/json, text/plain, */*',
      'Origin': 'https://emsal.uyap.gov.tr',
      'Referer': 'https://emsal.uyap.gov.tr/',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    const searchData: Record<string, any> = {
      arananKelime: query || filters.keyword || '',
      "Bam Hukuk Mahkemeleri": "",
      "Hukuk Mahkemeleri": "",
      birimHukukMah: "",
      esasYil: filters.esasNoYil || '',
      esasIlkSiraNo: "",
      esasSonSiraNo: "",
      kararYil: filters.kararYil || '',
      kararIlkSiraNo: "",
      kararSonSiraNo: "",
      baslangicTarihi: filters.baslangicTarihi ? formatDateForUyap(filters.baslangicTarihi) : '',
      bitisTarihi: filters.bitisTarihi ? formatDateForUyap(filters.bitisTarihi) : '',
      siralama: "1",
      siralamaDirection: "desc",
      pageSize: pageSize,
      pageNumber: page
    };

    try {
      // User-verified endpoint: /aramalist
      const response = await fetch(`${this.baseUrl}/aramalist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data: searchData }),
      });

      if (!response.ok) throw new Error(`UYAP API Hatası: ${response.status}`);

      const responseData = await response.json();
      let results: SearchResult[] = [];
      let total = 0;

      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        results = responseData.data.data.map((item: any) => ({
          id: String(item.id || ''),
          mahkeme: '',
          daire: String(item.daire || ''),
          esasNo: String(item.esasNo || ''),
          kararNo: String(item.kararNo || ''),
          tarih: String(item.kararTarihi || ''),
          ozet: String(item.durum || ''),
        }));
        total = responseData.data.recordsTotal || results.length;
      }

      return { results, total, page };
    } catch (err) {
      console.error('UYAP Live Search Error:', err);
      return { results: [], total: 0, page };
    }
  }

  async search(query: string, page: number = 1, filters: SearchFilters = {}, pageSize: number = 10): Promise<SearchResponse> {
    try {
      console.log('Local keyword search:', query);

      let sql = 'SELECT * FROM kararlar_fts WHERE kararlar_fts MATCH ?';
      const params: any[] = [query];

      // Basic date filters if needed
      if (filters.baslangicTarihi || filters.bitisTarihi) {
        // Note: FTS5 results might need to be joined with main table for complex filters
        sql = `
          SELECT k.* FROM kararlar k
          JOIN kararlar_fts f ON k.id = f.id
          WHERE f.kararlar_fts MATCH ?
        `;
        if (filters.baslangicTarihi) {
          sql += ' AND k.tarih >= ?';
          params.push(filters.baslangicTarihi);
        }
        if (filters.bitisTarihi) {
          sql += ' AND k.tarih <= ?';
          params.push(filters.bitisTarihi);
        }
      }

      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);

      const rows = db.prepare(sql).all(...params) as any[];
      const countRow = db.prepare('SELECT count(*) as total FROM kararlar_fts WHERE kararlar_fts MATCH ?').get(query) as any;

      const results: SearchResult[] = rows.map(row => ({
        id: row.id,
        mahkeme: row.mahkeme || '',
        daire: row.daire || '',
        esasNo: row.esas_no || '',
        kararNo: row.karar_no || '',
        tarih: row.tarih || '',
        ozet: row.ozet || '',
        metin: row.metin || '',
      }));

      return { results, total: countRow?.total || 0, page };
    } catch (err) {
      console.error('Local keyword search failed:', err);
      // Fallback to empty if local fails, rather than slow UYAP
      return { results: [], total: 0, page };
    }
  }

  // --- HUKUK SÖZLÜĞÜ ARAMA ---
  async searchHukukSozlugu(query: string, matchThreshold: number = 0.1, matchCount: number = 3): Promise<HukukSozluguItem[]> {
    try {
      console.log(`📖 Searching Legal Dictionary: "${query}"`);
      const { generateEmbedding } = await import('./embeddings');
      const queryEmbedding = await generateEmbedding(query);

      let results: HukukSozluguItem[] = [];

      if (queryEmbedding.length > 0) {
        const rows = db.prepare('SELECT id, terim, anlam, harf, embedding FROM hukuk_sozlugu WHERE embedding IS NOT NULL').all() as any[];
        results = rows.map(row => {
          const rowEmbedding = new Float32Array(row.embedding.buffer);
          const similarity = this.cosineSimilarity(queryEmbedding, Array.from(rowEmbedding));
          return {
            id: row.id,
            terim: row.terim,
            anlam: row.anlam,
            harf: row.harf,
            score: similarity
          };
        })
          .filter(r => r.score >= matchThreshold)
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, matchCount);
      }

      // Keyword fallback if semantic results are low
      if (results.length < 2) {
        const keywordRows = db.prepare(`
          SELECT id, terim, anlam, harf FROM hukuk_sozlugu 
          WHERE terim LIKE ? OR anlam LIKE ? 
          LIMIT ?
        `).all(`%${query}%`, `%${query}%`, matchCount) as any[];

        const existingIds = new Set(results.map(r => r.id));
        for (const row of keywordRows) {
          if (!existingIds.has(row.id)) {
            results.push({
              id: row.id,
              terim: row.terim,
              anlam: row.anlam,
              harf: row.harf,
              score: 0.5
            });
          }
        }
      }

      return results;
    } catch (err) {
      console.error('Legal dictionary search failed:', err);
      return [];
    }
  }

  // Semantik (AI) Arama - Local SQLite implementation
  // NOT: 776k karar tablosu Nomic (Ollama) ile vektörlendiği için burada her zaman yerel embedding kullanılır.
  async searchSemantically(query: string, matchThreshold: number = 0.1, matchCount: number = 5): Promise<SearchResult[]> {
    try {
      const { generateEmbedding } = await import('./embeddings');
      const queryEmbedding = await generateEmbedding(query);

      if (queryEmbedding.length === 0) return [];

      // Optimization: Fetch only rows that have embeddings
      const rows = db.prepare('SELECT id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet, embedding FROM kararlar WHERE embedding IS NOT NULL').all() as any[];

      const results = rows.map(row => {
        // Convert Buffer to Float32Array
        const rowEmbedding = new Float32Array(row.embedding.buffer);
        const similarity = this.cosineSimilarity(queryEmbedding, Array.from(rowEmbedding));
        return {
          id: row.id,
          mahkeme: row.mahkeme || '',
          daire: row.daire || '',
          esasNo: row.esas_no || '',
          kararNo: row.karar_no || '',
          tarih: row.tarih || '',
          ozet: row.ozet || '',
          metin: row.metin || '',
          similarity
        };
      })

      // Debug: Log top 3 raw scores to understand why local results are filtered
      const top3 = results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, 3);
      console.log(`🔍 [DEBUG] Top 3 Semantic Scores for "${query}":`, top3.map(r => r.similarity?.toFixed(4)));

      return results
        .filter(r => r.similarity !== undefined && r.similarity >= matchThreshold)
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, matchCount);

    } catch (error) {
      console.error('Local semantic search failed:', error);
      return [];
    }
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return isNaN(similarity) ? 0 : similarity;
  }


  // FTS5 sorgusu oluştur (Strict ve Relaxed)
  private createFtsQuery(query: string, type: 'AND' | 'OR' = 'AND'): string {
    const terms = query
      .replace(/[?*":^(){}\[\]+\-~,.#&|!]/g, ' ') // Enhanced cleaning (added #&|!)
      .replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 2); // Çok kısa kelimeleri filtrele

    if (terms.length === 0) return '';

    if (type === 'AND') {
      // "term1" "term2" "term3" format for implicit AND
      return terms.map(t => `"${t}"`).join(' ');
    } else {
      // term1 OR term2 OR term3
      return terms.join(' OR ');
    }
  }

  // Mevzuat (Kanun) Araması - Local SQLite implementation (Hybrid)
  async searchMevzuat(query: string, matchThreshold: number = 0.1, matchCount: number = 5): Promise<MevzuatItem[]> {
    const strictQuery = this.createFtsQuery(query, 'AND');
    const relaxedQuery = this.createFtsQuery(query, 'OR');

    if (!strictQuery) return [];

    try {
      // 1. Semantic Search DISABLED (Resource Intensive)
      // We rely on FTS5 for lightweight and fast results as requested by user.

      // 2. Keyword results (FTS5) - Primary Search Method
      let ftsRows: any[] = [];
      try {
        ftsRows = db.prepare('SELECT id, kanun_adi, madde_no, baslik, icerik, bm25(mevzuat_fts, 0, 10.0, 5.0, 5.0, 1.0) as rank FROM mevzuat_fts WHERE mevzuat_fts MATCH ? ORDER BY rank LIMIT 20').all(strictQuery) as any[];
      } catch (e) {
        console.error('FTS Error:', e);
      }

      // If strict returns too few results, try relaxed
      if (ftsRows.length < 5 && relaxedQuery) {
        console.log('Strict FTS low results, trying relaxed OR query');
        const relaxedRows = db.prepare('SELECT id, kanun_adi, madde_no, baslik, icerik, bm25(mevzuat_fts, 0, 10.0, 5.0, 5.0, 1.0) as rank FROM mevzuat_fts WHERE mevzuat_fts MATCH ? ORDER BY rank LIMIT 20').all(relaxedQuery) as any[];

        // Merge relaxed rows, avoiding duplicates
        const existingIds = new Set(ftsRows.map(r => r.id));
        for (const row of relaxedRows) {
          if (!existingIds.has(row.id)) {
            ftsRows.push(row);
            existingIds.add(row.id);
          }
        }
      }

      // Return simplified items with score 1 (since we don't have semantic scores anymore)
      return ftsRows
        .slice(0, matchCount)
        .map(item => ({
          ...this.formatMevzuatItem(item),
          score: 1.0
        }));
    } catch (err) {
      console.error('Local hybrid mevzuat search failed:', err);
      // Ultimate Fallback: relaxed query only
      try {
        if (relaxedQuery) {
          const ftsRows = db.prepare('SELECT id, kanun_adi, madde_no, baslik, icerik FROM mevzuat_fts WHERE mevzuat_fts MATCH ? LIMIT ?').all(relaxedQuery, matchCount) as any[];
          return ftsRows.map(r => this.formatMevzuatItem({ ...r, score: 0.5 }));
        }
        return [];
      } catch (e) {
        return [];
      }
    }
  }

  // Formatting helper for Mevzuat items
  private formatMevzuatItem(item: any): MevzuatItem {
    let maddeNo = item.madde_no || '';
    // Fix "Madde Madde" redundancy
    if (maddeNo.toLowerCase().startsWith('madde')) {
      maddeNo = maddeNo.substring(5).trim();
    }

    return {
      id: item.id,
      kanun_adi: item.kanun_adi,
      madde_no: maddeNo,
      baslik: item.baslik,
      icerik: item.icerik,
      score: item.score
    };
  }

  // Toplu kaydet (Metadata için)


  // Karar detayını çek
  async getKarar(id: string, source?: string): Promise<KararDetay> {
    // 1. Local SQLite kontrol et
    const existing = db.prepare('SELECT * FROM kararlar WHERE id = ?').get(id) as any;

    if (existing && existing.metin) {
      // If cached metadata is empty, try to extract from text
      let mahkeme = existing.mahkeme;
      let daire = existing.daire;
      let esasNo = existing.esas_no;
      let kararNo = existing.karar_no;
      let tarih = existing.tarih || '';
      let konu = existing.konu;

      if (!esasNo || !kararNo) {
        const meta = extractMetadata(existing.metin);
        mahkeme = mahkeme || meta.mahkeme || '';
        daire = daire || meta.daire || '';
        esasNo = esasNo || meta.esasNo || '';
        kararNo = kararNo || meta.kararNo || '';
        tarih = tarih || meta.tarih || '';
        konu = konu || meta.konu || '';
      }

      return {
        id: existing.id,
        mahkeme,
        daire,
        esasNo,
        kararNo,
        tarih,
        konu,
        metin: existing.metin,
        ozet: existing.ozet,
        fromCache: true,
      };
    }

    // 2. Worker API'den tam metin çek (Bedesten / Emsal)
    try {
      const workerText = await this.getYargiMCPDocument(id, source || 'bedesten');
      if (workerText && workerText.length > 100) {
        const metadata = extractMetadata(workerText);
        const karar: KararDetay = {
          id,
          mahkeme: metadata.mahkeme || '',
          daire: metadata.daire || '',
          esasNo: metadata.esasNo || '',
          kararNo: metadata.kararNo || '',
          tarih: metadata.tarih || '',
          konu: metadata.konu || '',
          metin: workerText,
          ozet: '',
        };

        // Cache locally for future requests
        if (checkQuality(karar.metin)) {
          await this.saveKarar(karar);
        }

        return karar;
      }
    } catch (e) {
      console.error('Worker API document fetch failed, falling back to UYAP:', e);
    }

    // 3. Fallback: UYAP'tan çek
    if (!this.sessionId) {
      await this.initSession();
    }

    const response = await fetch(`${this.baseUrl}/getDokuman?id=${id}`, {
      method: 'GET',
      headers: {
        'Cookie': `JSESSIONID=${this.sessionId}`,
        'User-Agent': this.currentSessionUA || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    });

    const data = await response.json();

    // Response'dan HTML çıkar
    const html = String(data?.data || '');
    const metin = htmlToText(html);
    const metadata = extractMetadata(metin);

    const karar: KararDetay = {
      id,
      mahkeme: metadata.mahkeme || '',
      daire: metadata.daire || '',
      esasNo: metadata.esasNo || '',
      kararNo: metadata.kararNo || '',
      tarih: metadata.tarih || '',
      konu: metadata.konu || '',
      metin,
      ozet: existing?.ozet || '',
    };


    // 4. Kalite Kontrolü ve Kaydetme
    if (karar.metin && checkQuality(karar.metin)) {
      await this.saveKarar(karar);
    }


    return karar;
  }

  async saveKarar(karar: KararDetay) {
    // SADECE İNDİRME HIZINA ODAKLANMAK İÇİN CANLI EMBEDDING'İ DEVRE DIŞI BIRAKTIK
    // batch-vectorize.ts arkadan gelip hepsini toplu halledecek.
    let embedding: number[] | null = null;


    // Save to local SQLite
    const insert = db.prepare(`
      INSERT OR REPLACE INTO kararlar 
      (id, mahkeme, daire, esas_no, karar_no, tarih, konu, metin, ozet, embedding, full_text_fetched)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      karar.id,
      karar.mahkeme,
      karar.daire,
      karar.esasNo,
      karar.kararNo,
      karar.tarih,
      karar.konu,
      karar.metin,
      karar.ozet,
      embedding ? Buffer.from(new Float32Array(embedding).buffer) : null,
      1
    );
  }
  // --- HYBRID SEARCH (RRF FUSION) ---

  async hybridSearchKararlar(query: string, limit: number = 10, courtFilter?: string, page: number = 1): Promise<SearchResult[]> {
    try {
      console.log(`🚀 Search Initiated for: "${query}" (Page: ${page}, Court Filter: ${courtFilter || 'None'})`);

      // Worker API only (Bedesten + UYAP Emsal)
      const yargiResults = await this.searchYargiMCP(query, [], limit, courtFilter, page);

      console.log(`✅ Worker API Search Completed. Found ${yargiResults.length} results.`);

      return yargiResults.map(item => ({
        id: item.id,
        mahkeme: item.mahkeme,
        daire: item.daire,
        esasNo: item.esasNo,
        kararNo: item.kararNo,
        tarih: item.tarih,
        metin: item.metin,
        ozet: item.ozet || getSmartSnippet(item.metin || '', query),
        similarity: item.score || 1,
        kaynak: (item.kaynak || 'Bedesten') as 'Yerel' | 'Bedesten'
      }));

    } catch (err) {
      console.error('Hybrid Search Pipeline Failed:', err);
      return [];
    }
  }

  // --- YARGI-MCP (REMOTE BEDESTEN) INTEGRATION ---

  // --- YARGI-MCP (WORKER API) INTEGRATION ---
  private workerApiUrl = process.env.WORKER_API_URL || 'https://hukuk-karar-api.fgureli.workers.dev';
  private workerApiAvailable = true;
  private workerApiLastFailure = 0; // Timestamp of last failure
  private workerApiRetryInterval = 60000; // Retry after 60 seconds

  async searchYargiMCP(query: string, courtTypes: string[] = [], limit: number = 10, courtFilter?: string, page: number = 1): Promise<YargiMCPResult[]> {
    try {
      // Skip if worker API is known to be unavailable, but retry after interval
      if (!this.workerApiAvailable) {
        if (Date.now() - this.workerApiLastFailure > this.workerApiRetryInterval) {
          console.log('🔄 Retrying Worker API after cooldown...');
          this.workerApiAvailable = true;
        } else {
          return [];
        }
      }

      console.log(`🌐 Worker API Search: "${query}" (Page: ${page}, Filter: ${courtFilter || 'None'})`);

      // Parallel requests reduced to avoid 429 rate limiting
      const promises: Promise<YargiMCPResult[]>[] = [];

      // 1. Bedesten (Dynamic courts based on filter)
      let bedestenCourts = 'YARGITAYKARARI,DANISTAYKARAR,BAMKARAR,BIMKARAR,YERELMAHKEMEKARAR';
      if (courtFilter === 'yargitay') bedestenCourts = 'YARGITAYKARARI';
      else if (courtFilter === 'danistay') bedestenCourts = 'DANISTAYKARAR';
      else if (courtFilter === 'bolge') bedestenCourts = 'BAMKARAR,BIMKARAR';
      else if (courtFilter === 'emsal') bedestenCourts = 'YERELMAHKEMEKARAR';

      promises.push(this.fetchWorkerSearch(`search?courts=${bedestenCourts}&page=${page}`, query));

      // 2. UYAP Emsal (Only if compatible filter)
      if (!courtFilter || courtFilter === 'bolge' || courtFilter === 'emsal') {
        const type = courtFilter === 'bolge' ? 'bolge' : (courtFilter === 'emsal' ? 'yerel' : '');
        promises.push(this.fetchWorkerSearch(`emsal?page=${page}${type ? `&type=${type}` : ''}`, query));
      }

      const results = await Promise.allSettled(promises);
      let allDecisions: YargiMCPResult[] = [];

      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          allDecisions = [...allDecisions, ...res.value];
        }
      });

      console.log(`✅ Worker API: Found ${allDecisions.length} results from ${promises.length} sources`);
      return allDecisions.slice(0, limit);
    } catch (err) {
      console.error('Worker API search failed:', err);
      return [];
    }
  }

  /**
   * SADECE AI ASİSTANI İÇİN HİBRİT ARAMA (API + Local FTS)
   * Vektör/Embedding YOK (Disk/RAM tasarrufu)
   */
  async hybridSearchForAI(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      console.log(`🤖 AI Hybrid Search Initiated: "${query}"`);

      const results = await Promise.allSettled([
        // A. Worker API
        this.searchYargiMCP(query, [], limit),

        // B. Local FTS (Lightweight)
        new Promise<SearchResult[]>(resolve => {
          try {
            const ftsQuery = this.createFtsQuery(query, 'AND');
            if (!ftsQuery) return resolve([]);

            const rows = db.prepare(`
                        SELECT id, mahkeme, daire, esas_no as esasNo, karar_no as kararNo, tarih, metin 
                        FROM kararlar_fts 
                        WHERE kararlar_fts MATCH ? 
                        ORDER BY rank 
                        LIMIT ?
                    `).all(ftsQuery, limit) as any[];

            const mapped = rows.map(r => ({
              id: r.id.toString(),
              mahkeme: r.mahkeme || 'Yerel Mahkeme',
              daire: r.daire,
              esasNo: r.esasNo,
              kararNo: r.kararNo,
              tarih: r.tarih,
              metin: r.metin,
              ozet: getSmartSnippet(r.metin, query),
              similarity: 0.85,
              kaynak: 'Yerel' as 'Yerel' | 'Bedesten'
            }));
            resolve(mapped);
          } catch (e) {
            console.error('Local FTS for AI failed:', e);
            resolve([]);
          }
        })
      ]);

      const apiResults = results[0].status === 'fulfilled' ? results[0].value : []; // YargiMCPResult[]
      const localResults = results[1].status === 'fulfilled' ? results[1].value : []; // SearchResult[]

      // Tip dönüşümü ve birleştirme
      const apiMapped: SearchResult[] = apiResults.map(item => ({
        id: item.id,
        mahkeme: item.mahkeme,
        daire: item.daire,
        esasNo: item.esasNo,
        kararNo: item.kararNo,
        tarih: item.tarih,
        metin: item.metin,
        ozet: item.ozet || getSmartSnippet(item.metin || '', query),
        similarity: item.score || 0.9,
        kaynak: (item.kaynak || 'Bedesten') as 'Yerel' | 'Bedesten'
      }));

      console.log(`✅ AI Search: API=${apiMapped.length}, Local=${localResults.length}`);

      // Interleave (Birleştir)
      const combined: SearchResult[] = [];
      const maxLength = Math.max(apiMapped.length, localResults.length);

      for (let i = 0; i < maxLength; i++) {
        if (i < apiMapped.length) combined.push(apiMapped[i]);
        if (i < localResults.length) combined.push(localResults[i]);
      }

      return combined.slice(0, limit * 2);

    } catch (err) {
      console.error('AI Hybrid Search Failed:', err);
      return [];
    }
  }

  private async fetchWorkerSearch(endpoint: string, query: string, type?: string): Promise<YargiMCPResult[]> {
    try {
      const url = new URL(`${this.workerApiUrl}/${endpoint}`);
      url.searchParams.append('q', query);
      url.searchParams.append('page', '1');
      if (type) url.searchParams.append('type', type);

      // 10s timeout per request (Optimized)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const requestUrl = url.toString();
      // console.log(`🌍 Fetching: ${requestUrl}`);

      const response = await fetch(requestUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`❌ Worker API Error (${endpoint}): ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const decisions = data.decisions || [];

      return decisions.map((d: any) => ({
        id: String(d.id),
        mahkeme: d.mahkeme || '',
        daire: d.daire || '',
        esasNo: d.esasNo || '',
        kararNo: d.kararNo || '',
        tarih: d.tarih || '',
        metin: d.metin || '', // Use snippet from worker if available
        score: 0.8, // Default score for remote results
        kaynak: d.kaynak === 'Bedesten' ? 'Bedesten' : 'Yerel'
      }));
    } catch (e: any) {
      // Any network error (ECONNREFUSED, timeout, DNS, etc.) - disable worker API temporarily
      this.workerApiAvailable = false;
      this.workerApiLastFailure = Date.now();
      if (e.name === 'AbortError') {
        console.warn(`⚠️ Worker API Timeout (${endpoint}), using local DB only.`);
      } else {
        console.warn(`⚠️ Worker API unavailable (${endpoint}), using local DB for ${this.workerApiRetryInterval / 1000}s.`);
      }
      return [];
    }
  }

  /**
   * Worker API üzerinden karar metnini getirir
   */
  async getYargiMCPDocument(id: string, source: string = 'bedesten'): Promise<string> {
    try {
      // Heuristic for source detection if generic
      let apiSource = source.toLowerCase();
      if (!['bedesten', 'emsal'].includes(apiSource)) {
        if (id.length > 9) apiSource = 'emsal';
        else apiSource = 'bedesten';
      }

      const response = await fetch(`${this.workerApiUrl}/document/${id}?source=${apiSource}`);
      if (!response.ok) return '';

      const data = await response.json();
      return data.text || '';
    } catch (err) {
      console.error('Worker API document fetch failed:', err);
      return '';
    }
  }
}

// Singleton instance
export const emsalClient = new EmsalClient();
export type { SearchResult, SearchResponse, KararDetay, SearchFilters };

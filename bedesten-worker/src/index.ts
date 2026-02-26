/**
 * Hukuk Karar API — Cloudflare Worker
 * 
 * Tüm Türk Yargı Karar Kaynaklarına Doğrudan Erişim
 * Yargı-MCP bağımlılığını tamamen kaldırır.
 *
 * Endpoints:
 *   GET /search?q=...&courts=YARGITAYKARARI,DANISTAYKARAR&page=1    (Bedesten)
 *   GET /emsal?q=...&page=1                                          (UYAP Emsal)
 *   GET /anayasa?q=...&type=bireysel&page=1                          (Anayasa Mahkemesi - Sadece Bireysel)
 *   GET /sayistay?q=...&type=genel|temyiz|daire&page=1               (Sayıştay)
 *   GET /document/:id?source=bedesten|emsal                          (Tam Metin)
 *   GET /health                                                       (Sağlık Kontrolü)
 */

export interface Env {
    ENVIRONMENT: string;
}

// --- CORS & Utils ---
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
    });
}

// ==========================================
// 1. BEDESTEN API (Yargıtay + Danıştay + Yerel + İstinaf)
// ==========================================

const BEDESTEN_BASE = 'https://bedesten.adalet.gov.tr';
const BEDESTEN_HEADERS: Record<string, string> = {
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'AdaletApplicationName': 'UyapMevzuat',
    'Content-Type': 'application/json; charset=utf-8',
    'Origin': 'https://mevzuat.adalet.gov.tr',
    'Referer': 'https://mevzuat.adalet.gov.tr/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
};

async function searchBedesten(query: string, courtTypes: string[], page: number): Promise<Response> {
    const itemTypeList = courtTypes.length > 0 ? courtTypes : ['YARGITAYKARARI', 'DANISTAYKARAR', 'BAMKARAR', 'BIMKARAR', 'YERELMAHKEMEKARAR'];
    const payload = {
        data: { pageSize: 10, pageNumber: page, itemTypeList, phrase: query },
    };

    try {
        const resp = await fetch(`${BEDESTEN_BASE}/emsal-karar/searchDocuments`, {
            method: 'POST', headers: BEDESTEN_HEADERS, body: JSON.stringify(payload),
        });
        if (!resp.ok) return jsonResponse({ error: `Bedesten API error: ${resp.status}`, decisions: [] }, resp.status);

        const raw: any = await resp.json();
        const content = raw?.data?.emsalKararList || raw?.data?.content || [];
        const totalElements = raw?.data?.totalElements || content.length;

        // Fetch snippets in parallel to provide "Özet" (Summary)
        const decisions = await Promise.all(content.map(async (item: any) => {
            const docId = String(item.documentId || '');
            let snippet = '';

            try {
                // Fetch document content for snippet
                const docResp = await fetch(`${BEDESTEN_BASE}/emsal-karar/getDocumentContent`, {
                    method: 'POST',
                    headers: BEDESTEN_HEADERS,
                    body: JSON.stringify({ data: { documentId: docId } }),
                });

                if (docResp.ok) {
                    const docRaw: any = await docResp.json();
                    const b64Content = docRaw?.data?.content || '';
                    if (b64Content) {
                        const decoded = atob(b64Content);
                        const bytes = new Uint8Array(decoded.length);
                        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
                        const utf8Text = new TextDecoder('utf-8').decode(bytes);

                        // Clean HTML and excess whitespace
                        snippet = utf8Text
                            .replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 300); // Take first 300 chars as summary
                    }
                }
            } catch (e) {
                console.error(`Snippet fetch failed for ${docId}:`, e);
            }

            return {
                id: docId,
                mahkeme: item.itemType?.description || 'Yargıtay Kararı',
                daire: item.birimAdi || '',
                esasNo: item.esasNo || '',
                kararNo: item.kararNo || '',
                tarih: item.kararTarihiStr || item.kararTarihi || '',
                metin: snippet, // This serves as the summary snippet
                kaynak: 'Bedesten',
            };
        }));

        return jsonResponse({ decisions, total: totalElements, page, source: 'bedesten' });
    } catch (err: any) {
        return jsonResponse({ error: err.message, decisions: [] }, 500);
    }
}

// ==========================================
// 2. UYAP EMSAL API (Yerel Mahkemeler)
// ==========================================

const EMSAL_BASE = 'https://emsal.uyap.gov.tr';
const EMSAL_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

async function searchEmsal(query: string, page: number, type?: string): Promise<Response> {
    const birimTurList = type === 'bolge' ? ['3', '4'] : (type === 'yerel' ? ['5', '6'] : undefined);
    const payload = {
        data: { arananKelime: query, pageSize: 10, pageNumber: page, siralama: '1', siralamaDirection: 'desc', birimTurList },
    };

    try {
        const resp = await fetch(`${EMSAL_BASE}/aramadetaylist`, {
            method: 'POST', headers: EMSAL_HEADERS, body: JSON.stringify(payload),
        });
        if (!resp.ok) return jsonResponse({ error: `UYAP Emsal API error: ${resp.status}`, decisions: [] }, resp.status);

        const raw: any = await resp.json();
        const records = raw?.data?.data || [];
        const total = raw?.data?.recordsTotal || 0;

        // Fetch snippets in parallel for Emsal
        const decisions = await Promise.all(records.map(async (item: any) => {
            const docId = String(item.id || '');
            let snippet = '';

            try {
                const docResp = await fetch(`${EMSAL_BASE}/getDokuman?id=${docId}`, {
                    method: 'GET', headers: EMSAL_HEADERS,
                });

                if (docResp.ok) {
                    const docRaw: any = await docResp.ok ? await docResp.json() : null;
                    const htmlContent = docRaw?.data || '';
                    if (htmlContent && typeof htmlContent === 'string') {
                        snippet = htmlContent
                            .replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .substring(0, 300);
                    }
                }
            } catch (e) {
                console.error(`Emsal snippet fetch failed for ${docId}:`, e);
            }

            return {
                id: docId,
                mahkeme: item.mahkeme || 'Emsal',
                daire: item.daire || '',
                esasNo: item.esas_no || item.esasNo || '',
                kararNo: item.karar_no || item.kararNo || '',
                tarih: item.karar_tarihi || item.kararTarihi || '',
                metin: snippet,
                kaynak: 'Emsal',
            };
        }));

        return jsonResponse({ decisions, total, page, source: 'emsal' });
    } catch (err: any) {
        return jsonResponse({ error: err.message, decisions: [] }, 500);
    }
}

// ==========================================
// 3. ANAYASA MAHKEMESİ (Bireysel Başvuru)
// ==========================================

const ANAYASA_BIREYSEL_BASE = 'https://kararlarbilgibankasi.anayasa.gov.tr';

async function searchAnayasa(query: string, page: number): Promise<Response> {
    try {
        // HTML Scraping for Bireysel Başvuru
        const searchUrl = `${ANAYASA_BIREYSEL_BASE}/Ara?KararBulteni=1&KelimeAra[]=${encodeURIComponent(query)}&page=${page}`;

        const resp = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
        });

        if (!resp.ok) return jsonResponse({ error: `Anayasa BB API error: ${resp.status}`, decisions: [] }, resp.status);

        const html = await resp.text();
        const decisions = parseAnayasaHTML(html);

        // Simple estimation for total count from scraping results
        const total = decisions.length;

        return jsonResponse({ decisions, total, page, source: 'anayasa-bireysel' });
    } catch (err: any) {
        return jsonResponse({ error: err.message, decisions: [] }, 500);
    }
}

function parseAnayasaHTML(html: string): any[] {
    const decisions: any[] = [];

    // Matches <div class="KararBulteniBirKarar">...</div> blocks roughly
    // We use simpler regex for individual fields assuming standard structure

    // Split HTML bydecision blocks to make regex safer
    const blocks = html.split('class="KararBulteniBirKarar"');
    // Skip the first split part as it's before the first decision
    for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];

        // Extract Title/Subject
        const titleMatch = block.match(/<h4>\s*([^<]+)\s*<\/h4>/);
        const title = titleMatch ? titleMatch[1].trim() : '';

        // Extract Link (ID)
        const linkMatch = block.match(/href="([^"]+)"/);
        const url = linkMatch ? linkMatch[1] : '';
        const id = url.split('/').pop() || '';

        // Extract Application No
        const appNoMatch = block.match(/Başvuru Numarası\s*:\s*<b>([^<]+)<\/b>/);
        const appNo = appNoMatch ? appNoMatch[1].trim() : '';

        // Extract Date
        const dateMatch = block.match(/Karar Tarihi\s*:\s*([^<]+)</);
        const date = dateMatch ? dateMatch[1].trim() : '';

        if (id || appNo) {
            decisions.push({
                id: id || appNo,
                mahkeme: 'Anayasa Mahkemesi (Bireysel)',
                daire: 'Bireysel Başvuru',
                esasNo: appNo, // Using Application No as Esas No equivalent
                kararNo: '',
                tarih: date,
                konu: title,
                kaynak: 'Anayasa-BB',
                url: url ? `${ANAYASA_BIREYSEL_BASE}${url}` : '',
            });
        }
    }

    return decisions;
}

// ==========================================
// 4. SAYIŞTAY (Daire + Genel Kurul + Temyiz)
// ==========================================

const SAYISTAY_BASE = 'https://www.sayistay.gov.tr';

async function searchSayistay(query: string, type: string, page: number): Promise<Response> {
    const endpoints: Record<string, string> = {
        genel: '/KararlarGenelKurul',
        temyiz: '/KararlarTemyiz',
        daire: '/KararlarDaire',
    };

    const searchEndpoints: Record<string, string> = {
        genel: '/KararlarGenelKurul/DataTablesList',
        temyiz: '/KararlarTemyiz/DataTablesList',
        daire: '/KararlarDaire/DataTablesList',
    };

    const endpointType = type || 'genel';
    const pageUrl = endpoints[endpointType] || endpoints.genel;
    const searchUrl = searchEndpoints[endpointType] || searchEndpoints.genel;

    try {
        // Step 1: Get session cookies + CSRF token
        const pageResp = await fetch(`${SAYISTAY_BASE}${pageUrl}`, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
        });

        if (!pageResp.ok) return jsonResponse({ error: `Sayıştay session error: ${pageResp.status}`, decisions: [] }, pageResp.status);

        const pageHtml = await pageResp.text();
        const cookies = pageResp.headers.get('set-cookie') || '';

        // Extract CSRF token
        const csrfMatch = pageHtml.match(/name="__RequestVerificationToken"[^>]*value="([^"]*)"/);
        const csrfToken = csrfMatch ? csrfMatch[1] : '';

        // Step 2: Search with session
        const formData = new URLSearchParams();
        formData.append('__RequestVerificationToken', csrfToken);
        formData.append('draw', '1');
        formData.append('start', String((page - 1) * 10));
        formData.append('length', '10');
        formData.append('search[value]', query);

        const searchResp = await fetch(`${SAYISTAY_BASE}${searchUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0',
                'Referer': `${SAYISTAY_BASE}${pageUrl}`,
            },
            body: formData.toString(),
        });

        if (!searchResp.ok) return jsonResponse({ error: `Sayıştay search error: ${searchResp.status}`, decisions: [] }, searchResp.status);

        const result: any = await searchResp.json();
        const records = result?.data || [];
        const total = result?.recordsTotal || result?.recordsFiltered || records.length;

        const decisions = records.map((item: any) => ({
            id: item.id || item.Id || '',
            mahkeme: `Sayıştay (${endpointType === 'genel' ? 'Genel Kurul' : endpointType === 'temyiz' ? 'Temyiz' : 'Daire'})`,
            daire: item.daire || item.Daire || item.daireAdi || '',
            esasNo: item.esasNo || item.EsasNo || item.tutanakNo || '',
            kararNo: item.kararNo || item.KararNo || '',
            tarih: item.kararTarihi || item.KararTarihi || '',
            konu: item.konusu || item.Konusu || item.kamuIdaresi || '',
            kaynak: 'Sayıştay',
        }));

        return jsonResponse({ decisions, total, page, source: `sayistay-${endpointType}` });
    } catch (err: any) {
        return jsonResponse({ error: err.message, decisions: [] }, 500);
    }
}

// ==========================================
// 5. DOCUMENT FETCH (Full Text)
// ==========================================

async function getDocument(id: string, source: string): Promise<Response> {
    try {
        if (source === 'bedesten') {
            const resp = await fetch(`${BEDESTEN_BASE}/emsal-karar/getDocumentContent`, {
                method: 'POST', headers: BEDESTEN_HEADERS,
                body: JSON.stringify({ data: { documentId: id } }),
            });
            if (!resp.ok) return jsonResponse({ error: `Document fetch error: ${resp.status}` }, resp.status);

            const raw: any = await resp.json();
            const content = raw?.data?.content || '';
            const mimeType = raw?.data?.mimeType || 'text/html';

            let text = '';
            if (content) {
                const decoded = atob(content);
                // Fix Turkish character encoding
                const bytes = new Uint8Array(decoded.length);
                for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
                const textDecoder = new TextDecoder('utf-8');
                const utf8Text = textDecoder.decode(bytes);
                text = mimeType === 'text/html'
                    ? utf8Text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    : utf8Text;
            }

            return jsonResponse({ id, text, mimeType, source: 'bedesten', url: `https://mevzuat.adalet.gov.tr/ictihat/${id}` });

        } else {
            // UYAP Emsal document
            const resp = await fetch(`${EMSAL_BASE}/getDokuman?id=${id}`, {
                method: 'GET', headers: EMSAL_HEADERS,
            });
            if (!resp.ok) return jsonResponse({ error: `Document fetch error: ${resp.status}` }, resp.status);

            const raw: any = await resp.json();
            const htmlContent = raw?.data || '';
            const text = typeof htmlContent === 'string'
                ? htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                : '';

            return jsonResponse({ id, text, mimeType: 'text/html', source: 'emsal' });
        }
    } catch (err: any) {
        return jsonResponse({ error: err.message }, 500);
    }
}

// ==========================================
// 6. ROUTER
// ==========================================

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Bedesten (Yargıtay + Danıştay + Yerel + İstinaf)
        if (path === '/search') {
            const q = url.searchParams.get('q') || '';
            if (!q) return jsonResponse({ error: 'q parametresi gerekli' }, 400);
            const courts = (url.searchParams.get('courts') || 'YARGITAYKARARI,DANISTAYKARAR').split(',');
            const page = parseInt(url.searchParams.get('page') || '1');
            return searchBedesten(q, courts, page);
        }

        // UYAP Emsal
        if (path === '/emsal') {
            const q = url.searchParams.get('q') || '';
            if (!q) return jsonResponse({ error: 'q parametresi gerekli' }, 400);
            const page = parseInt(url.searchParams.get('page') || '1');
            const type = url.searchParams.get('type') || undefined;
            return searchEmsal(q, page, type);
        }

        // Anayasa Mahkemesi (Sadece Bireysel Başvuru)
        if (path === '/anayasa') {
            const q = url.searchParams.get('q') || '';
            if (!q) return jsonResponse({ error: 'q parametresi gerekli' }, 400);
            const page = parseInt(url.searchParams.get('page') || '1');
            return searchAnayasa(q, page);
        }

        // Sayıştay
        if (path === '/sayistay') {
            const q = url.searchParams.get('q') || '';
            if (!q) return jsonResponse({ error: 'q parametresi gerekli' }, 400);
            const type = url.searchParams.get('type') || 'genel';
            const page = parseInt(url.searchParams.get('page') || '1');
            return searchSayistay(q, type, page);
        }

        // Document fetch
        if (path.startsWith('/document/')) {
            const id = path.replace('/document/', '');
            const source = url.searchParams.get('source') || 'bedesten';
            return getDocument(id, source);
        }

        // Health check
        if (path === '/health') {
            return jsonResponse({
                status: 'ok',
                timestamp: new Date().toISOString(),
                endpoints: [
                    'GET /search — Bedesten (Yargıtay, Danıştay, Yerel, İstinaf)',
                    'GET /emsal — UYAP Emsal Kararları',
                    'GET /anayasa — Anayasa Mahkemesi (Bireysel Başvuru)',
                    'GET /sayistay — Sayıştay (Genel Kurul, Temyiz, Daire)',
                    'GET /document/:id — Karar Tam Metin',
                ],
                unavailable: [
                    'Anayasa Norm Denetimi — API endpoint değişmiş (404)',
                    'Uyuşmazlık Mahkemesi — API endpoint değişmiş (404)',
                    'KİK — Şifreli',
                    'Rekabet/KVKK/BDDK — 3. parti veya PDF scraping',
                ],
            });
        }

        return jsonResponse({
            error: 'Not found',
            endpoints: '/search, /emsal, /anayasa, /sayistay, /document/:id, /health'
        }, 404);
    },
};

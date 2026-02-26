import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { emsalClient, type SearchResult } from './emsal-client';

export class SearchEngine {

    /**
     * Query Expansion: Doğal dil sorgusunu hukuki terimlere genişletir
     */
    async expandQuery(query: string): Promise<{ terms: string[], explanation: string }> {
        try {
            const { text } = await generateText({
                model: google('gemini-2.0-flash'),
                prompt: `Sen bir Türk hukuku uzmanısın. Kullanıcının arama sorgusunu analiz et ve UYAP emsal karar araması için uygun hukuki terimlere genişlet.

Kullanıcı sorgusu: "${query}"

KURALLAR:
- 3-5 adet en alakalı arama terimi üret (çok fazla terim yapma, API limitine takılmasın)
- Her terim API'de aranacak
- Eş anlamlıları kullan

Sadece virgülle ayrılmış liste ver.
Örnek çıktı: işten çıkarma, ihbar tazminatı, kıdem tazminatı`,
            });

            const terms = text.split(',').map(t => t.trim()).filter(t => t.length > 0);

            if (terms.length === 0) {
                return { terms: [query], explanation: 'Parse hatası' };
            }

            console.log(`📝 Query expansion: ${terms.join(', ')}`);
            return { terms, explanation: 'AI genişletme' };
        } catch (error) {
            console.error('Query expansion failed:', error);
            return { terms: [query], explanation: 'Fallback: orijinal sorgu kullanıldı' };
        }
    }

    /**
     * API-Only Hybrid Search Pipeline
     * 1. AI expands query (Optional, currently enabled)
     * 2. Search via Worker API
     * 3. No local reranking (Worker results are used directly)
     */
    async hybridSearch(query: string, options: { topK?: number, candidateLimit?: number } = {}): Promise<{
        results: SearchResult[],
        expandedTerms: string[],
        explanation: string,
        stats: { candidates: number, fetched: number, returned: number }
    }> {
        const { topK = 20 } = options;

        console.log(`\n🚀 API-Only Smart Search Pipeline: "${query}"`);

        // 1. Query Expansion
        const { terms, explanation } = await this.expandQuery(query);

        // 2. Search Worker API (Parallel)
        const allResults: SearchResult[] = [];
        const seenIds = new Set<string>();

        // Use Promise.allSettled to fetch from Worker for each term
        // Limiting concurrency to avoid overwhelming the Worker
        const searchPromises = terms.slice(0, 5).map(term =>
            emsalClient.searchYargiMCP(term, [], 10)
        );

        const results = await Promise.allSettled(searchPromises);

        for (const res of results) {
            if (res.status === 'fulfilled') {
                for (const item of res.value) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allResults.push({
                            id: item.id,
                            mahkeme: item.mahkeme,
                            daire: item.daire,
                            esasNo: item.esasNo,
                            kararNo: item.kararNo,
                            tarih: item.tarih,
                            metin: item.metin || '',
                            ozet: item.ozet || item.metin || '', // Support snippets from local or remote
                            similarity: item.score || 1,
                            kaynak: item.kaynak || 'Bedesten'
                        });
                    }
                }
            }
        }

        console.log(`✅ API Search Completed. Found ${allResults.length} unique results.`);

        // Sort by score if available, or just return as is
        // Worker API usually returns sorted results per query, but mixing them might need re-sorting
        // Since score is not normalized across queries, we might just trust the order or simple sort
        // For now, let's return them interleaved or just concated.

        // Simple limit
        const finalResults = allResults.slice(0, topK);

        return {
            results: finalResults,
            expandedTerms: terms,
            explanation: explanation,
            stats: {
                candidates: allResults.length,
                fetched: allResults.length,
                returned: finalResults.length
            }
        };
    }

    // Removed local methods: parallelSearch, fetchFullTexts, rerankResults, cosineSimilarity
}

export const searchEngine = new SearchEngine();

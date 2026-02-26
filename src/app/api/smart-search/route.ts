
import { NextRequest, NextResponse } from 'next/server';
import { searchEngine } from '@/lib/search-engine';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json(
            { error: 'Arama terimi gerekli (q parametresi)' },
            { status: 400 }
        );
    }

    try {
        console.log(`\n🧠 API Smart Search: "${query}"`);

        const { results, expandedTerms, explanation, stats } = await searchEngine.hybridSearch(query, {
            topK: 20,
            candidateLimit: 100
        });

        return NextResponse.json({
            results,
            total: results.length,
            page: 1,
            meta: {
                expandedTerms,
                explanation,
                stats
            }
        });
    } catch (error) {
        console.error('Hybrid search error:', error);
        return NextResponse.json(
            { error: 'Arama yapılırken hata oluştu' },
            { status: 500 }
        );
    }
}

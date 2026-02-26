
import { NextRequest, NextResponse } from 'next/server';
import { emsalClient } from '@/lib/emsal-client';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const baslangicTarihi = searchParams.get('baslangicTarihi') || undefined;
    const bitisTarihi = searchParams.get('bitisTarihi') || undefined;
    const durum = searchParams.get('durum') || undefined;
    const court = searchParams.get('court') || undefined;

    if (!query) {
        return NextResponse.json(
            { error: 'Arama terimi gerekli (q parametresi)' },
            { status: 400 }
        );
    }

    try {
        console.log(`\n🔎 API Hybrid Search: "${query}" (Page: ${page}, Court: ${court || 'All'})`);

        // Use the combined Local + Bedesten engine
        const resultsArray = await emsalClient.hybridSearchKararlar(query, 10, court, page);

        return NextResponse.json({
            results: resultsArray,
            total: resultsArray.length === 10 ? page * 10 + 100 : resultsArray.length,
            page: page
        });
    } catch (error) {
        console.error('Simple search error:', error);
        return NextResponse.json(
            { error: 'Arama yapılırken hata oluştu' },
            { status: 500 }
        );
    }
}

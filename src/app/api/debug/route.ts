import { NextRequest, NextResponse } from 'next/server';

// Debug: UYAP arama test
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || 'iş kazası';
    const id = searchParams.get('id');

    const baseUrl = 'https://emsal.uyap.gov.tr';

    try {
        // 1. Session al
        console.log('1. Getting session...');
        const homeResponse = await fetch(baseUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            },
        });

        const cookies = homeResponse.headers.get('set-cookie');
        let sessionId = '';
        if (cookies) {
            const match = cookies.match(/JSESSIONID=([^;]+)/);
            if (match) sessionId = match[1];
        }
        console.log('Session:', sessionId);

        // Eğer ID verilmişse sadece karar çek
        if (id) {
            const docResponse = await fetch(`${baseUrl}/getDokuman?id=${id}`, {
                method: 'GET',
                headers: {
                    'Cookie': `JSESSIONID=${sessionId}`,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                },
            });
            const docData = await docResponse.json();
            return NextResponse.json({ sessionId, document: docData });
        }

        // 2. Arama yap
        console.log('2. Searching for:', query);
        const headers = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Cookie': `JSESSIONID=${sessionId}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Origin': 'https://emsal.uyap.gov.tr',
            'Referer': 'https://emsal.uyap.gov.tr/',
            'X-Requested-With': 'XMLHttpRequest',
        };

        const aramaBody = {
            data: {
                aranan: query,
                arananKelime: query,
            }
        };
        console.log('Arama body:', JSON.stringify(aramaBody));

        const aramaResponse = await fetch(`${baseUrl}/arama`, {
            method: 'POST',
            headers,
            body: JSON.stringify(aramaBody),
        });
        const aramaResult = await aramaResponse.text();
        console.log('Arama response:', aramaResult.substring(0, 500));

        // 3. Sonuç listesi
        const listBody = {
            data: {
                aranan: query,
                arananKelime: query,
                pageSize: 10,
                pageNumber: 1,
            }
        };

        const listResponse = await fetch(`${baseUrl}/aramalist`, {
            method: 'POST',
            headers,
            body: JSON.stringify(listBody),
        });
        const listResult = await listResponse.text();
        console.log('List response:', listResult.substring(0, 1000));

        return NextResponse.json({
            sessionId,
            aramaResponse: aramaResult.substring(0, 1000),
            listResponse: listResult.substring(0, 2000),
        });
    } catch (error) {
        console.error('Debug error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

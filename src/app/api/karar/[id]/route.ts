import { NextRequest, NextResponse } from 'next/server';
import { emsalClient } from '@/lib/emsal-client';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const source = request.nextUrl.searchParams.get('source') || undefined;

    if (!id) {
        return NextResponse.json(
            { error: 'Karar ID gerekli' },
            { status: 400 }
        );
    }

    try {
        const karar = await emsalClient.getKarar(id, source);
        return NextResponse.json(karar);
    } catch (error) {
        console.error('Karar çekme hatası:', error);
        return NextResponse.json(
            { error: 'Karar alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

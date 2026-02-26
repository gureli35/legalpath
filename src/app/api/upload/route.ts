import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime (required for pdf-parse)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Dosya yüklenmedi' }, { status: 400 });
        }

        console.log(`📄 Upload: ${file.name}, type: ${file.type}, size: ${file.size}`);

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            try {
                // pdf-parse v1.x: simple default export function
                const pdfParse = (await import('pdf-parse')).default;
                const result = await pdfParse(buffer);
                text = result.text || '';

                if (!text.trim()) {
                    return NextResponse.json(
                        { error: 'PDF dosyasından metin çıkarılamadı. Taranmış (resim) PDF olabilir.' },
                        { status: 400 }
                    );
                }
                console.log(`✅ PDF parsed: ${text.length} chars, ${result.numpages} pages`);
            } catch (pdfError: any) {
                console.error('PDF parse error:', pdfError);
                return NextResponse.json(
                    { error: `PDF okunamadı: ${pdfError.message}` },
                    { status: 500 }
                );
            }
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
            text = buffer.toString('utf-8');
        } else {
            return NextResponse.json(
                { error: 'Desteklenmeyen dosya formatı. Lütfen PDF veya TXT yükleyin.' },
                { status: 400 }
            );
        }

        // Metni temizle ve kısalt (token limitini aşmamak için)
        const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, 10000);

        return NextResponse.json({
            text: cleanText,
            fileName: file.name,
            originalLength: text.length
        });
    } catch (error: any) {
        console.error('Dosya okuma hatası:', error);
        return NextResponse.json(
            { error: `Dosya okunurken hata: ${error.message}` },
            { status: 500 }
        );
    }
}

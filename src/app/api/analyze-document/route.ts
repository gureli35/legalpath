import { NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'Dosya yüklenmedi' }), { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (file.type === 'application/pdf') {
            // @ts-ignore
            const pdf = (await import('pdf-parse')).default;
            const data = await pdf(buffer);
            text = data.text;
        } else if (
            file.type === 'text/plain' ||
            file.name.endsWith('.txt') ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.doc') ||
            file.name.endsWith('.rtf')
        ) {
            text = buffer.toString('utf-8');
        } else {
            return new Response(
                JSON.stringify({ error: 'Desteklenmeyen dosya formatı. Lütfen PDF, TXT veya Markdown yükleyin.' }),
                { status: 400 }
            );
        }

        // Limit text for API (30k chars ~ 10k tokens)
        const documentText = text.replace(/\s+/g, ' ').trim().slice(0, 30000);

        console.log(`📄 Analyzing document: ${file.name} (${documentText.length} chars)`);

        const result = streamText({
            model: google('gemini-2.0-flash'),
            system: `Sen uzman bir Türk Hukuku belge analiz uzmanısın. Belgeleri analiz ederken:
- Profesyonel ve detaylı bir analiz yap
- İlgili mevzuat maddelerini belirt (kanun numarası ve madde numarası ile)
- Riskli maddeleri açıkça işaretle
- Somut ve uygulanabilir öneriler sun
- Markdown formatını kullan (## başlıklar, ** kalın **, * liste)`,
            messages: [{
                role: 'user',
                content: `Aşağıdaki hukuki belgeyi kapsamlı şekilde analiz et.

DOSYA ADI: ${file.name}
BELGE İÇERİĞİ:
---
${documentText}
---

ANALİZ FORMATI (Bu formatı kesinlikle takip et):

## 📋 BELGE ÖZETİ
(Belgenin türü, konusu, tarafları ve temel bilgileri)

## 📊 BELGE YAPISI DEĞERLENDİRMESİ  
(Format uygunluğu, eksik bölümler, yapısal sorunlar)

## ⚠️ RİSKLİ MADDELER VE EKSİKLİKLER
(Her riski ayrı madde olarak ele al, önem derecesini belirt)

## 📜 İLGİLİ MEVZUAT
(Her kanun maddesini numarası ile birlikte yaz)

## ✅ İYİLEŞTİRME ÖNERİLERİ
(Somut ve uygulanabilir öneriler, madde madde)

## 🔍 GENEL DEĞERLENDİRME
(Belgenin genel kalitesi ve hukuki yeterliliği hakkında özet değerlendirme)
`
            }],
        });

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.textStream) {
                        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
                    }
                    controller.close();
                } catch (e: any) {
                    console.error('Stream error:', e);
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(`⚠️ Hata: ${e.message}`)}\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Vercel-AI-Data-Stream': 'v1',
            }
        });

    } catch (error: any) {
        console.error('Belge analizi hatası:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

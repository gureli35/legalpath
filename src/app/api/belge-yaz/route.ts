import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { emsalClient } from '@/lib/emsal-client';

export const maxDuration = 60;

const DOCUMENT_TEMPLATES: Record<string, { label: string; prompt: string }> = {
    dilekce: {
        label: 'Dilekçe',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir Türk Hukuku dilekçesi yaz.

FORMAT KURALLARI:
- Resmi dilekçe formatını kullan (Mahkeme/Kurum adı, tarih, esas bilgileri)
- "DAVACI:", "DAVALI:", "KONU:", "AÇIKLAMALAR:", "HUKUKİ SEBEPLER:", "SONUÇ VE İSTEM:" bölümleri olmalı
- Her bölümü ## ile başlat
- Maddelerle numaralandır
- Emsal karar ve mevzuat referansları ekle`
    },
    ihtarname: {
        label: 'İhtarname',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir ihtarname yaz.

FORMAT KURALLARI:
- Resmi ihtarname formatını kullan
- "İHTAR EDEN:", "MUHATAP:", "KONU:", "İHTARIN İÇERİĞİ:", "SONUÇ:" bölümleri
- Yasal dayanakları belirt
- Süre ve yaptırımları netleştir`
    },
    sozlesme: {
        label: 'Sözleşme',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir sözleşme taslağı yaz.

FORMAT KURALLARI:
- "TARAFLAR:", "SÖZLEŞMENİN KONUSU:", "TARAFLARIN YÜKÜMLÜLÜKLERİ:", "SÜRE:", "FESİH:", "UYUŞMAZLIK ÇÖZÜMÜ:" bölümleri
- Her maddeyi numaralandır
- Boşluk bırakılacak yerleri [___] ile belirt`
    },
    vekaletname: {
        label: 'Vekaletname',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir vekaletname yaz.

FORMAT KURALLARI:
- Resmi vekaletname formatı
- Yetki kapsamını detaylı belirt
- Noter onayına uygun format`
    },
    mektup: {
        label: 'Hukuki Mektup',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir hukuki mektup/yazı yaz.

FORMAT KURALLARI:
- Resmi yazışma formatı
- Konu ve referans numarası
- Profesyonel ve net dil`
    },
    savunma: {
        label: 'Savunma Dilekçesi',
        prompt: `Aşağıdaki bilgilere göre profesyonel bir savunma/cevap dilekçesi yaz.

FORMAT KURALLARI:
- "DAVALI:", "DAVACI:", "KONU:", "CEVAP VE SAVUNMALAR:", "DELİLLER:", "HUKUKİ SEBEPLER:", "SONUÇ VE İSTEM:" bölümleri
- Karşı argümanları madde madde ele al
- Emsal kararlara referans ver`
    },
};

export async function POST(req: Request) {
    try {
        const { documentType, description, details } = await req.json();

        const template = DOCUMENT_TEMPLATES[documentType];
        if (!template) {
            return new Response(JSON.stringify({ error: 'Geçersiz belge tipi' }), { status: 400 });
        }

        // 1. Anahtar kelime çıkarımı (chatbot ile aynı yöntem)
        const fullInput = `${description} ${details || ''}`.trim();
        let keywords = fullInput;
        try {
            const { text } = await generateText({
                model: google('gemini-flash-latest'),
                prompt: `Kullanıcının belge talebinden UYAP Mevzuat arama motorunda aratmak için EN ÖNEMLİ 2-4 hukuki anahtar kelimeyi çıkar.

Kurallar:
- Ekleri at (yalın hal).
- Hukuki terminolojiye çevir (Örn: "kovulma" -> "fesih", "nafaka alamıyorum" -> "nafaka").
- Sadece kelimeleri yaz, aralarında boşluk bırak.

Belge türü: ${template.label}
Kullanıcı açıklaması: ${fullInput}
Anahtar Kelimeler:`,
                maxRetries: 0
            });
            keywords = text.trim();
            console.log('Belge yazım - Keywords:', keywords);
        } catch (e: any) {
            console.warn('Belge yazım - Keyword extraction skipped:', e.message);
        }

        // 2. Mevzuat Arama (Yerel SQLite DB - chatbot ile aynı)
        let mevzuatContext = "";
        try {
            const mevzuatKeys = keywords.replace(/[#&(){}\[\]]/g, ' ');
            const mevzuatResults = await emsalClient.searchMevzuat(mevzuatKeys, 0.1, 8);
            if (mevzuatResults.length > 0) {
                mevzuatContext = mevzuatResults
                    .map(r => `📜 ${r.kanun_adi} Md.${r.madde_no}: ${r.icerik?.substring(0, 600)}`)
                    .join('\n\n');
                console.log(`Belge yazım - Mevzuat: ${mevzuatResults.length} sonuç bulundu`);
            }
        } catch (e) {
            console.error("Belge yazım - Mevzuat search error:", e);
        }

        // 3. Sistem promptu (mevzuat context dahil)
        const systemPrompt = `Sen uzman bir Türk Hukuku belge yazarısın. ${template.prompt}

EK KURALLAR:
- Türk Hukuku terminolojisini doğru kullan
- Aşağıda VERİTABANINDAN getirilen güncel mevzuat maddeleri var. Belgede bu maddelere doğrudan atıf yap.
- Mevzuat maddelerini belgede "HUKUKİ SEBEPLER" veya "YASAL DAYANAK" bölümünde ayrıntılı olarak belirt.
- İlgili kanun adını ve madde numarasını tam olarak yaz (Örn: 4857 sayılı İş Kanunu Madde 17).
- Profesyonel ve resmi dil kullan
- Kişisel bilgi gerektiren yerlerde [___] placeholder kullan
- Belge sonuna tarih ve imza alanı ekle
- SADECE belge türüne ve somut olaya doğrudan uygulanabilir mevzuat maddelerini kullan. Tarihsel istisnalara (geçici maddeler, süresi dolmuş düzenlemeler), dava konusuyla ilgisiz kanunlara veya genel geçer olmayan dönemsel istisnaların bertaraf açıklamalarına yer verme.

${mevzuatContext ? `=== VERİTABANINDAN GETİRİLEN İLGİLİ MEVZUAT MADDELERİ ===
${mevzuatContext}
=== MEVZUAT SONU ===

Yukarıdaki mevzuat maddelerinden YALNIZCA somut olaya doğrudan uygulanabilir olanları kullan ve referans göster. İlgisiz veya tarihsel nitelikteki maddeleri yoksay.` : ''}

UYARI: Bu belge taslak niteliğindedir. Kullanıcıya "bir avukata danışılmasını" hatırlat.`;

        const userPrompt = `Belge türü: ${template.label}

Kullanıcı açıklaması: ${description}

${details ? `Ek detaylar:\n${details}` : ''}

Lütfen yukarıdaki bilgilere göre eksiksiz ve profesyonel bir ${template.label.toLowerCase()} oluştur. Veritabanından getirilen mevzuat maddelerini HUKUKİ SEBEPLER bölümünde mutlaka referans göster.`;

        const result = streamText({
            model: google('gemini-flash-latest'),
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
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

    } catch (err: any) {
        console.error('Belge yazım hatası:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

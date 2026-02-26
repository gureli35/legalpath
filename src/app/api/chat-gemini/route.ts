import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import { emsalClient } from '@/lib/emsal-client';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const userQuery = messages[messages.length - 1].content;

        console.log('--- GOOGLE GEMINI FLASH (DIRECT) ---');

        // 1. Anahtar Kelime Çıkarımı (LLM ile)
        // Kullanıcı "keywordle arasın" dediği için raw query yerine LLM ile keyword extract ediyoruz.
        let keywords = userQuery;
        try {
            const { text } = await generateText({
                model: google('gemini-flash-latest'),
                prompt: `Kullanıcının sorusundan UYAP Mevzuat ve Emsal arama motorlarında aratmak için EN ÖNEMLİ 1-3 kelimeyi çıkar. 
                
                Kurallar:
                - Ekleri at (yalın hal).
                - Hukuki terminolojiye çevir (Örn: "kovulma" -> "fesih", "nafaka alamıyorum" -> "nafaka ödenmemesi").
                - Sadece kelimeleri yaz, aralarında boşluk bırak.
                
                Soru: ${userQuery}
                Anahtar Kelimeler:`,
                maxRetries: 0
            });
            keywords = text.trim();
            console.log('Keywords (Extracted):', keywords);
        } catch (e: any) {
            console.warn('Keyword extraction skipped:', e.message);
        }

        // 2. Mevzuat Arama (Tekrar Aktif)
        let mevzuatContext = "";
        try {
            // clean keywords
            const mevzuatKeys = keywords.replace(/[#&(){}\[\]]/g, ' ');
            const mevzuatResults = await emsalClient.searchMevzuat(mevzuatKeys, 0.1, 5);
            if (mevzuatResults.length > 0) {
                mevzuatContext = mevzuatResults.map(r => `📜 ${r.kanun_adi} Md.${r.madde_no}: ${r.icerik?.substring(0, 500)}`).join('\n\n');
            }
        } catch (e) {
            console.error("Mevzuat search error:", e);
        }

        // 3. Hibrit Emsal Karar Arama (Yerel 700k + Yargı-MCP Remote)
        // 5 adet yerel DB + 5 adet uzaktan = 10 karar
        let kararContext = "";
        try {
            console.log('🔍 Hybrid searching for:', keywords);
            // AI Asistanı için API + Local FTS (Hibrit) Arama
            const hybridResults = await emsalClient.hybridSearchForAI(keywords, 10); // 10 karar (API + Local)

            if (hybridResults.length > 0) {
                kararContext = hybridResults.map((r, i) => {
                    const source = (r.kaynak || 'Bedesten').toLowerCase() === 'yerel' ? 'emsal' : 'bedesten';
                    const preview = r.metin ? r.metin.substring(0, 1500).replace(/\s+/g, ' ') : "Metin bulunamadı.";
                    return `⚖️ KARAR ${i + 1} [ID:${r.id}|SOURCE:${source}] - ${r.mahkeme} ${r.esasNo} E., ${r.kararNo} K.\nBu karara referans verirken şu formatı kullan: [KARAR:${r.id}:${source}:${r.esasNo} E., ${r.kararNo} K.]\nİçerik: ${preview}...`;
                }).join('\n\n---\n\n');
                console.log(`✅ Hybrid results integrated: ${hybridResults.length} kararlar.`);
            } else {
                console.log('⚠️ Hybrid Search returned no results.');
            }
        } catch (e) {
            console.error("Hybrid search error in route:", e);
        }

        // 3. Final Stream
        const systemPrompt = `Sen uzman bir Türk Hukuku Asistanısın. 

⚠️ KRİTİK FORMAT TALİMATLARI:
1. Başlıklar için mutlaka "##" kullan (Örn: ## 1. Hukuki Terimler).
2. Listeler için mutlaka "*" kullan (Örn: * Madde 1).
3. Önemli terimleri "**" ile kalınlaştır (Örn: **Kıdem Tazminatı**).
4. Paragraflar ve maddeler arasında MUTLAKA bir satır boşluk bırak. Okunabilirlik çok önemli.
5. Asla blok metin yazma, her şeyi maddeler halinde veya kısa paragraflar halinde sun.
6. EMSAL KARARLARA REFERANS VERİRKEN: Veritabanında verilen [KARAR:ID:SOURCE:LABEL] formatını AYNEN kullan. Örnek: [KARAR:362000900:bedesten:2016/13288 E., 2017/6136 K.] — Bu format, kullanıcının karara tıklayarak tam metnini okumasını sağlar. Her karar referansında bu formatı kullanman zorunludur.

CEVAP FORMATI (ZORUNLU):

## 1. 📖 HUKUKİ TERİMLER VE ANLAMLARI
(Terimleri madde işaretleri * ile listele ve açıklamalarını yaz)

## 2. 📜 İLGİLİ MEVZUAT ANALİZİ  
(Kanun maddelerini listele, her maddeyi ayrı satırda yaz)

## 3. ⚖️ EMSAL KARAR DEĞERLENDİRMESİ 
(En az 3 karar. Her kararı ayrı başlık veya madde olarak yaz. Karar referanslarında [KARAR:ID:SOURCE:LABEL] formatını kullan.)
* **Karar:** [KARAR:ID:SOURCE:EsasNo E., KararNo K.] — Açıklama...
* **Alıntı:** "Karar metninden doğrudan alıntı..."

## 4. 🗺️ YOL HARİTASI
(Adım adım yapılacakları numaralı veya işaretli liste olarak yaz)

## 5. 💡 RİSK ANALİZİ VE HUKUKİ YORUM
(Olası riskleri net maddelerle açıkla)

## 6. 📝 DİLEKÇE TASLAĞI
(Dilekçeyi net bir blok olarak aşağıya ekle)

--- DİLEKÇE BAŞLANGIÇ ---
[Dilekçe İçeriği Buraya]
--- DİLEKÇE BİTİŞ ---

## 7. 💡 İLGİLİ SORULAR
1. ...
2. ...
3. ...

VERİTABANI:
${mevzuatContext ? `=== MEVZUAT ===\n${mevzuatContext}` : ""}
${kararContext ? `=== KARARLAR ===\n${kararContext}` : ""}
`;

        const result = streamText({
            model: google('gemini-flash-latest'), // Hız için Flash modeli (Stable Alias - Paid Tier)
            system: systemPrompt,
            messages,
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
                    const errorMsg = `⚠️ Akış hatası: ${e.message}`;
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(errorMsg)}\n`));
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
        console.error('GOOGLE GEMINI ERROR:', err);
        return new Response(`0:${JSON.stringify(`⚠️ Hata: ${err.message}`)}\n`, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Vercel-AI-Data-Stream': 'v1' }
        });
    }
}

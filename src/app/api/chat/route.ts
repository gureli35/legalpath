import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import { emsalClient } from '@/lib/emsal-client';
import { ollamaClient } from '@/lib/ollama-client';

export const maxDuration = 120;

export async function POST(req: Request) {
    const { messages } = await req.json();
    const userQuery = messages[messages.length - 1].content;

    console.log('--- ⚖️ INTEL-LEGAL SEQUENTIAL WORKFLOW START ---');

    // 1. Proactive Ollama Check & Auto-Start 
    // This triggers ensureOllamaRunning which has a 15s health-check wait loop.
    try {
        const { generateEmbedding } = await import('@/lib/embeddings');
        await generateEmbedding("health check");
    } catch (e) {
        console.warn('Initial Ollama check attempt failed (likely starting up)');
    }

    // 2. Query Translation & Keyword Extraction
    let legalSearchQuery = userQuery;
    const translatePrompt = "Sen bir hukuk çevirmenisin. Sadece hukuki terimleri söyle.\n\nKullanıcı: işten kovdular\nAsistan: iş mahkemesi iş akdinin feshi kıdem ihbar tazminatı\n\nKullanıcı: kocam dövdü\nAsistan: aile mahkemesi boşanma davası darp uzaklaştırma\n\nÖNEMLİ: Eğer konu bir suç/ceza ise mutlaka hem suçun adını hem de 'usul' (CMK) terimlerini ekle. Sadece terimleri yaz.";

    try {
        const keywords = await ollamaClient.chat([
            { role: 'system', content: translatePrompt },
            { role: 'user', content: `Kullanıcı: ${userQuery}\nAsistan:` }
        ]).catch(async () => {
            console.warn('Ollama offline for translation, using Gemini fallback...');
            const { text } = await generateText({
                model: google('gemini-2.0-flash'),
                prompt: `${translatePrompt}\n\nKullanıcı: ${userQuery}\nAsistan:`,
            });
            return text;
        });
        if (keywords) legalSearchQuery = keywords.replace(/["\n]/g, '').trim();
        console.log(`⚖️ Translated Legal Query: "${legalSearchQuery}"`);
    } catch (err) {
        console.error('Query translation failure:', err);
    }

    // --- SEQUENTIAL RESEARCH STEPS ---
    let dictionaryContext = "";
    let mevzuatContext = "";
    let kararContext = "";

    // A. Hukuk Sözlüğü (Terms explaining)
    try {
        console.log('📖 Step 1: Legal Dictionary...');
        const dictionaryResults = await emsalClient.searchHukukSozlugu(legalSearchQuery);
        if (dictionaryResults.length > 0) {
            dictionaryContext = dictionaryResults.map(r => `📚 ${r.terim}: ${r.anlam}`).join('\n\n');
        }
    } catch (e) {
        console.error('Dictionary step failed:', e);
    }

    // B. Mevzuat (Legislation)
    try {
        console.log('📜 Step 2: Legislation...');
        const mevzuatResults = await emsalClient.searchMevzuat(legalSearchQuery);
        if (mevzuatResults.length > 0) {
            mevzuatContext = mevzuatResults.slice(0, 5).map(r =>
                `📜 ${r.kanun_adi} Md. ${r.madde_no}: ${r.icerik?.substring(0, 1000)}`
            ).join('\n\n');
        }
    } catch (e) {
        console.error('Legislation step failed:', e);
    }

    // C. Emsal Kararlar (Precedents)
    try {
        console.log('⚖️ Step 3: Precedents...');
        // Request 10 results to get full 5 local + 5 remote mix
        const hybridResults = await emsalClient.hybridSearchKararlar(legalSearchQuery, 10);
        if (hybridResults.length > 0) {
            // Provide up to 8 decisions to Gemini to ensure diversity without overloading context
            kararContext = hybridResults.slice(0, 8).map(r => {
                const preview = r.metin ? r.metin.substring(0, 1500) : (r.ozet || "İçerik yok");
                return `⚖️ [${r.kaynak}] ${r.mahkeme} - ${r.esasNo}/${r.kararNo}\nİçerik/Özet: ${preview}`;
            }).join('\n\n---\n\n');
        }
    } catch (e) {
        console.error('Precedents step failed:', e);
    }

    if (!dictionaryContext && !mevzuatContext && !kararContext) {
        return new Response(`0:${JSON.stringify("Maalesef aradığınız konuda veritabanlarımızda yeterli veri bulunamadı.")}\n`, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Vercel-AI-Data-Stream': 'v1' }
        });
    }

    // D. Final Synthesis & Prompt Engineering
    const systemPrompt = `Sen uzman bir Türk Hukuku Asistanısın. 

⚠️ KRİTİK TALİMAT: Aşağıdaki formatı MUTLAKA ve KESİNLİKLE takip edeceksin. Bu format zorunludur, atlamak veya değiştirmek YASAKTIR.

CEVAP FORMATI (ZORUNLU - HER BÖLÜM BAŞLIĞI AYNEN YAZILACAK):

## 1. 📖 HUKUKİ TERİMLER VE ANLAMLARI
(Sözlük verilerinden alıntı yaparak terimleri açıkla)

## 2. 📜 İLGİLİ MEVZUAT ANALİZİ  
(Kanun maddelerini ve uygulamalarını yaz - her maddeyi ayrı ayrı analiz et)

## 3. ⚖️ EMSAL KARAR DEĞERLENDİRMESİ
(Yargıtay/Danıştay kararlarını analiz et - dosya numaralarını belirt)

## 4. 🗺️ YOL HARİTASI (ADIM ADIM NE YAPILMALI)
(1. Adım, 2. Adım formatında somut eylemler yaz)

## 5. 💡 RİSK ANALİZİ VE HUKUKİ YORUM
(Olası sonuçları ve riskleri değerlendir)

## 6. 📝 DİLEKÇE TASLAĞI
Bu bölümü HER ZAMAN ekle. Aşağıdaki formatı kullan:

--- DİLEKÇE BAŞLANGIÇ ---
[İLGİLİ MAHKEME ADI] MAHKEMESİ SAYIN HAKİMLİĞİ'NE

DAVACI    : [İsim yazılacak yer]
VEKİLİ    : [Avukat bilgisi]
DAVALI    : [Karşı taraf]
KONU      : [Davanın konusu]

AÇIKLAMALAR:
1. [Olay özeti]
2. [Hukuki gerekçe]
3. [Deliller]

HUKUKİ NEDENLER: [İlgili kanun maddeleri]
DELİLLER        : [Tanık, belge, bilirkişi vb.]

SONUÇ VE İSTEM  : [Net talep]
--- DİLEKÇE BİTİŞ ---

VERİLER (BUNLARI KULLAN):
${dictionaryContext ? `=== SÖZLÜK ===\n${dictionaryContext}` : ""}
${mevzuatContext ? `=== MEVZUAT ===\n${mevzuatContext}` : ""}
${kararContext ? `=== EMSAL KARARLAR ===\n${kararContext}` : ""}
`;

    try {
        console.log(`🚀 Final Synthesis (Roadmap) Output Starting...`);
        // Use streamText for better streaming support with Vercel AI SDK
        const result = await streamText({
            model: google('gemini-2.0-flash'), // Using Gemini for synthesis as it's superior in logic/sequencing
            system: systemPrompt,
            messages,
        });
        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error('Fatal API Error:', error);
        return new Response(`0:${JSON.stringify(`⚠️ Hata: ${error.message}`)}\n`, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Vercel-AI-Data-Stream': 'v1' } });
    }
}

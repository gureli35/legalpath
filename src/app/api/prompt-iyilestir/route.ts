import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { description, details, documentType } = await req.json();

        if (!description) {
            return new Response(JSON.stringify({ error: 'Açıklama boş olamaz' }), { status: 400 });
        }

        const systemPrompt = `Sen uzman bir analist ve metin düzenleyicisin. Görevin, asistanı kullanan AVUKATIN, müvekkilinin durumunu anlattığı dağınık, eksik veya karmaşık olay anlatımını toparlayıp; yapay zekanın dilekçe/belge yazarken (başka bir model) girdi olarak kullanacağı en açık, net ve yapılandırılmış "olay özeti / bilgi formu" halini (Prompt/İstem) yazmaktır.

Hedef Belge Türü İpucu: ${documentType || 'Belirsiz'}

KESİNLİKLE YAPILMAMASI GEREKENLER:
- KESİNLİKLE dilekçe, ihtarname, sözleşme veya hukuki evrak YAZMA.
- "Davacı:", "Davalı:", "Gereği düşünüldü", "Arz ederim" gibi mahkeme/resmi evrak şablonları KULLANMA.
- KESİNLİKLE başlık, alt başlık veya madde imleri (1, 2, 3 veya -, *, vb.) KULLANMA. Çıktı tamamen DÜZ METİN ve birbiri ardına akan paragraflardan oluşmalıdır.
- Hukuki dayanak, kanun maddesi, mevzuat bilgisi, emsal karar veya hukuki YOL GÖSTERME (mütalaa/tavsiye) KESİNLİKLE EKLEME. Sen bir avukat değilsin, sadece bir özetleyicisin.
- "Ben", "Benim", "Bana" gibi BİRİNCİ TEKİL ŞAHIS dili KULLANMA. (Çünkü bu sistemi avukatlar kullanıyor, olaylar müvekkillerinin başına geliyor).

YAPILMASI GEREKENLER:
1. Olayı kronolojik ve mantıksal bir sıraya koyarak, belge yazacak yapay zekanın işini kolaylaştıracak net bir olay özeti çıkar.
2. Dağınık bilgileri toparla, gereksiz duygu ve sitemleri çıkar, sadece somut olay örgüsünü netleştir.
3. Eksik olabilecek (tarihler, miktarlar, tam kişi/kurum adları) yerleri tespit et ve [___] şeklinde boşluklar bırak.
4. Anlatımı NESNEL, ÜÇÜNCÜ ŞAHIS (O/Onlar) veya "Müvekkil" kelimesini kullanarak, düzgün ve profesyonel bir Türkçe ile yeniden yaz. Düz paragraf şeklinde akıcı bir dil kullan.
5. Çıktı SADECE iyileştirilmiş olay özetinden ibaret olmalıdır (Giriş cümlesi, selamlaşma veya ekstra açıklama ekleme).`;

        const userPrompt = `Orijinal Açıklama:
${description}

${details ? `Ek Detaylar:\n${details}` : ''}`;

        const result = await generateText({
            model: google('gemini-flash-latest'),
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        return new Response(JSON.stringify({ enhancedText: result.text.trim() }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('Prompt iyileştirme hatası:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

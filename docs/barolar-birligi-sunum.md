# 🏛️ LegalPath — Yapay Zeka Destekli Hukuk Platformu
## Türkiye Barolar Birliği Yapay Zeka Çalıştayı Sunumu
### Furkan Güreli — 10 Dakika

---

## 🎯 SUNUM AKIŞI (10 dakika)

| Dakika | Konu | Süre |
|--------|------|------|
| 0-1 | Açılış + Problem Tanımı | 1 dk |
| 1-3 | LegalPath Nedir? (5 Modül) | 2 dk |
| 3-5 | **CANLI DEMO** — AI Asistan | 2 dk |
| 5-7 | Teknik Mimari (Basit Şema) | 2 dk |
| 7-8 | Maliyet & İş Modeli | 1 dk |
| 8-9 | Etik & Güvenlik | 1 dk |
| 9-10 | Kapanış + Soru-Cevap Çağrısı | 1 dk |

---

## SLAYT 1 — AÇILIŞ (1 dk)

### "Türk Avukatının Araştırma Sorunu"

**Günümüzde bir avukat, tek bir dava için:**
- UYAP Emsal'de ortalama **45-60 dakika** karar taraması yapıyor
- Mevzuat.gov.tr'de ilgili kanun maddelerini **elle arıyor**
- Bulunan kararları Word'e **manuel kopyalıyor**
- Dilekçeyi **sıfırdan yazıyor**

> 💡 "Peki ya bir sistem, avukatın doğal dilde sorduğu soruyu anlayıp, ilgili kanun maddelerini, emsal kararları ve dilekçe taslağını **saniyeler içinde** oluşturabilseydi?"

**Bu LegalPath.**

---

## SLAYT 2 — LegalPath NEDİR? (2 dk)

### 5 Entegre Modül, Tek Platform

```
┌─────────────────────────────────────────────────┐
│                  L E G A L P A T H               │
├──────────┬──────────┬──────────┬────────┬───────┤
│ 🔍 Akıllı │ 🤖 AI    │ 📝 Belge  │ 📄 Belge│ 📁 Dava│
│   Arama   │ Asistan  │  Yazım   │ Analiz │ Yön. │
├──────────┴──────────┴──────────┴────────┴───────┤
│        Hibrit Arama Motoru (FTS + Vektör)        │
│    776K Yerel Karar + 10M+ Bedesten Cloud API    │
│         Mevzuat DB (TCK, TMK, HMK, İK...)        │
└─────────────────────────────────────────────────┘
```

**1. 🔍 Emsal Karar Arama (Semantik)**
- 776.000+ yerel SQLite karar + 10 milyon+ Bedesten Cloud API
- Gelişmiş filtreler: Tarih aralığı, hukuk dalı, daire, mahkeme türü
- Yargıtay, Danıştay, BAM/BİM, Yerel Mahkeme ayrımı

**2. 🤖 AI Hukuk Asistanı**
- Avukat doğal dilde sorusunu sorar: *"İşçim 5 yıldır çalışıyor, haklı nedenle feshedebilir miyim?"*
- Sistem otomatik olarak: Mevzuat maddelerini bulur → Emsal kararları getirir → Hukuki analiz yapar → Dilekçe taslağı oluşturur
- Tıklanabilir karar referansları (tam metin açılır)

**3. 📝 Akıllı Belge Yazım**
- 6 belge türü: Dilekçe, savunma, ihtarname, sözleşme, vekaletname, hukuki yazı
- Mevzuat veritabanıyla entegre: AI ilgili kanun maddelerini otomatik referans verir
- **DOCX dışa aktarma** (Word formatında indirme)

**4. 📄 Belge Analizi**
- PDF/TXT yükleme → AI riskli maddeleri tespit eder
- Sözleşme inceleme, dilekçe değerlendirme
- İyileştirme önerileri

**5. 📁 Dava/Dosya Yönetimi**
- Dava dosyası oluşturma, karar/belge/not ekleme
- Durum takibi (aktif, beklemede, tamamlandı, arşiv)
- Tüm modüllerle entegre (aramadan karara dosya ekleme)

---

## SLAYT 3 — CANLI DEMO (2 dk)

### 🎬 Demo Senaryosu

**localhost:3001 üzerinden canlı gösterim:**

> **Demo 1 (45 sn):** AI Asistan'a sorun:
> *"İşverenimden 5 yıldır maaşımı geç alıyorum, haklı nedenle fesih yapabilir miyim?"*
> - Sistemin gerçek zamanlı mevzuat maddeleri bulduğunu gösterin (İş Kanunu Md. 24/II)
> - Emsal kararların geldiğini gösterin (Yargıtay 9. HD kararları)
> - Tıklanabilir karar referanslarını gösterin
> - Dilekçe taslağının oluştuğunu gösterin

> **Demo 2 (30 sn):** Belge Yazım'a geçin:
> - "Dilekçe" seçin → durumu yazın → DOCX İndir butonunu gösterin

> **Demo 3 (30 sn):** Emsal Arama'da filtrelerini gösterin:
> - "kıdem tazminatı haksız fesih" arayın
> - Gelişmiş filtre: Yargıtay + 2020-2025 tarih aralığı

> **Demo 4 (15 sn):** Dava Yönetimi'nden bir dosya açın

---

## SLAYT 4 — TEKNİK MİMARİ (2 dk)

### Sistem Nasıl Çalışıyor?

```
  AVUKAT
    │
    ▼
┌──────────────────┐
│  Next.js 16 UI   │  ← React, Tailwind, Turbopack
│  (Frontend)      │
└────────┬─────────┘
         │
    ▼ API Routes ▼
         │
┌────────┴─────────────────────────────┐
│           ARAMA MOTORU               │
│                                      │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ Yerel SQLite │  │ Cloudflare    │ │
│  │ 776K Karar   │  │ Worker API    │ │
│  │ FTS5 + BM25  │  │ (Bedesten     │ │
│  │ Mevzuat DB   │  │  10M+ Karar)  │ │
│  │ Hukuk Sözlük │  │ UYAP Emsal    │ │
│  └──────┬───────┘  └───────┬───────┘ │
│         └────────┬─────────┘         │
│                  ▼                   │
│         HİBRİT SONUÇLAR             │
│     (Füzyon: FTS + Semantik)         │
└────────┬─────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Google Gemini  │  ← Anahtar kelime çıkarımı
│   Flash          │  ← Hukuki analiz & sentez
│   (AI Modeli)    │  ← Belge oluşturma
└──────────────────┘
```

### Arama Pipeline'ı (Her Sorgu İçin):

```
1. Kullanıcı sorusu: "İşten çıkarıldım tazminat alabilir miyim?"
                          │
2. Gemini Flash       ──► Anahtar kelime çıkarımı: "fesih kıdem tazminatı"
                          │
3. Paralel Arama:    ──► Mevzuat DB (FTS5): İş Kanunu Md.17, Md.25...
                     ──► Yerel 776K (FTS5): Yargıtay 9.HD kararları
                     ──► Bedesten API: 10M+ karar havuzu
                     ──► UYAP Emsal: Güncel kararlar
                          │
4. Sentez:           ──► Gemini Flash tüm veriyi alır
                     ──► Yapılandırılmış hukuki yanıt üretir
                     ──► Referanslı, tıklanabilir çıktı
```

### Kullanılan Teknolojiler:

| Katman | Teknoloji | Neden? |
|--------|-----------|--------|
| Frontend | Next.js 16, React 19, Tailwind v4 | Modern, hızlı, SSR |
| Veritabanı | SQLite (better-sqlite3) | Yerelde çalışır, sıfır altyapı maliyeti |
| Arama | FTS5 + BM25 + Cosine Similarity | Hibrit: hem kelime hem anlam |
| AI Model | Google Gemini Flash | Hızlı, ucuz (~0.065 TL/sorgu), Türkçe başarılı |
| Cloud Arama | Cloudflare Worker | Edge'de çalışır, 0 soğuk başlangıç |
| Belge Üretimi | docx paketi | Native Word (.docx) çıktısı |

---

## SLAYT 5 — MALİYET & İŞ MODELİ (1 dk)

### AI Maliyet Analizi (Avukat Başına)

| İşlem | Model | Maliyet/İşlem |
|-------|-------|---------------|
| AI Asistan sorgusu | Gemini Flash × 2 çağrı | ~0.065 TL |
| Belge oluşturma | Gemini Flash × 2 çağrı | ~0.083 TL |
| Belge analizi | Gemini 2.0 Flash × 1 çağrı | ~0.065 TL |
| Emsal karar arama | Cloudflare Worker (AI yok) | ~0 TL |

### Tipik Avukat Kullanımı (Aylık):
- ~150 AI Asistan sorgusu = 9.75 TL
- ~30 belge oluşturma = 2.49 TL
- ~20 belge analizi = 1.30 TL
- ~300 karar arama = 0 TL
- **Toplam AI maliyeti: ~17 TL/ay/avukat**

### İş Modeli:
- **Hedef fiyat: 2.000 TL/ay/avukat**
- **AI maliyeti: ~17 TL/ay**
- **Brüt marj: %99.15**
- Baro sicil doğrulaması ile sadece avukatlara açık (planlanan)

> 💡 Karşılaştırma: Uluslararası rakipler (Westlaw, LexisNexis) yıllık **100.000+ TL** fiyatlandırma yapıyor.

---

## SLAYT 6 — ETİK & GÜVENLİK (1 dk)

### ⚠️ Sorumluluk Çerçevesi

1. **AI ≠ Hukuki Mütalaa**
   - Tüm AI çıktılarında "taslak niteliğinde" uyarısı
   - "Bir avukata danışmanız önerilir" ibaresi zorunlu

2. **Veri Gizliliği**
   - Mevzuat veritabanı **yerelde** (SQLite) — buluta gönderilmez
   - Sadece sorgu metni Gemini API'ye gider
   - Müvekkil verisi **hiçbir zaman** AI modeline iletilmez

3. **Halüsinasyon Kontrolü**
   - AI **salt üretim yapmaz** — veritabanından bulunan gerçek kanun maddelerine ve kararlara dayalı yanıt verir
   - RAG (Retrieval-Augmented Generation) mimarisi
   - Referanslar tıklanabilir → avukat doğrulayabilir

4. **Hedef: Avukatın Yerine Geçmek DEĞİL**
   - Araştırma süresini 60 dk → 5 dk'ya indirmek
   - Taslak oluşturup avukatın **düzenleme yapmasını** sağlamak
   - Avukatı güçlendirmek, ikame etmek değil

---

## SLAYT 7 — KAPANIŞ (1 dk)

### Özet: LegalPath ile Avukat...

| Geleneksel | LegalPath ile |
|------------|---------------|
| 60 dk emsal arama | **5 dk** (filtreleriyle) |
| Manuel mevzuat tarama | **Otomatik** kanun maddesi eşleme |
| Sıfırdan dilekçe yazma | **AI taslak** + avukat düzenleme |
| Word'e kopyala-yapıştır | **DOCX dışa aktarma** |
| Dağınık notlar | **Dava yönetimi** paneli |

### Yol Haritası:
- 🔜 Baro sicil doğrulaması (avukatlara özel erişim)
- 🔜 Anayasa Mahkemesi bireysel başvuru entegrasyonu  
- 🔜 Sayıştay karar entegrasyonu
- 🔜 Çoklu dil desteği (Kürtçe, Arapça çeviri)
- 🔜 Mobil uygulama

### İletişim:
- **Demo:** localhost:3001 (bugün canlı gösterebilirim)
- **GitHub:** [proje linki]
- **Email:** [email]

> 🎤 "Sorularınız varsa memnuniyetle cevaplarım."

---

## 📌 SUNUM İPUÇLARI

### Zamanlama:
- Demo en önemli kısım → **önceden prova edin** (AI yanıtı 3-5 sn sürer)
- Teknik mimari slaytında çok detaya girmeyin, şemayı gösterin yeterli
- Maliyet slaytı avukat dinleyicileri çok etkiler

### Demo Hazırlığı:
- `npm run dev` ile sunucuyu önceden açık tutun
- AI Asistan'da 1-2 örnek soru önceden deneyin (soğuk başlangıç olmasın)  
- Tarayıcıda 3 tab açık tutun: (1) AI Asistan, (2) Belge Yazım, (3) Emsal Arama
- İnternet bağlantısı zorunlu (Gemini API + Bedesten Worker)

### Dinleyici Profili (Barolar Birliği):
- Avukatlar teknik detaydan çok **"benim işimi nasıl kolaylaştırır?"** sorusuna cevap ister
- Maliyet karşılaştırması (Westlaw vs LegalPath) çok etkili olur
- Etik boyutu **mutlaka** vurgulayın — "AI avukatın yerini almıyor" mesajı kritik
- Demo sırasında **gerçek bir hukuk sorusu** sorun (seyirciden bile alabilirsiniz)

### Potansiyel Sorular ve Cevaplar:

**S: "AI yanlış karar referansı verirse?"**
C: "Tüm referanslar tıklanabilir. Avukat tam metni açıp doğrulayabilir. Ayrıca sistem 'uydurma' yapmaz — veritabanımızdan bulunan gerçek kararlara dayalı yanıt verir (RAG mimarisi)."

**S: "Müvekkil bilgileri güvende mi?"**
C: "Mevzuat ve karar veritabanı tamamen yerelde çalışır. AI modeline sadece genel soru gönderilir, kişisel veri göndermiyoruz."

**S: "Hangi kararlar var veritabanında?"**
C: "776.000+ yerel SQLite karar + Bedesten API üzerinden 10 milyon+ karar. Yargıtay, Danıştay, BAM/BİM ve yerel mahkeme kararları."

**S: "Ne zaman piyasaya çıkacak?"**
C: "Şu an MVP aşamasındayız. Baro sicil doğrulamasından sonra pilot program başlatmayı planlıyoruz."

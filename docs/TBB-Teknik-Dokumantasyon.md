# LegalPath — Teknik Dokümantasyon

**Türkiye Barolar Birliği Bilişim ve Teknoloji Hukuku Komisyonu**
**Yapay Zekâ ve Avukatlık Çalıştayı Değerlendirme Dokümanı**

**Tarih:** Şubat 2026
**Hazırlayan:** İbrahim Furkan Güreli

---

## 1. Ürün/Hizmet Genel Tanımı

### 1.1. Ürün Adı
**LegalPath** — Yapay Zekâ Destekli Avukat Asistanı

### 1.2. Kısa Açıklama
LegalPath, aylık abonelik modeliyle (SaaS) sunulan, Türk hukuk sistemine özel olarak geliştirilmiş yapay zekâ destekli bir avukat asistanı web platformudur. Avukatlar **legalpath.com** üzerinden hesaplarına giriş yaparak; emsal karar araştırması, mevzuat taraması, belge yazımı, müvekkil ön görüşmesi ve dava yönetimi süreçlerini tek bir platform üzerinden dakikalar içinde gerçekleştirebilir.

### 1.3. Hedef Kullanıcı Kitlesi
- **Bireysel avukatlar**
- **Hukuk büroları** (küçük, orta ve büyük ölçekli)
- **Barolar** (kurumsal entegrasyon ile)
- **Hukuk fakültesi akademisyenleri ve öğrencileri**

### 1.4. Temel Değer Önerisi
| Geleneksel Yöntem | LegalPath ile |
|---|---|
| 45–60 dk emsal karar taraması | **5 dakikada** filtreleriyle tamamlanır |
| Manuel mevzuat araması | **Otomatik** kanun maddesi eşleme |
| Sıfırdan dilekçe yazma | **AI taslak** + avukat düzenleme |
| Uzun müvekkil dinleme süreçleri | **AI Ön Görüşme Asistanı** ile anlık analiz ve raporlama |
| Dağınık notlar / dosyalar | Entegre **dava yönetimi** paneli |

### 1.5. Modüller
LegalPath, birbiriyle entegre çalışan **6 ana modülden** oluşur:

1. **🔍 Akıllı Emsal Karar Arama** — Kendi veri mühendisliği süreçlerimizle oluşturduğumuz özel API üzerinden 10.000.000+ kararda hibrit (FTS + semantik) arama. Yargıtay, Danıştay, BAM/BİM ve yerel mahkeme kararları.
2. **🤖 AI Hukuk Asistanı** — Avukat doğal dilde sorusunu sorar; sistem otomatik olarak ilgili mevzuat maddelerini ve emsal kararları getirir, hukuki analiz yapar ve dilekçe taslağı oluşturur.
3. **📝 Akıllı Belge Yazım** — 6 belge türü desteği (dilekçe, ihtarname, sözleşme vb.). Mevzuat veritabanıyla entegre çalışır. DOCX dışa aktarma imkânı sunar.
4. **📄 Belge Analizi** — PDF/TXT yükleme ile AI destekli riskli madde tespiti, sözleşme inceleme ve dilekçe değerlendirme.
5. **📁 Dava/Dosya Yönetimi** — Bulut tabanlı dava dosyası oluşturma, karar/belge/not ekleme, durum takibi.
6. **🎙️ Ön Görüşme Asistanı** — Müvekkil ön görüşmelerinde ses kaydı alarak anlık analiz yapan süper asistan. Avukata görüşme esnasında sorulması gereken kritik soruları (örneğin "Maaş bordrolarını imzalayıp imzalamadığını teyit edin") yönlendirir ve görüşme bitiminde otomatik bir **Hukuki Ön Değerlendirme Raporu** oluşturur.

---

## 2. Teknik Mimari

### 2.1. Sistem Mimarisi

```text
  AVUKAT (Tarayıcı - legalpath.com)
      │
      ▼
┌───────────────────────────┐
│   Web Servisi (UI)        │  ← Next.js 16, React 19, Tailwind
└─────────────┬─────────────┘
              │
         ▼ API Ağı ▼
              │
┌─────────────┴─────────────────────────────────┐
│                 ARAMA MOTORU                  │
│                                               │
│  ┌────────────────────┐ ┌──────────────────┐  │
│  │ Özel Hukuk API'miz │ │ PostgreSQL       │  │
│  │ (10M+ Karar)       │ │ (pgvector)       │  │
│  │ UYAP Emsal Erişimi │ │ Mevzuat & Sözlük │  │
│  └─────────┬──────────┘ └────────┬─────────┘  │
│            ▼                     ▼            │
│            HİBRİT SONUÇLAR (Metin + Semantik) │
└─────────────┬─────────────────────────────────┘
              │
              ▼
┌───────────────────────────┐
│   Google Gemini Flash      │  ← Anahtar kelime çıkarımı
│   (AI Analiz Modeli)       │  ← Hukuki yorum & Ön görüşme analizi
└────────────────────────────┘
```

### 2.2. Kullanılan Teknolojiler

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS | SaaS modeli için yüksek performanslı web arayüzü |
| **Backend** | Node.js (Next.js API Routes) | Ölçeklenebilir servis yönetimi |
| **Veritabanı** | PostgreSQL | Kurumsal seviyede güvenli, yönetilen ilişkisel veritabanı |
| **Vektör Arama** | pgvector | PostgreSQL üzerinde semantik (anlam bazlı) karar/mevzuat arama |
| **Arama API** | Özel Hukuk API'miz | Kendi geliştirdiğimiz yüksek hızlı veri erişim noktası |
| **Ön Görüşme** | Web Audio API / STT | Sesli müvekkil görüşmelerinin metne dökümü ve anlık analizi |
| **AI Model** | Google Gemini Flash | Hızlı, düşük maliyetli ve Türkçede çok başarılı dil modeli |

### 2.3. Altyapı Tercihleri ve Ölçeklenebilirlik

- **Dağıtım Modeli:** Tamamen **Bulut (Cloud) tabanlı SaaS** mimarisi. Avukatların herhangi bir sunucu kurmasına gerek yoktur; interneti olan her cihazdan `legalpath.com` aracılığıyla erişilebilir. Bulut altyapısı, KVKK ve meslek kurallarına tam uyum için **yalnızca Türkiye sınırları içerisindeki ISO 27001 sertifikalı (Tier III standartlarında) veri merkezlerinde** barındırılacaktır.
- **Veritabanı Altyapısı:** Veri güvenliğini en üst düzeye çıkarmak adına şifrelenmiş, yönetilen **PostgreSQL** sunucuları kullanılmaktadır. Veriler hem istirahat halinde (Encryption at Rest) hem de aktarım sırasında (In Transit - TLS 1.3) uçtan uca şifrelenmektedir.
- **Ölçeklenebilirlik:** Yüksek eşzamanlı kullanıcı (avukat) taleplerini karşılayabilmek için modern bulut altyapısında mikroservis benzeri mimariyle yatay ölçekleme (horizontal scaling) yapılabilmektedir.

---

## 3. Yapay Zekâ ve Model Bilgisi

### 3.1. Kullanılan YZ Modelleri

- **Google Gemini Flash (gemini-flash-latest):** Anahtar kelime çıkarımı, hukuki analiz, dilekçe taslağı oluşturma, belge analizi ve ön görüşme asistanında anlık soru-cevap yönlendirmeleri için kullanılır.
- **Vektör Katmanı (pgvector):** Hukuki metinlerin semantik eşleşmesi için PostgreSQL içinde 768 boyutlu vektörel embedding işlemleri yapılır.

### 3.2. Eğitim Verileri (Bağlam)

LegalPath, kendi modelini eğitmek (fine-tuning) yerine büyük bir iç veri havuzu ile **RAG (Retrieval-Augmented Generation)** mimarisini kullanır:
1. Kendi veri mühendisliği süreçlerimizle tasnif edip sunucuya taşıdığımız **10.000.000+** Yargıtay, Danıştay, BAM/BİM ve yerel mahkeme kararına sahip **Özel Hukuk API'miz**.
2. **Güncel Mevzuat Veritabanı** (tüm yürürlükteki kanunlar).
3. Gelişmiş donanımsal **Hukuk Sözlüğü**.

### 3.3. Halüsinasyon Önleme Mekanizmaları

1. **RAG Mimarisi:** AI, kendi başına yasa uyduramaz; yalnızca PostgreSQL veritabanından çekilen gerçek maddeler ve kararlar üzerine kurulu yanıtlar verir.
2. **Kesin Referans Sistemi:** Yanıtlarda "Yargıtay böyle karar verdi" gibi soyut ifadeler yerine doğrudan **[KARAR:ID:ESAS:KARAR]** formatıyla tıklanabilir, doğrulanabilir kaynak gösterilir.
3. **Sistem Sınırlandırması (Prompt Engineering):** Sisteme kesin bir dille yalnızca hukuki asistan olduğu, mutlaka referansa dayanması ve uydurma yapmaması yönünde "hard-coded" komutlar işlenmiştir.

---

## 4. Veri Güvenliği ve KVKK Uyumu

### 4.1. Veri İzolasyonu (Multi-Tenant Mimari)
SaaS modeli gereği, `legalpath.com` sistemine giren her avukatın hesabı, müvekkil bilgileri, ses analizleri ve dava dosyaları PostgreSQL düzeyinde birbirinden tamamen izole edilmiştir. Bir avukatın davasına veya sorgularına başka bir hesaptan erişmek imkânsızdır.

### 4.2. Kişisel Veriler ve KVKK

- **Ses Kayıtları:** Ön Görüşme Asistanı, görüşme esnasında sesi analiz edip anlık rapor sunar, ancak ham ses kaydı sunucularda **kesinlikle depolanmaz**, işlendiği an imha edilir. Müşteri (müvekkil) onayı alınması prensibi esastır.
- **AI Modeli İletişimi (PII Maskeleme):** Baroların en çok önem verdiği güvenlik katmanımız burasıdır. Gemini vb. dış LLM API'lerine müvekkil verileri gönderilirken öncesinde **Otomatik PII (Kişisel Tanımlanabilir Veri) Maskeleme** algoritması devreye girer. Metindeki TC Kimlik Numarası, şirket Unvanı, şahıs adları ve iletişim bilgileri otomatik tespit edilip `[ŞAHIS_1]`, `[ŞİRKET_A]` formatına çevrilerek LLM'e yollanır (Örn: "Ahmet Yılmaz kovuldu" yerine "ŞAHIS_1 işten çıkarıldı"). Böylece dış servisler asla somut müvekkil verisi göremez.
- **Avukat Sırrı ve Uçtan Uca Şifreleme (Zero-Knowledge):** Sistem yöneticilerinin dahi avukatın dava dosyalarını ve özel hukuki notlarını okuyamayacağı uçtan uca Sıfır-Bilgi (Zero-Knowledge) mimarisi hedeflenmektedir.

---

## 5. Entegrasyon Kapasitesi

### 5.1. Kendi Hukuk API'miz
Diğer platformlara ve dış veritabanlarına bağlı kalmaksızın, kendi mühendisliğimizle kurguladığımız özel API altyapımızla 10 milyonun üzerindeki karara anlık ve kesintisiz ulaşıyoruz.

### 5.2. UYAP Emsal Entegrasyonu
Veritabanımıza ek olarak, UYAP Vatandaş portalının halka açık emsal karar arama altyapısıyla dinamik entegrasyon kapasitemiz mevcuttur. Bu sayede her an en güncel içtihatlar çekilebilmektedir.

### 5.3. Gelecek Planlı Entegrasyonlar
- **UETS (Ulusal Elektronik Tebligat Sistemi):** Tebligatların sisteme otomatik düşerek dava takip süresini başlatması.
- **Anayasa Mahkemesi ve Sayıştay** kararlarıyla doğrudan kurumsal entegrasyon.

---

## 6. Doğrulama ve Kaynak Referanslama

### 6.1. Hata Oranı ve Doğruluk
Sistemin emsal kararlara ve yasa maddelerine gösterdiği kaynak linkleri \%100 gerçek veritabanı verileridir (RAG sağolsun). AI'ın kattığı sentetik yorum kısmı ise açıkça "avukat denetimine tabidir" uyarısıyla sunulur.

### 6.2. Gerçek Dünya Testleri

Sistem akademik masaüstü bir proje olmaktan öteye geçmiş, bizzat avukatlar tarafından sahada denenmiştir:
- **Test Edilen Yerler:** İzmir'de bulunan **iki adet aktif hukuk bürosu** tarafından uygulamanın beta testi yapılmıştır.
- **Canlı Başarı:** Bu bürolardan birinde LegalPath kullanılarak hazırlanan gerçek bir dilekçe doğrudan kullanıma girmiş ve nihai olarak yasal işlemler için kullanılmıştır (tarafıma da sunulmuştur).
- **Sunum:** Uygulama, 14-15 Şubat 2026 TBB Yapay Zeka ve Avukatlık Çalıştayı'nda canlı demo ile komisyona ve tüm katılımcılara başarılı bir şekilde tanıtılıp sunulmuştur.

---

## 7. Kullanıcı ve Pazar Bilgisi

### 7.1. İş Modeli (SaaS Pazar Konumlandırması)

LegalPath, avukatların internet tarayıcısından girebileceği aylık abonelik modeli ile kurgulanmıştır. 

| Plan Türü | Açıklama | Fiyat (Hedef) |
|---|---|---|
| **Bireysel Avukat Planı** | Serbest çalışan avukatlar için sınırsız asistan, temel belge yazımı, Ön Görüşme modülü ve emsal kararlar. | **75 USD / Ay** |
| **Kurumsal (Bürolara Özel) Plan** | Özel kullanım kotaları, büro içi dosya paylaşımı ve artırılmış işlem hacmi. | **Özel fiyatlandırma** |

### 7.2. Maliyet Analizi ve Kârlılık

Bulut tabanlı bir AI servisi olmamızın getirdiği maliyet/gelir projeksiyonu çok yüksek marjlar sunmaktadır:
- **Veritabanı / Sunucu / Hosting Giderleri:** Sistemin genel bulut altyapısı sabit ve yönetilebilir bir maliyete sahiptir.
- **AI Tüketim Maliyeti:** Çok yoğun kullanan bir avukatın bile aylık AI maliyeti minimum **200 - 300 TL** civarındadır.
- **Genel Kârlılık:** Bireysel avukat aboneliğinden elde edilen yüksek brüt kârlılık, sürdürülebilir bir büyüme sağlamaya yeterlidir.

---

## 8. Demo ve Erişim

### 8.1. Canlı Çalışma Prensibi
Platform bir web uygulamasıdır ve herhangi bir kuruluma ihtiyaç duymaz. Bilgisayar, tablet veya cep telefonu dâhil tüm cihazlardan erişime uygundur.

### 8.2. Örnek Kullanım Akışı (Ön Görüşme Asistanı)
1. Avukat müvekkiliyle ofisteyken cep telefonundan veya bilgisayarından hesabına girip **Ön Görüşme Asistanı**'nı başlatır (Ses kaydı başlar).
2. Müvekkil yaşadığı olayı anlatır: *"Patronumdan mobbing gördüm, dün de insan kaynakları hiçbir gerekçe göstermeden işten çıkardı."*
3. AI bunu anlık olarak analiz eder ve ekranda avukata canlı öneriler sunar: 
   - *"Müvekkile ihtarname çekip çekmediğini sorun."* 
   - *"Maaş bordrolarını imzalayıp imzalamadığını teyit edin."*
4. Görüşme bittikten sonra sistem, konuşulanlara dayanarak "Olası dava türü, zamanaşımı gereksinimleri, gereken hukuki adımlar ve deliller" başlıklarından oluşan bir hukuki ön değerlendirme raporunu otomatik olarak oluşturarak dava dosyasına ekler.

---

## 9. Ekip Yapısı

Projenin tüm ar-ge, veritabanı mühendisliği, frontend, backend ve yapay zekâ entegrasyonu tamamen kurucusu tarafından tek başına geliştirilmiştir.

| İsim | Görevi | Eğitim Bilgisi |
|---|---|---|
| **İbrahim Furkan Güreli** | Kurucu / Full-Stack Geliştirici | **Akdeniz Üniversitesi Hukuk Fakültesi** (4. Sınıf Öğrencisi) |

Projenin kurumsal büyüme ve yatırım aşamasında avukatlar, müşteri temsilcileri ve DevOps uzmanlarından oluşan kapsamlı bir operasyon ekibine dönüştürülmesi planlanmaktadır.

---

**İletişim Bilgileri:**
- **Kurucu:** İbrahim Furkan Güreli
- **Email:** ibrahimfurkan.gureli@gmail.com
- **Web:** legalpath.com (Planlanan)
- **TBB Sunumu:** 14-15 Şubat 2026

---
*Bu doküman, Türkiye Barolar Birliği Bilişim ve Teknoloji Hukuku Komisyonu'nun "Yapay Zeka ve Avukatlık Çalıştayı" akabinde talep ettiği teknik dokümantasyon belgesi olarak hazırlanmıştır.*

# 🦅 UYAP Emsal Karar Entegrasyon Raporu (Teknik Dokümantasyon)

Bu belge, **Emsal Arama** uygulamasının `emsal.uyap.gov.tr` sistemiyle kurduğu entegrasyonu, veri çekme metodolojisini ve kullanılan scriptlerin mantığını açıklar.

## 1. Sistem Mimarisi

Uygulama, UYAP Emsal Karar Arama portalının (Vatandaş Portalı üzerinden erişilen) arka uç servislerini taklit ederek çalışır. Dinamik bir `CookieJar` ve `Session Manager` yapısı kullanır.

### Temel Bağlantı Parametreleri
- **Base URL:** `https://emsal.uyap.gov.tr`
- **User-Agent:** Google Chrome (v120+) taklidi.
- **Header Yapısı:** `Sec-Ch-Ua`, `Sec-Fetch-Mode`, `Origin` ve `Referer` başlıkları her istekte zorunlu tutulur.

## 2. Oturum Yönetimi (`initSession`)

UYAP, her arama oturumu için bir `JSESSIONID` oluşturur. Uygulama, ana sayfaya bir `GET` isteği atarak bu ID'yi yakalar ve takip eden tüm `POST` ve `GET` isteklerinde `Cookie` header'ı olarak gönderir.

## 3. Karar Arama Algoritması (`searchLive`)

Arama işlemi `/aramalist` endpoint'i üzerinden yapılır.

- **Endpoint:** `POST https://emsal.uyap.gov.tr/aramalist`
- **İstek Gövdesi (Payload):**
```json
{
  "data": {
    "arananKelime": "QUERY_TEXT",
    "esasYil": "",
    "esasIlkSiraNo": "",
    "esasSonSiraNo": "",
    "kararYil": "",
    "kararIlkSiraNo": "",
    "kararSonSiraNo": "",
    "baslangicTarihi": "",
    "bitisTarihi": "",
    "siralama": "1",
    "siralamaDirection": "desc",
    "pageSize": 10,
    "pageNumber": 1
  }
}
```

### Arama Sonuçlarının İşlenmesi
Dönen JSON verisindeki `data.data` dizisi haritalanır. Bu aşamada sadece **Metadata** (Esas No, Karar No, Tarih, Daire) elde edilir. Kararın tam metni bu aşamada kapalıdır.

## 4. Karar Metni Çekme Scripti (`getKarar`)

Uygulama, arama sonuçlarından dönen `id` (GUID) değerini kullanarak karar metnini çeker.

- **Endpoint:** `GET https://emsal.uyap.gov.tr/getDokuman?id={GUID}`
- **İşlem Adımları:**
  1. Kararın tam metni için ilgili ID ile UYAP doküman servisine istek atılır.
  2. Dönen veri HTML formatındadır. `html-to-text` kütüphanesi ile temizlenir.
  3. **Kalite Kontrol:** 2000 karakterden kısa kararlar "Usul Kararı" (görevsizlik, iade vb.) sayılarak yapay zekaya gönderilmeden elenebilir (`checkQuality` fonksiyonu).
  4. **Kalıcı Kayıt:** Çekilen tam metin, yerel `kararlar` tablosuna kaydedilir.

## 5. Yapay Zeka Entegrasyonu

AI Asistanı (`route.ts`), yukarıdaki akışı şu şekilde kullanır:
1. Kullanıcı sorgusunu hukuki kavramlara çevirir.
2. `searchLive` ile en güncel 5 kararı bulur.
3. Bu kararlar arasından en iyi 3 tanesinin tam metnini `getKarar` ile çeker.
4. Bu metinleri sistem promptuna ekleyerek analize dahil eder.

---
*Not: Bu sistem tamamen yerel (local) çalışacak şekilde tasarlanmıştır. UYAP oturumları kullanıcı oturumu üzerinden değil, uygulamanın dinamik oturum yönetimi üzerinden yürütülür.*

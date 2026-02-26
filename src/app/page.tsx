'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  Scale,
  Calendar,
  ArrowRight,
  Loader2,
  Brain,
  FileText,
  Zap,
  Shield,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

interface SearchResult {
  id: string;
  mahkeme: string;
  daire: string;
  esasNo: string;
  kararNo: string;
  tarih: string;
  metin?: string;
  ozet: string;
  kaynak?: 'Yerel' | 'Bedesten';
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
}

interface Filters {
  baslangicTarihi: string;
  bitisTarihi: string;
  durum: string;
  court: string;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    baslangicTarihi: '',
    bitisTarihi: '',
    durum: '',
    court: '',
  });
  const [lastFilters, setLastFilters] = useState<Filters>({
    baslangicTarihi: '',
    bitisTarihi: '',
    durum: '',
    court: '',
  });

  const pageSize = 10;
  const totalPages = Math.ceil(total / pageSize);

  const buildQueryString = (searchQuery: string, page: number, f: Filters) => {
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    params.set('page', String(page));
    if (f.baslangicTarihi) params.set('baslangicTarihi', f.baslangicTarihi);
    if (f.bitisTarihi) params.set('bitisTarihi', f.bitisTarihi);
    if (f.durum) params.set('durum', f.durum);
    if (f.court) params.set('court', f.court);
    return params.toString();
  };

  const doSearch = async (searchQuery: string, page: number, f: Filters) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const queryString = buildQueryString(searchQuery, page, f);
      const response = await fetch(`/api/search?${queryString}`);
      if (!response.ok) throw new Error('Arama başarısız');
      const data: SearchResponse = await response.json();
      setResults(data.results);
      setTotal(data.total);
      setCurrentPage(page);
      setSearched(true);
      setLastQuery(searchQuery);
      setLastFilters(f);
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError('Arama yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch(query, 1, filters);
  };

  const goToPage = async (page: number) => {
    if (page < 1 || page > totalPages) return;
    await doSearch(lastQuery, page, lastFilters);
  };

  const clearFilters = () => {
    setFilters({ baslangicTarihi: '', bitisTarihi: '', durum: '', court: '' });
  };

  const hasActiveFilters = lastFilters.baslangicTarihi || lastFilters.bitisTarihi || lastFilters.durum || lastFilters.court;

  return (
    <div className="flex flex-col w-full">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative w-full overflow-hidden bg-rx-bg">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 md:px-8 md:pt-24 md:pb-28">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-dark-charcoal/8 bg-white px-4 py-1.5 text-xs font-medium text-dark-charcoal/50 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              11 Milyondan Fazla İçtihat ve Mevzuat
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-dark-charcoal md:text-7xl lg:text-[82px]">
              Yapay Zeka Destekli
              <br />
              <span className="italic">Hukuk Platformu</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-dark-charcoal/50 md:text-lg">
              İçtihat arama, akıllı belge oluşturma ve dava yönetim süreçlerinizi tek bir yerden yönetin. Yapay zeka asistanınızla hukuki verimliliğinizi artırın.
            </p>

            {/* Search Bar */}
            <div className="relative z-10 mx-auto mt-10 max-w-2xl">
              <form onSubmit={handleSearch}>
                <div className="relative flex items-center gap-2 rounded-2xl border border-dark-charcoal/8 bg-white p-2 shadow-lg shadow-dark-charcoal/[0.04] transition-all focus-within:shadow-xl focus-within:shadow-dark-charcoal/[0.08] focus-within:border-dark-charcoal/15">
                  <Search className="ml-3 h-5 w-5 flex-shrink-0 text-dark-charcoal/30" />
                  <Input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Örn: İşçinin haklı nedenle feshi ve kıdem tazminatı..."
                    className="flex-1 border-none bg-transparent px-2 text-sm shadow-none placeholder:text-dark-charcoal/30 focus-visible:ring-0 md:text-base"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-dark-charcoal/40 hover:bg-dark-charcoal/5"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-10 rounded-xl bg-white border border-dark-charcoal/10 px-5 text-sm font-medium text-dark-charcoal shadow-sm hover:bg-gray-50 md:px-6"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ara'}
                    </Button>
                  </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="mt-3 rounded-xl border border-dark-charcoal/8 bg-white p-5 shadow-lg animate-in fade-in slide-in-from-top-1">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-dark-charcoal/50 uppercase tracking-wider">Filtreler</span>
                      {(filters.baslangicTarihi || filters.bitisTarihi || (filters.durum && filters.durum !== 'all') || filters.court) && (
                        <button onClick={clearFilters} className="text-xs text-rx-red hover:text-rx-red/80">Temizle</button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dark-charcoal/35">
                          <Scale className="h-3 w-3" /> Mahkeme
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: '', label: 'Tümü' },
                            { id: 'yargitay', label: 'Yargıtay' },
                            { id: 'danistay', label: 'Danıştay' },
                            { id: 'bolge', label: 'BAM / BİM' },
                            { id: 'emsal', label: 'Yerel' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFilters({ ...filters, court: item.id })}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${filters.court === item.id
                                ? 'border-dark-charcoal/20 bg-dark-charcoal/[0.06] text-dark-charcoal'
                                : 'border-dark-charcoal/8 bg-white text-dark-charcoal hover:border-dark-charcoal/20'
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dark-charcoal/35">
                            <Calendar className="h-3 w-3" /> Başlangıç
                          </label>
                          <Input type="date" value={filters.baslangicTarihi} onChange={(e) => setFilters({ ...filters, baslangicTarihi: e.target.value })} className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-dark-charcoal/35">
                            <Calendar className="h-3 w-3" /> Bitiş
                          </label>
                          <Input type="date" value={filters.bitisTarihi} onChange={(e) => setFilters({ ...filters, bitisTarihi: e.target.value })} className="h-9 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Quick Action */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/asistan" className="group inline-flex items-center gap-2 rounded-full border border-dark-charcoal/10 bg-white px-4 py-2 text-sm text-dark-charcoal shadow-sm transition-all hover:bg-gray-50 hover:shadow-md">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium">AI Asistan ile Soru Sor</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/belge-yazim" className="group inline-flex items-center gap-2 rounded-full border border-dark-charcoal/10 bg-white px-4 py-2 text-sm text-dark-charcoal shadow-sm transition-all hover:bg-gray-50 hover:shadow-md">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">Belge Oluştur</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-20 grid max-w-2xl grid-cols-3 border-t border-dark-charcoal/8 pt-8">
            <div className="text-center">
              <span className="font-mono text-2xl font-bold text-dark-charcoal md:text-3xl">11M+</span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-widest text-dark-charcoal/35">İçtihat</span>
            </div>
            <div className="border-x border-dark-charcoal/8 text-center">
              <span className="font-mono text-2xl font-bold text-dark-charcoal md:text-3xl">5</span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-widest text-dark-charcoal/35">Mahkeme</span>
            </div>
            <div className="text-center">
              <span className="font-mono text-2xl font-bold text-dark-charcoal md:text-3xl">&lt;2s</span>
              <span className="mt-1 block text-[11px] font-medium uppercase tracking-widest text-dark-charcoal/35">Arama</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ RESULTS ═══════════════ */}
      {(searched || error) && (
        <section id="results-section" className="w-full border-t border-dark-charcoal/5 bg-white px-5 py-16 md:px-8">
          <div className="mx-auto max-w-4xl">
            {hasActiveFilters && searched && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-sm text-dark-charcoal/50">Filtreler:</span>
                {lastFilters.baslangicTarihi && <Badge variant="outline" className="text-xs">Başlangıç: {lastFilters.baslangicTarihi}</Badge>}
                {lastFilters.bitisTarihi && <Badge variant="outline" className="text-xs">Bitiş: {lastFilters.bitisTarihi}</Badge>}
                {lastFilters.durum && <Badge variant="outline" className="text-xs">{lastFilters.durum === 'kesinlesti' ? 'Kesinleşti' : 'Kesinleşmedi'}</Badge>}
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">{error}</div>
            )}

            {searched && !loading && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-dark-charcoal/5 pb-3">
                  <h2 className="font-serif text-2xl text-dark-charcoal">Sonuçlar</h2>
                  <span className="font-mono text-sm text-dark-charcoal/40">
                    {total > 0 ? <><strong className="text-dark-charcoal">{total}</strong> sonuç{totalPages > 1 && ` · ${currentPage}/${totalPages}`}</> : 'Sonuç bulunamadı'}
                  </span>
                </div>

                <div className="space-y-3">
                  {results.length > 0 ? results.map((result) => (
                    <Link key={result.id} href={`/karar/${result.id}${result.kaynak ? `?source=${result.kaynak === 'Bedesten' ? 'bedesten' : 'emsal'}` : ''}`} target="_blank" className="group block">
                      <article className="rounded-xl border border-dark-charcoal/8 bg-white p-5 transition-all hover:border-dark-charcoal/15 hover:shadow-md">
                        <div className="mb-2.5 flex items-start justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-dark-charcoal/[0.04] px-2 py-0.5 font-mono text-[11px] text-dark-charcoal/60">{result.daire || 'Mahkeme'}</span>
                            {result.kaynak && (
                              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${result.kaynak === 'Yerel' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {result.kaynak}
                              </span>
                            )}
                            {result.tarih && <span className="font-mono text-[11px] text-dark-charcoal/35">{result.tarih}</span>}
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-dark-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-dark-charcoal/40" />
                        </div>
                        <h3 className="mb-2 font-serif text-lg text-dark-charcoal group-hover:text-rx-red transition-colors">
                          Esas: {result.esasNo} | Karar: {result.kararNo}
                        </h3>
                        {(result.ozet || result.metin) && (
                          <p className="line-clamp-2 text-[13px] leading-relaxed text-dark-charcoal/55">{result.ozet || result.metin}</p>
                        )}
                      </article>
                    </Link>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-dark-charcoal/15 py-16 text-center">
                      <p className="text-dark-charcoal/50">Aramanızla eşleşen sonuç bulunamadı.</p>
                      <button onClick={clearFilters} className="mt-3 text-sm text-rx-red hover:text-rx-red/80">Filtreleri Temizle</button>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-8">
                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="h-9 w-9 rounded-full p-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 font-mono text-sm text-dark-charcoal/60"><strong className="text-dark-charcoal">{currentPage}</strong> / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || loading} className="h-9 w-9 rounded-full p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════ FEATURES — Apilex Style ═══════════════ */}
      {!searched && !loading && (
        <>
          {/* Feature 1: AI Asistan */}
          <section className="w-full border-t border-dark-charcoal/5 bg-white">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:gap-20 md:px-8 md:py-28">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rx-red/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rx-red">
                  <Brain className="h-3 w-3" />
                  Yapay Zeka Asistanı
                </div>
                <h2 className="font-serif text-3xl leading-tight tracking-tight text-dark-charcoal md:text-4xl">
                  Hukuki soruları <span className="italic">yapay zeka</span> ile yanıtlayın
                </h2>
                <p className="mt-4 text-dark-charcoal/50 leading-relaxed">
                  Sorununuzu doğal dilde anlatın, yapay zeka ilgili mevzuat ve emsal kararları analiz ederek detaylı yanıtlar üretsin. Dilekçe taslağından yol haritasına kadar her şey tek bir sohbette.
                </p>
                <div className="mt-6 space-y-3">
                  {['Emsal karar referansları ile desteklenmiş yanıtlar', 'Otomatik dilekçe taslağı oluşturma', 'Mevzuat ve içtihat analizi'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-dark-charcoal/70">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/asistan" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-dark-charcoal px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-dark-charcoal/90 hover:shadow-md">
                  Hemen Kullanmaya Başla
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="relative rounded-2xl border border-dark-charcoal/8 bg-rx-bg p-6 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-end"><div className="rounded-2xl rounded-br-sm bg-dark-charcoal px-4 py-2.5 text-sm text-white/90">İşten çıkarıldım tazminat alamadım ne yapmalıyım?</div></div>
                  <div className="flex gap-2.5">
                    <div className="h-6 w-6 flex-shrink-0 rounded-full bg-white border border-dark-charcoal/10 flex items-center justify-center"><Scale className="h-3 w-3 text-dark-charcoal/60" /></div>
                    <div className="rounded-2xl rounded-bl-sm bg-white border border-dark-charcoal/8 p-4 text-[13px] leading-relaxed text-dark-charcoal/70 space-y-2">
                      <p><strong className="text-dark-charcoal">Kıdem tazminatı</strong> hakkınız bulunmaktadır. İşten çıkarılma nedeninize göre...</p>
                      <p className="text-rx-red text-xs">⚖️ Yargıtay 9. HD 2016/18275 E., 2020/6353 K.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature 2: İçtihat Arama */}
          <section className="w-full border-t border-dark-charcoal/5 bg-rx-bg">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:gap-20 md:px-8 md:py-28">
              <div className="order-2 md:order-1 rounded-2xl border border-dark-charcoal/8 bg-white p-5 shadow-sm">
                <div className="space-y-2.5">
                  {[
                    { daire: '9. Hukuk Dairesi', esas: '2016/18275', karar: '2020/6353', tarih: '24.06.2020' },
                    { daire: '22. Hukuk Dairesi', esas: '2017/29625', karar: '2019/21343', tarih: '21.11.2019' },
                    { daire: '9. Hukuk Dairesi', esas: '2015/27778', karar: '2018/21156', tarih: '21.11.2018' },
                  ].map((k, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-dark-charcoal/5 p-3 transition-colors hover:bg-dark-charcoal/[0.02]">
                      <div>
                        <p className="text-sm font-medium text-dark-charcoal">Esas: {k.esas} | Karar: {k.karar}</p>
                        <p className="mt-0.5 text-[11px] text-dark-charcoal/40">{k.daire} · {k.tarih}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-dark-charcoal/20" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
                  <Search className="h-3 w-3" />
                  Semantik Arama
                </div>
                <h2 className="font-serif text-3xl leading-tight tracking-tight text-dark-charcoal md:text-4xl">
                  11 milyon+ içtihatta <span className="italic">anlam bazlı</span> arama
                </h2>
                <p className="mt-4 text-dark-charcoal/50 leading-relaxed">
                  Anahtar kelimelerin ötesine geçin. Sorgunuzun anlamını analiz ederek Yargıtay, Danıştay, BAM, BİM ve yerel mahkeme kararları arasında en ilgili sonuçları saniyeler içinde bulun.
                </p>
                <div className="mt-6 space-y-3">
                  {['Yargıtay, Danıştay, BAM, BİM ve yerel mahkemeler', 'Bedesten ve UYAP Emsal veritabanları', 'Filtreleme: mahkeme, tarih aralığı, karar durumu'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-dark-charcoal/70">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Feature 3: Akıllı Belge Yazım */}
          <section className="w-full border-t border-dark-charcoal/5 bg-white">
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:gap-20 md:px-8 md:py-28">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700">
                  <FileText className="h-3 w-3" />
                  Akıllı Belge Yazım
                </div>
                <h2 className="font-serif text-3xl leading-tight tracking-tight text-dark-charcoal md:text-4xl">
                  Dilekçeden sözleşmeye, <span className="italic">AI ile yazın</span>
                </h2>
                <p className="mt-4 text-dark-charcoal/50 leading-relaxed">
                  Durumunuzu anlatın, yapay zeka profesyonel hukuki belgeyi saniyeler içinde oluştursun. Dilekçe, ihtarname, sözleşme, vekaletname ve daha fazlası.
                </p>
                <div className="mt-6 space-y-3">
                  {['Dilekçe, ihtarname, sözleşme, vekaletname', 'Profesyonel hukuki dil ve format', 'Anında indirme ve kopyalama'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-dark-charcoal/70">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/belge-yazim" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-dark-charcoal px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-dark-charcoal/90 hover:shadow-md">
                  Belge Oluştur
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="rounded-2xl border border-dark-charcoal/8 bg-rx-bg p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-dark-charcoal/5 bg-white p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rx-red/[0.06] text-rx-red"><Scale className="h-4 w-4" /></div>
                    <div><p className="text-sm font-medium text-dark-charcoal">Dilekçe</p><p className="text-[11px] text-dark-charcoal/40">Dava ve talep dilekçesi</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-dark-charcoal/5 bg-white p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/[0.06] text-amber-700"><FileText className="h-4 w-4" /></div>
                    <div><p className="text-sm font-medium text-dark-charcoal">İhtarname</p><p className="text-[11px] text-dark-charcoal/40">Noterden çekilecek ihtarname</p></div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-dark-charcoal/5 bg-white p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/[0.06] text-emerald-600"><BookOpen className="h-4 w-4" /></div>
                    <div><p className="text-sm font-medium text-dark-charcoal">Sözleşme</p><p className="text-[11px] text-dark-charcoal/40">İş, kira, hizmet sözleşmesi</p></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Cards Grid */}
          <section className="w-full border-t border-dark-charcoal/5 bg-rx-bg px-5 py-20 md:px-8 md:py-28">
            <div className="mx-auto max-w-7xl">
              <div className="mb-14 text-center">
                <span className="mb-3 block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-dark-charcoal/30">Özellikler</span>
                <h2 className="font-serif text-3xl tracking-tight text-dark-charcoal md:text-4xl">
                  Hukuku <span className="italic">dönüştüren</span> teknoloji
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Brain, title: 'AI Asistan', desc: 'Yapay zeka destekli hukuk danışmanı. Sorularınızı yanıtlar, dilekçe hazırlar.', color: 'text-rx-red bg-rx-red/[0.06]' },
                  { icon: Search, title: 'Semantik Arama', desc: 'Anlam bazlı arama ile 11M+ içtihat arasından en ilgili sonuçları bulun.', color: 'text-blue-600 bg-blue-500/[0.06]' },
                  { icon: FileText, title: 'Belge Yazım', desc: 'Dilekçe, ihtarname, sözleşme — AI ile profesyonel hukuki belge oluşturun.', color: 'text-amber-700 bg-amber-500/[0.06]' },
                  { icon: Zap, title: 'Anlık Erişim', desc: 'Arama sonuçlarından direkt tam metinlere geçiş. Saatler süren araştırma saniyeye indi.', color: 'text-emerald-600 bg-emerald-500/[0.06]' },
                ].map((feature, i) => (
                  <div key={i} className="rounded-2xl border border-dark-charcoal/5 bg-white p-6 transition-all hover:border-dark-charcoal/10 hover:shadow-sm">
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${feature.color}`}>
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-serif text-lg text-dark-charcoal">{feature.title}</h3>
                    <p className="text-[13px] leading-relaxed text-dark-charcoal/50">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="w-full border-t border-dark-charcoal/5 bg-white px-5 py-16 md:px-8 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-3xl text-dark-charcoal md:text-4xl">Hemen Başlayın</h2>
              <p className="mx-auto mt-3 max-w-md text-dark-charcoal/50">Akıllı hukuk platformunun gücünü deneyimleyin.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/asistan" className="rounded-lg bg-white border border-dark-charcoal/10 px-6 py-2.5 text-sm font-medium text-dark-charcoal shadow-sm transition-all hover:bg-gray-50 hover:shadow-md">
                  AI Asistan
                </Link>
                <Link href="/belge-yazim" className="rounded-lg border border-dark-charcoal/20 px-6 py-2.5 text-sm font-medium text-dark-charcoal transition-all hover:bg-dark-charcoal/5">
                  Belge Yazım
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="w-full border-t border-dark-charcoal/5 bg-rx-bg px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <Link href="/" className="font-serif text-lg text-dark-charcoal/40">
            Legal<span className="italic">Path</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-dark-charcoal/30">
            <Link href="/" className="hover:text-dark-charcoal/50 transition-colors">İçtihat Arama</Link>
            <Link href="/asistan" className="hover:text-dark-charcoal/50 transition-colors">AI Asistan</Link>
            <Link href="/belge-yazim" className="hover:text-dark-charcoal/50 transition-colors">Belge Yazım</Link>
          </div>
          <span className="font-mono text-xs text-dark-charcoal/25">© 2026 LegalPath</span>
        </div>
      </footer>
    </div>
  );
}

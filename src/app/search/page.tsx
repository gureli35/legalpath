'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Brain, Scale, Calendar, ChevronRight, ChevronDown, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HUKUK_DALLARI = [
    'İş Hukuku', 'Aile Hukuku', 'Ceza Hukuku', 'Ticaret Hukuku',
    'İdare Hukuku', 'Gayrimenkul', 'Tüketici Hukuku', 'İcra & İflas',
    'Borçlar Hukuku', 'Vergi Hukuku', 'Sosyal Güvenlik', 'Miras Hukuku'
];

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SearchPageContent />
        </Suspense>
    );
}

function SearchPageContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [court, setCourt] = useState(searchParams.get('court') || '');
    const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [hukukDali, setHukukDali] = useState('');
    const [daireFilter, setDaireFilter] = useState('');
    const [sortBy, setSortBy] = useState<'relevance' | 'date_desc' | 'date_asc'>('relevance');

    const activeFilterCount = [dateFrom, dateTo, hukukDali, daireFilter].filter(Boolean).length + (sortBy !== 'relevance' ? 1 : 0);

    // Auto-search if query param exists
    useEffect(() => {
        if (initialQuery && !hasSearched) {
            handleSearch(undefined, initialQuery, court, page);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialQuery]);

    const handleSearch = async (e?: React.FormEvent, queryOverride?: string, courtOverride?: string, pageOverride?: number) => {
        e?.preventDefault();
        const searchQuery = queryOverride || query;
        const searchCourt = courtOverride !== undefined ? courtOverride : court;
        const searchPage = pageOverride !== undefined ? pageOverride : page;

        if (!searchQuery.trim()) return;

        setLoading(true);
        setHasSearched(true);
        if (pageOverride !== undefined) setPage(pageOverride);

        try {
            // Build enhanced query if hukukDali is selected
            let enhancedQuery = searchQuery;
            if (hukukDali) {
                enhancedQuery = `${searchQuery} ${hukukDali}`;
            }

            const params = new URLSearchParams({
                q: enhancedQuery,
                court: searchCourt,
                page: String(searchPage),
            });
            if (dateFrom) params.set('baslangicTarihi', dateFrom);
            if (dateTo) params.set('bitisTarihi', dateTo);

            const response = await fetch(`/api/search?${params.toString()}`);
            const data = await response.json();
            let filteredResults = data.results || [];

            // Client-side daire filter
            if (daireFilter) {
                const daireLower = daireFilter.toLowerCase();
                filteredResults = filteredResults.filter((r: any) =>
                    (r.daire || '').toLowerCase().includes(daireLower) ||
                    (r.mahkeme || '').toLowerCase().includes(daireLower)
                );
            }

            // Client-side date range filter (tarih format: DD.MM.YYYY or YYYY-MM-DD)
            if (dateFrom || dateTo) {
                filteredResults = filteredResults.filter((r: any) => {
                    if (!r.tarih) return true; // Keep results without date
                    const dateStr = r.tarih;
                    let d: Date;
                    if (dateStr.includes('.')) {
                        const parts = dateStr.split('.');
                        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        d = new Date(dateStr);
                    }
                    if (isNaN(d.getTime())) return true;
                    if (dateFrom && d < new Date(dateFrom)) return false;
                    if (dateTo && d > new Date(dateTo)) return false;
                    return true;
                });
            }

            // Client-side sort
            if (sortBy === 'date_desc') {
                filteredResults.sort((a: any, b: any) => {
                    const parseDate = (s: string) => {
                        if (!s) return 0;
                        if (s.includes('.')) { const p = s.split('.'); return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime(); }
                        return new Date(s).getTime();
                    };
                    return parseDate(b.tarih) - parseDate(a.tarih);
                });
            } else if (sortBy === 'date_asc') {
                filteredResults.sort((a: any, b: any) => {
                    const parseDate = (s: string) => {
                        if (!s) return 0;
                        if (s.includes('.')) { const p = s.split('.'); return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime(); }
                        return new Date(s).getTime();
                    };
                    return parseDate(a.tarih) - parseDate(b.tarih);
                });
            }

            setResults(filteredResults);

            // Update URL without reload
            const newUrl = `/search?q=${encodeURIComponent(searchQuery)}&court=${encodeURIComponent(searchCourt)}&page=${searchPage}`;
            window.history.pushState({ path: newUrl }, '', newUrl);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setDateFrom('');
        setDateTo('');
        setHukukDali('');
        setDaireFilter('');
        setSortBy('relevance');
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center">
            <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-12 flex-1">
                {/* Search Hero */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rx-gold/10 border border-rx-gold/20 text-rx-gold text-xs font-bold uppercase tracking-wider mb-4">
                        <Brain className="w-3.5 h-3.5" />
                        Vektör Tabanlı Semantik Arama
                    </div>
                    <h1 className="font-serif text-4xl sm:text-5xl text-dark-charcoal mb-4">
                        Emsal Karar Arama
                    </h1>
                    <p className="text-dark-charcoal/70 max-w-2xl mx-auto text-lg leading-relaxed">
                        776.000+ Yerel Karar ve Bedesten Cloud API (10M+) ile yapay zeka destekli hukuki araştırma.
                    </p>
                </div>

                {/* Search Bar */}
                <form onSubmit={(e) => handleSearch(e)} className="max-w-4xl mx-auto mb-12 space-y-4">
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-rx-gold/50 to-rx-red/50 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                        <div className="relative flex items-center bg-white border border-dark-charcoal/10 rounded-full p-2 pl-6 shadow-sm focus-within:shadow-md focus-within:border-dark-charcoal/20 transition-all">
                            <Search className="w-5 h-5 text-dark-charcoal/40" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Örn: İşçinin haksız fesih nedeniyle kıdem tazminatı talebi..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-dark-charcoal placeholder:text-dark-charcoal/40 px-4 py-3 text-base"
                            />
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-dark-charcoal hover:bg-dark-charcoal/90 text-white rounded-full px-6 py-6 h-auto font-medium transition-all shadow-md hover:shadow-lg"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ara'}
                            </Button>
                        </div>
                    </div>

                    {/* Court Filters + Advanced Toggle */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
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
                                onClick={() => {
                                    setCourt(item.id);
                                    handleSearch(undefined, query, item.id, 1);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${court === item.id
                                    ? 'bg-dark-charcoal text-white border-dark-charcoal shadow-md scale-[1.02]'
                                    : 'bg-white text-dark-charcoal/60 border-dark-charcoal/10 hover:border-dark-charcoal/20 hover:shadow-sm'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-dark-charcoal/10 mx-1 hidden sm:block" />

                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters || activeFilterCount > 0
                                ? 'bg-rx-red/5 text-rx-red border-rx-red/20'
                                : 'bg-white text-dark-charcoal/60 border-dark-charcoal/10 hover:border-dark-charcoal/20'
                                }`}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Gelişmiş Filtre
                            {activeFilterCount > 0 && (
                                <span className="ml-0.5 bg-rx-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="bg-white border border-dark-charcoal/8 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/40">Gelişmiş Filtreler</h3>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="flex items-center gap-1 text-xs font-medium text-rx-red hover:text-rx-red/80 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                        Filtreleri Temizle
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Date From */}
                                <div>
                                    <label className="text-[11px] font-bold text-dark-charcoal/50 mb-1.5 block">Başlangıç Tarihi</label>
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-dark-charcoal/10 text-sm text-dark-charcoal bg-rx-bg/50 focus:outline-none focus:border-dark-charcoal/20 transition-colors"
                                    />
                                </div>

                                {/* Date To */}
                                <div>
                                    <label className="text-[11px] font-bold text-dark-charcoal/50 mb-1.5 block">Bitiş Tarihi</label>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-dark-charcoal/10 text-sm text-dark-charcoal bg-rx-bg/50 focus:outline-none focus:border-dark-charcoal/20 transition-colors"
                                    />
                                </div>

                                {/* Hukuk Dalı */}
                                <div>
                                    <label className="text-[11px] font-bold text-dark-charcoal/50 mb-1.5 block">Hukuk Dalı</label>
                                    <select
                                        value={hukukDali}
                                        onChange={(e) => setHukukDali(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-dark-charcoal/10 text-sm text-dark-charcoal bg-rx-bg/50 focus:outline-none focus:border-dark-charcoal/20 transition-colors"
                                    >
                                        <option value="">Tümü</option>
                                        {HUKUK_DALLARI.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Daire */}
                                <div>
                                    <label className="text-[11px] font-bold text-dark-charcoal/50 mb-1.5 block">Daire / Mahkeme</label>
                                    <input
                                        type="text"
                                        value={daireFilter}
                                        onChange={(e) => setDaireFilter(e.target.value)}
                                        placeholder="Örn: 9. Hukuk"
                                        className="w-full px-3 py-2 rounded-lg border border-dark-charcoal/10 text-sm text-dark-charcoal bg-rx-bg/50 placeholder:text-dark-charcoal/30 focus:outline-none focus:border-dark-charcoal/20 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-3 pt-2 border-t border-dark-charcoal/5">
                                <span className="text-[11px] font-bold text-dark-charcoal/40">Sıralama:</span>
                                {[
                                    { id: 'relevance' as const, label: 'Alaka Düzeni' },
                                    { id: 'date_desc' as const, label: 'En Yeni' },
                                    { id: 'date_asc' as const, label: 'En Eski' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setSortBy(s.id)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${sortBy === s.id
                                            ? 'bg-dark-charcoal text-white border-dark-charcoal'
                                            : 'bg-rx-bg/50 text-dark-charcoal/50 border-dark-charcoal/5 hover:border-dark-charcoal/15'
                                            }`}
                                    >
                                        {s.label}
                                    </button>
                                ))}

                                <div className="flex-1" />
                                <Button
                                    type="button"
                                    onClick={() => handleSearch(undefined, query, court, 1)}
                                    disabled={loading || !query.trim()}
                                    className="bg-dark-charcoal hover:bg-dark-charcoal/90 text-white rounded-lg px-4 h-8 text-xs font-medium gap-1.5"
                                >
                                    <Search className="w-3 h-3" />
                                    Filtreli Ara
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Active filter badges */}
                    {activeFilterCount > 0 && !showFilters && (
                        <div className="flex flex-wrap items-center gap-2">
                            {dateFrom && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rx-red/5 border border-rx-red/10 text-[11px] font-medium text-rx-red">
                                    <Calendar className="w-3 h-3" />
                                    {dateFrom}
                                    <button type="button" onClick={() => setDateFrom('')} className="ml-0.5 hover:text-rx-red/60"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {dateTo && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rx-red/5 border border-rx-red/10 text-[11px] font-medium text-rx-red">
                                    <Calendar className="w-3 h-3" />
                                    → {dateTo}
                                    <button type="button" onClick={() => setDateTo('')} className="ml-0.5 hover:text-rx-red/60"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {hukukDali && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rx-red/5 border border-rx-red/10 text-[11px] font-medium text-rx-red">
                                    {hukukDali}
                                    <button type="button" onClick={() => setHukukDali('')} className="ml-0.5 hover:text-rx-red/60"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {daireFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rx-red/5 border border-rx-red/10 text-[11px] font-medium text-rx-red">
                                    Daire: {daireFilter}
                                    <button type="button" onClick={() => setDaireFilter('')} className="ml-0.5 hover:text-rx-red/60"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {sortBy !== 'relevance' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rx-red/5 border border-rx-red/10 text-[11px] font-medium text-rx-red">
                                    {sortBy === 'date_desc' ? 'En Yeni' : 'En Eski'}
                                    <button type="button" onClick={() => setSortBy('relevance')} className="ml-0.5 hover:text-rx-red/60"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-[11px] font-bold text-dark-charcoal/30 hover:text-rx-red transition-colors"
                            >
                                Tümünü Temizle
                            </button>
                        </div>
                    )}

                    {court && !showFilters && activeFilterCount === 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                setCourt('');
                                handleSearch(undefined, query, '');
                            }}
                            className="text-xs font-bold text-rx-red hover:text-rx-red/80 transition-colors bg-rx-red/5 px-3 py-2 rounded-lg border border-rx-red/10"
                        >
                            Filtreyi Temizle
                        </button>
                    )}
                </form>

                {/* Results */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-dark-charcoal/50 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-rx-gold" />
                            <p className="animate-pulse font-serif text-lg">Vektör uzayı taranıyor...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {/* Results count */}
                            <div className="flex items-center justify-between text-xs text-dark-charcoal/40 font-medium px-1">
                                <span>{results.length} sonuç bulundu{activeFilterCount > 0 ? ` (${activeFilterCount} filtre aktif)` : ''}</span>
                                <span>Sayfa {page}</span>
                            </div>

                            {results.map((karar) => (
                                <Link
                                    key={karar.id}
                                    href={`/karar/${karar.id}${karar.kaynak ? `?source=${karar.kaynak === 'Bedesten' ? 'bedesten' : 'emsal'}` : ''}`}
                                    target="_blank"
                                    className="group relative bg-white border border-dark-charcoal/5 rounded-xl p-6 hover:border-rx-gold/30 transition-all hover:shadow-md hover:shadow-rx-gold/5 overflow-hidden"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-rx-bg flex items-center justify-center border border-dark-charcoal/5 group-hover:bg-white transition-colors">
                                                <Scale className="w-5 h-5 text-dark-charcoal/60 group-hover:text-rx-red transition-colors" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-xl text-dark-charcoal group-hover:text-rx-red transition-colors line-clamp-1">
                                                    {karar.mahkeme}
                                                </h3>
                                                <p className="text-xs text-dark-charcoal/50 uppercase tracking-wide font-semibold">{karar.daire}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 min-w-fit">
                                            <div className="bg-rx-gold/10 border border-rx-gold/20 text-rx-gold text-[10px] font-bold px-2 py-1 rounded">
                                                %{Math.round(karar.similarity * 100)} Uyum
                                            </div>
                                            {karar.kaynak && (
                                                <div className={`text-[10px] font-bold px-2 py-1 rounded border ${karar.kaynak === 'Yerel'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                                                    }`}>
                                                    {karar.kaynak}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3 pl-[52px]">
                                        <div className="flex items-center gap-4 text-xs text-dark-charcoal/60 font-medium">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-dark-charcoal/80">E:</span> {karar.esasNo}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-dark-charcoal/80">K:</span> {karar.kararNo}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 opacity-70" />
                                                <span>{karar.tarih}</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-dark-charcoal/80 line-clamp-3 leading-relaxed">
                                            {karar.ozet || karar.metin || 'Karar özeti bulunamadı.'}
                                        </p>
                                    </div>

                                    <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight className="w-5 h-5 text-rx-gold" />
                                    </div>
                                </Link>
                            ))}

                            {/* Pagination Controls */}
                            <div className="flex items-center justify-center gap-4 py-8 border-t border-dark-charcoal/5 mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSearch(undefined, query, court, page - 1)}
                                    disabled={loading || page <= 1}
                                    className="rounded-xl border-dark-charcoal/10 px-6 font-semibold flex items-center gap-2"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                    Önceki Sayfa
                                </Button>

                                <div className="bg-white border border-dark-charcoal/10 rounded-xl px-4 py-2 text-sm font-bold text-dark-charcoal shadow-sm">
                                    Sayfa {page}
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => handleSearch(undefined, query, court, page + 1)}
                                    disabled={loading || results.length < 10}
                                    className="rounded-xl border-dark-charcoal/10 px-6 font-semibold flex items-center gap-2"
                                >
                                    Sonraki Sayfa
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : hasSearched ? (
                        <div className="text-center py-20 border border-dashed border-dark-charcoal/10 rounded-3xl bg-white/50">
                            <p className="text-dark-charcoal/60">Aradığınız kriterlere uygun sonuç bulunamadı.</p>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="mt-3 text-xs font-bold text-rx-red hover:text-rx-red/80 transition-colors"
                                >
                                    Filtreleri kaldırıp tekrar deneyin
                                </button>
                            )}
                        </div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}

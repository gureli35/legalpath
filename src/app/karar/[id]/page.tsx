 'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Calendar, Building, Hash, Loader2, Share2, Printer, Bookmark, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KararDetay {
    id: string;
    mahkeme: string;
    daire: string;
    esasNo: string;
    kararNo: string;
    tarih: string;
    metin: string;
    konu: string;
}

export default function KararPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-rx-bg">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-rx-gold" />
                    <p className="text-dark-charcoal/60 font-serif text-lg">Karar yükleniyor...</p>
                </div>
            </div>
        }>
            <KararPageContent />
        </Suspense>
    );
}

function KararPageContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const source = searchParams.get('source') || undefined;

    const [karar, setKarar] = useState<KararDetay | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchKarar = async () => {
            try {
                const sourceParam = source ? `?source=${source}` : '';
                const response = await fetch(`/api/karar/${id}${sourceParam}`);
                if (!response.ok) throw new Error('Karar bulunamadı');

                const data = await response.json();
                setKarar(data);
            } catch (err) {
                setError('Karar yüklenirken bir hata oluştu');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchKarar();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-rx-bg">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-rx-gold" />
                    <p className="text-dark-charcoal/60 font-serif text-lg">Karar yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error || !karar) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-rx-bg p-4">
                <div className="max-w-md w-full bg-white border border-dark-charcoal/10 rounded-2xl p-8 text-center shadow-sm">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-rx-red/50" />
                    <h1 className="text-xl font-serif text-dark-charcoal mb-2">Karar Bulunamadı</h1>
                    <p className="text-dark-charcoal/60 mb-6">{error || 'Aradığınız karar sistemde mevcut değil.'}</p>
                    <Link href="/search">
                        <Button className="bg-dark-charcoal hover:bg-dark-charcoal/90 text-white rounded-full">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Aramaya Dön
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#525659] flex flex-col items-center py-12">
            {/* Top Bar (Actions) */}
            <div className="w-full max-w-[21cm] flex items-center justify-between mb-8 px-4 md:px-0 text-white">
                <Link href="/search" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                    <div className="bg-white/10 p-2 rounded-full hover:bg-white/20">
                        <ArrowLeft className="h-5 w-5" />
                    </div>
                    <span className="font-medium">Aramaya Dön</span>
                </Link>

                <div className="flex items-center gap-3">
                    <Button variant="secondary" className="bg-white text-dark-charcoal hover:bg-white/90 shadow-lg">
                        <Printer className="h-4 w-4 mr-2" />
                        Yazdır
                    </Button>
                    <Button className="bg-rx-gold text-white hover:bg-rx-gold/90 shadow-lg">
                        <Share2 className="h-4 w-4 mr-2" />
                        Paylaş
                    </Button>
                </div>
            </div>

            {/* A4 Paper Container */}
            <main className="w-full max-w-[21cm] min-h-[29.7cm] bg-white shadow-2xl relative mx-auto p-[2.5cm] md:p-[3cm]">

                {/* Header (Antet) */}
                <header className="text-center border-b-2 border-black/10 pb-8 mb-12">
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-black/10 rounded-full mb-4">
                            <Scale className="h-8 w-8 text-black/40" />
                        </div>
                        <h1 className="font-serif text-2xl font-bold text-black uppercase tracking-widest leading-relaxed">
                            {karar.mahkeme}
                        </h1>
                        <h2 className="font-serif text-lg font-medium text-black/60 uppercase tracking-wide mt-2">
                            {karar.daire}
                        </h2>
                    </div>

                    <div className="flex justify-center gap-12 text-sm font-serif border-t border-black/10 pt-4 mt-4 w-fit mx-auto px-12">
                        <div className="text-center">
                            <span className="block font-bold text-black/40 text-xs uppercase mb-1">Esas No</span>
                            <span className="text-lg font-bold text-black">{karar.esasNo}</span>
                        </div>
                        <div className="text-center">
                            <span className="block font-bold text-black/40 text-xs uppercase mb-1">Karar No</span>
                            <span className="text-lg font-bold text-black">{karar.kararNo}</span>
                        </div>
                        <div className="text-center">
                            <span className="block font-bold text-black/40 text-xs uppercase mb-1">Tarih</span>
                            <span className="text-lg font-bold text-black">{karar.tarih}</span>
                        </div>
                    </div>
                </header>

                {/* Content Body */}
                <article className="font-serif text-black leading-[1.8] text-justify text-[11pt]">
                    {karar.konu && (
                        <div className="mb-8 p-4 bg-gray-50 border-l-4 border-black/20 italic text-black/70 text-sm">
                            <strong>Konu:</strong> {karar.konu}
                        </div>
                    )}

                    <div className="prose prose-p:font-serif prose-headings:font-serif max-w-none text-black">
                        {/* Metindeki satır sonlarını ve paragrafları düzgün işle */}
                        {karar.metin.split('\n').map((line, i) => (
                            line.trim() ? (
                                <p key={i} className="mb-4 indent-8">
                                    {line}
                                </p>
                            ) : <br key={i} />
                        ))}
                    </div>
                </article>

                {/* Footer (Page Number / Stamp simulation) */}
                <div className="absolute bottom-12 left-0 right-0 text-center">
                    <span className="text-[10px] text-black/20 font-mono tracking-[0.2em] uppercase">
                        LegalPath Resmi Belge Doğrulama Kodu: {id.substring(0, 8).toUpperCase()}
                    </span>
                </div>
            </main>
        </div>
    );
}

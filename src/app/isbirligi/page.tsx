'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Globe, MapPin, Scale, Search, Users,
    MessageSquare, Star, ArrowRight, ShieldCheck,
    Briefcase, Building2, ChevronRight, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Navigation } from '@/components/ui/navigation';

// Mock data for profiles
const MOCK_LAWYERS = [
    {
        id: 1,
        name: "Sarah Jenkins",
        title: "International Family Law Specialist",
        location: "London, UK",
        firm: "Jenkins & Partners",
        expertise: ["Aile Hukuku", "Miras Hukuku", "Boşanma"],
        languages: ["English", "French"],
        rating: 4.9,
        reviews: 124,
        verified: true,
        image: "SJ"
    },
    {
        id: 2,
        name: "Dr. Hans Müller",
        title: "Corporate & Commercial Law",
        location: "Berlin, Germany",
        firm: "Müller Legal Group",
        expertise: ["Ticaret Hukuku", "Şirketler Hukuku", "GDPR"],
        languages: ["German", "English", "Turkish"],
        rating: 4.8,
        reviews: 89,
        verified: true,
        image: "HM"
    },
    {
        id: 3,
        name: "Elena Rossini",
        title: "Maritime & Transport Law",
        location: "Rome, Italy",
        firm: "Rossini Law",
        expertise: ["Deniz Ticareti", "Lojistik", "Sözleşmeler"],
        languages: ["Italian", "English", "Spanish"],
        rating: 5.0,
        reviews: 56,
        verified: true,
        image: "ER"
    },
    {
        id: 4,
        name: "Michael Chang",
        title: "IP & Tech Law Attorney",
        location: "New York, USA",
        firm: "Chang Tech Legal",
        expertise: ["Fikri Mülkiyet", "Teknoloji", "Startups"],
        languages: ["English", "Chinese"],
        rating: 4.9,
        reviews: 210,
        verified: true,
        image: "MC"
    }
];

export default function IsbirligiPage() {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="min-h-screen bg-rx-bg flex flex-col">
            {/* Custom Header for this specific page if needed, or use main layout. 
          Assuming Navigation component handles its own visibility or we use standard layout.
          For this mock, we'll build a simple header or reuse existing if global.
      */}
            <div className="sticky top-0 z-50 border-b border-dark-charcoal/5 bg-rx-bg/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
                    <Link href="/" className="flex items-center gap-1.5 font-serif text-[22px] text-dark-charcoal">
                        <span className="font-normal">Legal</span>
                        <span className="italic text-rx-red">Network</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm font-medium text-dark-charcoal/60 hover:text-dark-charcoal">Ana Sayfaya Dön</Link>
                        <Button className="bg-dark-charcoal text-white rounded-lg px-4 py-2 text-xs font-medium">Profil Oluştur</Button>
                    </div>
                </div>
            </div>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden bg-white border-b border-dark-charcoal/5">
                    <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
                        <div className="max-w-3xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
                                <Globe className="h-3 w-3" />
                                Küresel Hukuk Ağı
                            </div>
                            <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-dark-charcoal md:text-6xl">
                                Sınırları aşan <span className="italic text-rx-red">hukuki işbirliği</span> platformu
                            </h1>
                            <p className="mt-6 max-w-xl text-lg text-dark-charcoal/60 leading-relaxed">
                                Dünyanın dört bir yanındaki meslektaşlarınızla bağlantı kurun, dava yönlendirin ve uluslararası hukuki sorunlarda işbirliği yapın.
                            </p>

                            <div className="mt-10 flex flex-col sm:flex-row gap-3 max-w-xl">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-charcoal/30" />
                                    <Input
                                        placeholder="Ülke, uzmanlık alanı veya avukat ismi ara..."
                                        className="pl-9 h-12 rounded-xl border-dark-charcoal/10 bg-white shadow-sm text-base"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button className="h-12 px-8 rounded-xl bg-dark-charcoal text-white shadow-md hover:bg-dark-charcoal/90">
                                    Meslektaş Bul
                                </Button>
                            </div>

                            <div className="mt-6 flex items-center gap-6 text-xs text-dark-charcoal/40 font-medium">
                                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Doğrulanmış Avukatlar</span>
                                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 150+ Ülke</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Resmi İşbirliği</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Featured Profiles */}
                <section className="bg-rx-bg py-16 md:py-24 px-5 md:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <h2 className="font-serif text-2xl text-dark-charcoal md:text-3xl">Öne Çıkan Meslektaşlar</h2>
                                <p className="mt-2 text-dark-charcoal/50 text-sm">Bölgenizdeki veya ilgi alanlarınızdaki uzmanlar</p>
                            </div>
                            <Link href="#" className="hidden sm:flex items-center gap-1 text-sm font-medium text-dark-charcoal/60 hover:text-dark-charcoal transition-colors">
                                Tümünü Gör <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {MOCK_LAWYERS.map((lawyer) => (
                                <div key={lawyer.id} className="group flex flex-col rounded-2xl border border-dark-charcoal/5 bg-white p-5 transition-all hover:border-dark-charcoal/15 hover:shadow-lg hover:shadow-dark-charcoal/[0.03]">
                                    <div className="mb-4 flex items-start justify-between">
                                        <div className="h-14 w-14 rounded-xl bg-dark-charcoal/[0.04] flex items-center justify-center text-lg font-serif font-bold text-dark-charcoal">
                                            {lawyer.image}
                                        </div>
                                        {lawyer.verified && (
                                            <div className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-100 flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3" /> Verified
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <h3 className="font-serif text-lg text-dark-charcoal group-hover:text-rx-red transition-colors">{lawyer.name}</h3>
                                        <p className="text-xs font-medium text-dark-charcoal/60 mb-1">{lawyer.title}</p>
                                        <div className="flex items-center gap-1 text-xs text-dark-charcoal/40 mb-3">
                                            <Building2 className="h-3 w-3" /> {lawyer.firm}
                                        </div>

                                        <div className="flex items-center gap-1 text-xs text-dark-charcoal/50 mb-4">
                                            <MapPin className="h-3.5 w-3.5 text-dark-charcoal/30" />
                                            {lawyer.location}
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {lawyer.expertise.map((exp, i) => (
                                                <span key={i} className="px-2 py-1 rounded-md bg-dark-charcoal/[0.03] text-[10px] font-medium text-dark-charcoal/60">
                                                    {exp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-dark-charcoal/5 flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                            <span className="text-xs font-bold text-dark-charcoal">{lawyer.rating}</span>
                                            <span className="text-[10px] text-dark-charcoal/40">({lawyer.reviews})</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-dark-charcoal/5">
                                            Profili İncele
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features/Trust Section */}
                <section className="bg-white border-t border-dark-charcoal/5 py-20 px-5 md:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-12 md:grid-cols-3 text-center md:text-left">
                            <div className="space-y-4">
                                <div className="mx-auto md:mx-0 h-12 w-12 rounded-2xl bg-rx-red/[0.08] flex items-center justify-center text-rx-red">
                                    <Scale className="h-6 w-6" />
                                </div>
                                <h3 className="font-serif text-xl text-dark-charcoal">Güvenilir İş Yönlendirme</h3>
                                <p className="text-sm text-dark-charcoal/50 leading-relaxed">
                                    Yetki alanınız dışındaki davalar için güvenilir meslektaşlar bulun ve iş yönlendirmesi yapın. Komisyon oranlarını şeffaf bir şekilde yönetin.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="mx-auto md:mx-0 h-12 w-12 rounded-2xl bg-blue-600/[0.08] flex items-center justify-center text-blue-600">
                                    <MessageSquare className="h-6 w-6" />
                                </div>
                                <h3 className="font-serif text-xl text-dark-charcoal">Şifreli İletişim</h3>
                                <p className="text-sm text-dark-charcoal/50 leading-relaxed">
                                    Meslektaşlarınızla uçtan uca şifreli mesajlaşma altyapısı üzerinden dosya paylaşın ve iletişim kurun. Müvekkil gizliliğini koruyun.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="mx-auto md:mx-0 h-12 w-12 rounded-2xl bg-emerald-600/[0.08] flex items-center justify-center text-emerald-600">
                                    <Award className="h-6 w-6" />
                                </div>
                                <h3 className="font-serif text-xl text-dark-charcoal">Onaylı Uzmanlık</h3>
                                <p className="text-sm text-dark-charcoal/50 leading-relaxed">
                                    Platformdaki tüm avukatların baro kayıtları ve uzmanlık alanları doğrulanmıştır. İşbirliği yapacağınız kişinin yetkinliğinden emin olun.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-dark-charcoal py-16 px-5 md:px-8 text-white text-center">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="font-serif text-3xl md:text-4xl mb-4">Küresel Ağa Katılın</h2>
                        <p className="text-white/60 mb-8 font-light">
                            Sadece Türkiye'de değil, dünyada da hukuk ağınızı genişletin. Ücretsiz profilinizi oluşturun.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Button className="bg-white text-dark-charcoal hover:bg-gray-100 h-12 px-8 rounded-xl">
                                Hemen Üye Ol
                            </Button>
                            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8 rounded-xl">
                                Daha Fazla Bilgi
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-dark-charcoal/5 bg-rx-bg px-5 py-8">
                <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-dark-charcoal/30">© 2026 LegalPath Intl.</p>
                    <div className="flex gap-6 text-xs text-dark-charcoal/40">
                        <a href="#" className="hover:text-dark-charcoal">Kullanım Koşulları</a>
                        <a href="#" className="hover:text-dark-charcoal">Gizlilik Politikası</a>
                        <a href="#" className="hover:text-dark-charcoal">Topluluk Kuralları</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

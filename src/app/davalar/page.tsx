'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FolderOpen, Plus, Trash2, Edit3, Scale, Calendar, User, Users,
    ChevronRight, ArrowLeft, FileText, BookOpen, MessageSquare,
    Briefcase, Archive, CheckCircle, Clock, X, Save, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface DavaItem {
    id: string;
    dava_id: string;
    item_type: string; // 'karar' | 'belge' | 'not' | 'mevzuat'
    title: string;
    content: string;
    reference_id: string;
    reference_url: string;
    created_at: string;
}

interface Dava {
    id: string;
    title: string;
    description: string;
    status: string;
    court: string;
    case_no: string;
    client_name: string;
    opponent_name: string;
    case_type: string;
    created_at: string;
    updated_at: string;
    item_count?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
    aktif: { label: 'Aktif', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Clock },
    beklemede: { label: 'Beklemede', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
    tamamlandi: { label: 'Tamamlandı', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle },
    arsiv: { label: 'Arşiv', color: 'text-dark-charcoal/50 bg-dark-charcoal/5 border-dark-charcoal/10', icon: Archive },
};

const CASE_TYPES = [
    'İş Hukuku', 'Aile Hukuku', 'Ceza Hukuku', 'Ticaret Hukuku',
    'İdare Hukuku', 'Gayrimenkul', 'Tüketici Hukuku', 'İcra & İflas', 'Diğer'
];

const ITEM_TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
    karar: { label: 'Emsal Karar', icon: Scale, color: 'text-rx-red bg-rx-red/5' },
    belge: { label: 'Belge', icon: FileText, color: 'text-blue-600 bg-blue-50' },
    not: { label: 'Not', icon: Edit3, color: 'text-amber-600 bg-amber-50' },
    mevzuat: { label: 'Mevzuat', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
};

export default function DavalarPage() {
    const [davalar, setDavalar] = useState<Dava[]>([]);
    const [selectedDava, setSelectedDava] = useState<Dava | null>(null);
    const [davaItems, setDavaItems] = useState<DavaItem[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(false);

    // Create form
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCourt, setNewCourt] = useState('');
    const [newCaseNo, setNewCaseNo] = useState('');
    const [newClient, setNewClient] = useState('');
    const [newOpponent, setNewOpponent] = useState('');
    const [newCaseType, setNewCaseType] = useState('');

    // Add item form
    const [itemType, setItemType] = useState('not');
    const [itemTitle, setItemTitle] = useState('');
    const [itemContent, setItemContent] = useState('');
    const [itemRefUrl, setItemRefUrl] = useState('');

    const loadDavalar = useCallback(async () => {
        try {
            const url = filterStatus ? `/api/davalar?status=${filterStatus}` : '/api/davalar';
            const res = await fetch(url);
            const data = await res.json();
            setDavalar(data.davalar || []);
        } catch (e) {
            console.error('Failed to load davalar:', e);
        }
    }, [filterStatus]);

    const loadDavaDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/davalar/${id}`);
            const data = await res.json();
            setSelectedDava(data.dava);
            setDavaItems(data.items || []);
        } catch (e) {
            console.error('Failed to load dava details:', e);
        }
    };

    const createDava = async () => {
        if (!newTitle.trim()) return;
        setLoading(true);
        try {
            await fetch('/api/davalar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle, description: newDesc, court: newCourt,
                    case_no: newCaseNo, client_name: newClient,
                    opponent_name: newOpponent, case_type: newCaseType,
                }),
            });
            setShowCreateModal(false);
            setNewTitle(''); setNewDesc(''); setNewCourt(''); setNewCaseNo('');
            setNewClient(''); setNewOpponent(''); setNewCaseType('');
            loadDavalar();
        } catch (e) {
            console.error('Failed to create dava:', e);
        } finally {
            setLoading(false);
        }
    };

    const deleteDava = async (id: string) => {
        if (!confirm('Bu davayı ve tüm ilişkili öğeleri silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`/api/davalar/${id}`, { method: 'DELETE' });
            if (selectedDava?.id === id) {
                setSelectedDava(null);
                setDavaItems([]);
            }
            loadDavalar();
        } catch (e) {
            console.error('Failed to delete dava:', e);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await fetch(`/api/davalar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            loadDavalar();
            if (selectedDava?.id === id) loadDavaDetails(id);
        } catch (e) {
            console.error('Failed to update status:', e);
        }
    };

    const addItem = async () => {
        if (!selectedDava || !itemTitle.trim()) return;
        setLoading(true);
        try {
            await fetch(`/api/davalar/${selectedDava.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    addItem: {
                        item_type: itemType, title: itemTitle,
                        content: itemContent, reference_url: itemRefUrl,
                    }
                }),
            });
            setShowAddItemModal(false);
            setItemTitle(''); setItemContent(''); setItemRefUrl(''); setItemType('not');
            loadDavaDetails(selectedDava.id);
            loadDavalar();
        } catch (e) {
            console.error('Failed to add item:', e);
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (itemId: string) => {
        if (!selectedDava) return;
        try {
            await fetch(`/api/davalar/${selectedDava.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removeItemId: itemId }),
            });
            loadDavaDetails(selectedDava.id);
            loadDavalar();
        } catch (e) {
            console.error('Failed to remove item:', e);
        }
    };

    useEffect(() => { loadDavalar(); }, [loadDavalar]);

    return (
        <div className="min-h-screen bg-rx-bg">
            {/* Header */}
            <div className="sticky top-0 z-50 border-b border-dark-charcoal/5 bg-rx-bg/80 backdrop-blur-xl">
                <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5 md:px-8">
                    <Link href="/" className="flex items-center gap-1.5 text-dark-charcoal/50 hover:text-dark-charcoal transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="h-4 w-px bg-dark-charcoal/10" />
                    <Link href="/" className="font-serif text-base text-dark-charcoal/70 hover:text-dark-charcoal transition-colors">
                        Legal<span className="italic text-rx-red/70">Path</span>
                    </Link>
                    <div className="h-4 w-px bg-dark-charcoal/10" />
                    <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-dark-charcoal/50" />
                        <span className="text-sm font-medium text-dark-charcoal">Dava Yönetimi</span>
                    </div>
                    <div className="flex-1" />
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white border border-dark-charcoal/10 hover:bg-gray-50 text-dark-charcoal rounded-lg px-4 h-9 text-xs font-medium gap-1.5 shadow-sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Yeni Dava
                    </Button>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-5 md:px-8 py-8">
                {/* Status Filter */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
                    {[
                        { id: '', label: 'Tümü' },
                        { id: 'aktif', label: 'Aktif' },
                        { id: 'beklemede', label: 'Beklemede' },
                        { id: 'tamamlandi', label: 'Tamamlandı' },
                        { id: 'arsiv', label: 'Arşiv' },
                    ].map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setFilterStatus(s.id); setSelectedDava(null); }}
                            className={cn(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
                                filterStatus === s.id
                                    ? "bg-dark-charcoal/[0.06] text-dark-charcoal border-dark-charcoal/20"
                                    : "bg-white text-dark-charcoal border-dark-charcoal/10 hover:border-dark-charcoal/20"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-6">
                    {/* Left: Case List */}
                    <div className={cn("space-y-3 transition-all", selectedDava ? "w-[360px] flex-shrink-0" : "flex-1")}>
                        {davalar.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-dark-charcoal/10 rounded-2xl bg-white/50">
                                <FolderOpen className="h-12 w-12 text-dark-charcoal/20 mx-auto mb-4" />
                                <p className="text-dark-charcoal/50 font-medium">Henüz dava dosyası yok</p>
                                <p className="text-dark-charcoal/30 text-sm mt-1">Yeni bir dava ekleyerek başlayın</p>
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-4 bg-dark-charcoal text-white rounded-lg px-4 h-9 text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Yeni Dava
                                </Button>
                            </div>
                        ) : (
                            davalar.map(d => {
                                const statusInfo = STATUS_MAP[d.status] || STATUS_MAP.aktif;
                                const StatusIcon = statusInfo.icon;
                                return (
                                    <div
                                        key={d.id}
                                        onClick={() => loadDavaDetails(d.id)}
                                        className={cn(
                                            "group bg-white border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md",
                                            selectedDava?.id === d.id
                                                ? "border-dark-charcoal/20 shadow-md"
                                                : "border-dark-charcoal/5 hover:border-dark-charcoal/15"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-serif text-base text-dark-charcoal truncate">{d.title}</h3>
                                                {d.case_no && (
                                                    <p className="text-xs text-dark-charcoal/40 mt-0.5">{d.case_no}</p>
                                                )}
                                            </div>
                                            <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold", statusInfo.color)}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusInfo.label}
                                            </div>
                                        </div>

                                        {d.description && (
                                            <p className="text-xs text-dark-charcoal/50 line-clamp-2 mb-3">{d.description}</p>
                                        )}

                                        <div className="flex items-center gap-4 text-[10px] text-dark-charcoal/40">
                                            {d.case_type && (
                                                <span className="bg-dark-charcoal/[0.04] px-2 py-0.5 rounded font-medium">{d.case_type}</span>
                                            )}
                                            {d.client_name && (
                                                <span className="flex items-center gap-1"><User className="h-3 w-3" />{d.client_name}</span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <FolderOpen className="h-3 w-3" />{d.item_count || 0} öğe
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />{new Date(d.created_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Right: Case Detail */}
                    {selectedDava && (
                        <div className="flex-1 min-w-0">
                            <div className="bg-white border border-dark-charcoal/5 rounded-2xl overflow-hidden">
                                {/* Detail Header */}
                                <div className="p-6 border-b border-dark-charcoal/5">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <h2 className="font-serif text-2xl text-dark-charcoal">{selectedDava.title}</h2>
                                            {selectedDava.case_no && (
                                                <p className="text-sm text-dark-charcoal/50 mt-1">{selectedDava.case_no}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={selectedDava.status}
                                                onChange={(e) => updateStatus(selectedDava.id, e.target.value)}
                                                className="text-xs font-medium bg-dark-charcoal/[0.04] border border-dark-charcoal/10 rounded-lg px-3 py-2 text-dark-charcoal"
                                            >
                                                <option value="aktif">Aktif</option>
                                                <option value="beklemede">Beklemede</option>
                                                <option value="tamamlandi">Tamamlandı</option>
                                                <option value="arsiv">Arşiv</option>
                                            </select>
                                            <button
                                                onClick={() => deleteDava(selectedDava.id)}
                                                className="h-9 w-9 flex items-center justify-center rounded-lg text-dark-charcoal/30 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {selectedDava.description && (
                                        <p className="text-sm text-dark-charcoal/60 mb-4">{selectedDava.description}</p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-dark-charcoal/50">
                                        {selectedDava.case_type && (
                                            <span className="bg-dark-charcoal/[0.04] px-2.5 py-1 rounded-lg font-medium">{selectedDava.case_type}</span>
                                        )}
                                        {selectedDava.court && (
                                            <span className="flex items-center gap-1"><Scale className="h-3.5 w-3.5" />{selectedDava.court}</span>
                                        )}
                                        {selectedDava.client_name && (
                                            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />Müvekkil: {selectedDava.client_name}</span>
                                        )}
                                        {selectedDava.opponent_name && (
                                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Karşı taraf: {selectedDava.opponent_name}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-dark-charcoal">Dosya İçeriği</h3>
                                        <Button
                                            onClick={() => setShowAddItemModal(true)}
                                            variant="outline"
                                            className="h-8 text-xs rounded-lg border-dark-charcoal/10 gap-1.5"
                                        >
                                            <Plus className="h-3 w-3" />
                                            Öğe Ekle
                                        </Button>
                                    </div>

                                    {davaItems.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-dark-charcoal/10 rounded-xl">
                                            <p className="text-dark-charcoal/40 text-sm">Henüz öğe eklenmemiş</p>
                                            <p className="text-dark-charcoal/25 text-xs mt-1">Karar, belge, not veya mevzuat ekleyebilirsiniz</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {davaItems.map(item => {
                                                const typeInfo = ITEM_TYPE_MAP[item.item_type] || ITEM_TYPE_MAP.not;
                                                const Icon = typeInfo.icon;
                                                return (
                                                    <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-dark-charcoal/5 hover:border-dark-charcoal/10 transition-colors group">
                                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", typeInfo.color)}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-dark-charcoal truncate">{item.title}</span>
                                                                <span className="text-[10px] text-dark-charcoal/30 font-medium">{typeInfo.label}</span>
                                                            </div>
                                                            {item.content && (
                                                                <p className="text-xs text-dark-charcoal/50 mt-1 line-clamp-2">{item.content}</p>
                                                            )}
                                                            {item.reference_url && (
                                                                <a href={item.reference_url} target="_blank" className="inline-flex items-center gap-1 text-xs text-rx-red hover:text-rx-red/80 mt-1">
                                                                    <ExternalLink className="h-3 w-3" />Referansa git
                                                                </a>
                                                            )}
                                                            <p className="text-[10px] text-dark-charcoal/25 mt-1">
                                                                {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                                            className="h-7 w-7 flex items-center justify-center rounded-lg text-dark-charcoal/20 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Quick action links */}
                                    <div className="mt-6 flex flex-wrap gap-2">
                                        <Link href="/search" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-charcoal/[0.03] text-xs text-dark-charcoal/60 hover:bg-dark-charcoal/[0.06] transition-colors">
                                            <Scale className="h-3.5 w-3.5" />Karar Ara
                                        </Link>
                                        <Link href="/belge-yazim" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-charcoal/[0.03] text-xs text-dark-charcoal/60 hover:bg-dark-charcoal/[0.06] transition-colors">
                                            <FileText className="h-3.5 w-3.5" />Belge Oluştur
                                        </Link>
                                        <Link href="/asistan" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-charcoal/[0.03] text-xs text-dark-charcoal/60 hover:bg-dark-charcoal/[0.06] transition-colors">
                                            <MessageSquare className="h-3.5 w-3.5" />AI Asistan
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] bg-dark-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-dark-charcoal/5">
                            <h3 className="font-serif text-lg text-dark-charcoal">Yeni Dava Dosyası</h3>
                            <button onClick={() => setShowCreateModal(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-dark-charcoal/5"><X className="h-4 w-4 text-dark-charcoal/50" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Dava Başlığı *</label>
                                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Örn: Müvekkil A - İş Davası" className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm focus:outline-none focus:border-dark-charcoal/20" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Açıklama</label>
                                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Kısa açıklama..." className="min-h-[80px] text-sm border-dark-charcoal/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Dava Türü</label>
                                    <select value={newCaseType} onChange={e => setNewCaseType(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm">
                                        <option value="">Seçin...</option>
                                        {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Esas No</label>
                                    <input value={newCaseNo} onChange={e => setNewCaseNo(e.target.value)} placeholder="2024/1234" className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Mahkeme</label>
                                    <input value={newCourt} onChange={e => setNewCourt(e.target.value)} placeholder="İstanbul 3. İş Mah." className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Müvekkil</label>
                                    <input value={newClient} onChange={e => setNewClient(e.target.value)} placeholder="Ad Soyad" className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Karşı Taraf</label>
                                <input value={newOpponent} onChange={e => setNewOpponent(e.target.value)} placeholder="Ad Soyad / Şirket" className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-dark-charcoal/5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-lg h-9 text-xs text-dark-charcoal border-dark-charcoal/10 hover:bg-gray-50">İptal</Button>
                            <Button onClick={createDava} disabled={!newTitle.trim() || loading} className="bg-white border border-dark-charcoal/10 hover:bg-gray-50 text-dark-charcoal rounded-lg h-9 text-xs gap-1.5 shadow-sm">
                                <Save className="h-3.5 w-3.5" />Oluştur
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItemModal && selectedDava && (
                <div className="fixed inset-0 z-[60] bg-dark-charcoal/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddItemModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-dark-charcoal/5">
                            <h3 className="font-serif text-lg text-dark-charcoal">Öğe Ekle</h3>
                            <button onClick={() => setShowAddItemModal(false)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-dark-charcoal/5"><X className="h-4 w-4 text-dark-charcoal/50" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Öğe Türü</label>
                                <div className="flex gap-2">
                                    {Object.entries(ITEM_TYPE_MAP).map(([key, info]) => {
                                        const Icon = info.icon;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setItemType(key)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                                                    itemType === key
                                                        ? "border-dark-charcoal/20 bg-dark-charcoal/[0.04] text-dark-charcoal"
                                                        : "border-dark-charcoal/5 text-dark-charcoal/50 hover:border-dark-charcoal/10"
                                                )}
                                            >
                                                <Icon className="h-3.5 w-3.5" />{info.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Başlık *</label>
                                <input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="Öğe başlığı..." className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">İçerik / Not</label>
                                <Textarea value={itemContent} onChange={e => setItemContent(e.target.value)} placeholder="Detaylar..." className="min-h-[100px] text-sm border-dark-charcoal/10" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-dark-charcoal/60 mb-1.5 block">Referans URL (Opsiyonel)</label>
                                <input value={itemRefUrl} onChange={e => setItemRefUrl(e.target.value)} placeholder="/karar/123 veya URL" className="w-full px-3 py-2.5 rounded-lg border border-dark-charcoal/10 text-sm" />
                            </div>
                        </div>
                        <div className="p-5 border-t border-dark-charcoal/5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowAddItemModal(false)} className="rounded-lg h-9 text-xs text-dark-charcoal border-dark-charcoal/10 hover:bg-gray-50">İptal</Button>
                            <Button onClick={addItem} disabled={!itemTitle.trim() || loading} className="bg-white border border-dark-charcoal/10 hover:bg-gray-50 text-dark-charcoal rounded-lg h-9 text-xs gap-1.5 shadow-sm">
                                <Plus className="h-3.5 w-3.5" />Ekle
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

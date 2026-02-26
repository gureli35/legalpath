'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Send, User, Paperclip, Scale, Loader2, Bot, Copy, Check, History, Plus, Trash2, ChevronLeft, ChevronRight, MessageSquare, PanelLeftClose, PanelLeft, MoreHorizontal, Pencil, Search } from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface Conversation {
    id: string;
    title: string;
    created_at: string;
    message_count?: number;
}

export default function AsistanHizliPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const handleCopy = async (text: string, messageId: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(messageId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const loadConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            setConversations(data.conversations || []);
        } catch (e) {
            console.error('Failed to load conversations:', e);
        }
    }, []);

    const isLoadingHistoryRef = useRef(false);

    const loadConversation = async (id: string) => {
        try {
            isLoadingHistoryRef.current = true;
            const res = await fetch(`/api/conversations/${id}`);
            const data = await res.json();
            setMessages(data.messages || []);
            setCurrentConversationId(id);
        } catch (e) {
            console.error('Failed to load conversation:', e);
        }
    };

    const saveConversation = async (msgs: any[]) => {
        if (msgs.length < 2) return;
        const title = msgs[0]?.content?.substring(0, 50) || 'Yeni Sohbet';
        try {
            if (currentConversationId) {
                await fetch(`/api/conversations/${currentConversationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: msgs.slice(-2) })
                });
            } else {
                const res = await fetch('/api/conversations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, messages: msgs })
                });
                const data = await res.json();
                setCurrentConversationId(data.id);
            }
            loadConversations();
        } catch (e) {
            console.error('Failed to save conversation:', e);
        }
    };

    const deleteConversation = async (id: string) => {
        try {
            await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            loadConversations();
            if (currentConversationId === id) {
                setMessages([]);
                setCurrentConversationId(null);
            }
        } catch (e) {
            console.error('Failed to delete conversation:', e);
        }
    };

    const startNewConversation = () => {
        setMessages([]);
        setCurrentConversationId(null);
    };

    // Rename conversation
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    const startRename = (conv: Conversation) => {
        setEditingId(conv.id);
        setEditingTitle(conv.title);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const submitRename = async () => {
        if (!editingId || !editingTitle.trim()) { setEditingId(null); return; }
        try {
            await fetch(`/api/conversations/${editingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editingTitle.trim() })
            });
            loadConversations();
        } catch (e) {
            console.error('Rename failed:', e);
        }
        setEditingId(null);
    };

    // Group conversations by date (ChatGPT style)
    const groupedConversations = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 86400000);
        const week = new Date(today.getTime() - 7 * 86400000);
        const month = new Date(today.getTime() - 30 * 86400000);

        const groups: { label: string; items: Conversation[] }[] = [
            { label: 'Bugün', items: [] },
            { label: 'Dün', items: [] },
            { label: 'Önceki 7 Gün', items: [] },
            { label: 'Önceki 30 Gün', items: [] },
            { label: 'Daha Eski', items: [] },
        ];

        for (const c of conversations) {
            const d = new Date(c.created_at);
            if (d >= today) groups[0].items.push(c);
            else if (d >= yesterday) groups[1].items.push(c);
            else if (d >= week) groups[2].items.push(c);
            else if (d >= month) groups[3].items.push(c);
            else groups[4].items.push(c);
        }

        return groups.filter(g => g.items.length > 0);
    }, [conversations]);

    // Context menu
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);
    const contextRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
                setContextMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* ─── Markdown Renderer ─── */

    // Parse [KARAR:id:source:label] references and fallback case number links
    const parseKararRefs = (text: string, keyPrefix: string): React.ReactNode[] => {
        const kararRefRegex = /\[KARAR:([^:\]]+):([^:\]]+):([^\]]+)\]/g;
        const caseRegex = /(\d{1,2}\.\s*(?:CD|HD|Ceza Dairesi|Hukuk Dairesi)\s*)?(\d{4}\/\d+)\s*E\.?,?\s*(\d{4}\/\d+)\s*K\.?/gi;

        const allMatches: { index: number; length: number; node: React.ReactNode }[] = [];
        let match;

        while ((match = kararRefRegex.exec(text)) !== null) {
            allMatches.push({
                index: match.index,
                length: match[0].length,
                node: (
                    <a
                        key={`${keyPrefix}-kr-${match.index}`}
                        href={`/karar/${match[1]}?source=${match[2]}`}
                        className="inline-flex items-center gap-1 text-rx-red hover:text-rx-red/80 underline underline-offset-2 font-medium bg-rx-red/5 px-1.5 py-0.5 rounded transition-colors"
                        target="_blank"
                    >
                        ⚖️ {match[3]}
                    </a>
                )
            });
        }

        while ((match = caseRegex.exec(text)) !== null) {
            const overlaps = allMatches.some(m => match!.index >= m.index && match!.index < m.index + m.length);
            if (overlaps) continue;
            const fullMatch = match[0];
            const searchQuery = encodeURIComponent(`${match[2]} ${match[3]}`);
            allMatches.push({
                index: match.index,
                length: fullMatch.length,
                node: (
                    <a
                        key={`${keyPrefix}-c-${match.index}`}
                        href={`/search?q=${searchQuery}`}
                        className="text-rx-red hover:text-rx-red/80 underline underline-offset-2 font-medium transition-colors"
                        target="_blank"
                    >
                        {fullMatch}
                    </a>
                )
            });
        }

        allMatches.sort((a, b) => a.index - b.index);
        const nodes: React.ReactNode[] = [];
        let lastIndex = 0;
        for (const m of allMatches) {
            if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
            nodes.push(m.node);
            lastIndex = m.index + m.length;
        }
        if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
        return nodes.length > 0 ? nodes : [text];
    };

    const parseInline = (text: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        const boldSplit = text.split(/(\*\*.*?\*\*)/g);
        boldSplit.forEach((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const content = part.slice(2, -2);
                parts.push(<strong key={`b${i}`} className="font-semibold text-dark-charcoal">{parseKararRefs(content, `bi${i}`)}</strong>);
            } else if (part) {
                parts.push(<span key={`t${i}`}>{parseKararRefs(part, `ti${i}`)}</span>);
            }
        });
        return parts;
    };

    const linkifyContent = (content: string) => {
        if (!content) return null;

        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let inDilekce = false;
        let dilekceLines: string[] = [];

        const flushDilekce = () => {
            if (dilekceLines.length > 0) {
                elements.push(
                    <div key={`dilekce-${elements.length}`} className="my-4 rounded-xl border-2 border-dashed border-dark-charcoal/20 bg-dark-charcoal/[0.02] p-5">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-dark-charcoal/40">
                            <Scale className="h-3.5 w-3.5" />
                            Dilekçe Taslağı
                        </div>
                        <div className="space-y-1 font-serif text-[13px] leading-relaxed text-dark-charcoal/80">
                            {dilekceLines.map((l, i) => (
                                l.trim() === '' ? <div key={i} className="h-3" /> : <p key={i}>{parseInline(l)}</p>
                            ))}
                        </div>
                    </div>
                );
                dilekceLines = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Dilekçe block detection
            if (/^---\s*DİLEKÇE\s*BAŞLANGIÇ\s*---$/i.test(trimmed)) {
                inDilekce = true;
                continue;
            }
            if (/^---\s*DİLEKÇE\s*BİTİŞ\s*---$/i.test(trimmed)) {
                inDilekce = false;
                flushDilekce();
                continue;
            }
            if (inDilekce) {
                dilekceLines.push(line);
                continue;
            }

            // Horizontal rule ---
            if (/^---+$/.test(trimmed)) {
                elements.push(<hr key={`hr-${i}`} className="my-4 border-dark-charcoal/10" />);
                continue;
            }

            // ## Header
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h3 key={`h-${i}`} className="mt-6 mb-2 text-[15px] font-bold tracking-tight text-dark-charcoal flex items-center gap-2">
                        {parseInline(trimmed.slice(3))}
                    </h3>
                );
                continue;
            }

            // Bullet list: * or -
            if (/^[*\-]\s/.test(trimmed)) {
                elements.push(
                    <div key={`li-${i}`} className="flex items-start gap-2.5 py-0.5 pl-1">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-dark-charcoal/30" />
                        <span className="flex-1 text-[13.5px] leading-relaxed">{parseInline(trimmed.slice(2))}</span>
                    </div>
                );
                continue;
            }

            // Numbered list: 1. 2. 3.
            if (/^\d+\.\s/.test(trimmed)) {
                const dotIdx = trimmed.indexOf('.');
                const num = trimmed.slice(0, dotIdx);
                const rest = trimmed.slice(dotIdx + 1).trim();
                elements.push(
                    <div key={`ol-${i}`} className="flex items-start gap-2.5 py-0.5 pl-1">
                        <span className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-dark-charcoal/[0.07] text-[10px] font-bold text-dark-charcoal/60">{num}</span>
                        <span className="flex-1 text-[13.5px] leading-relaxed">{parseInline(rest)}</span>
                    </div>
                );
                continue;
            }

            // Empty line → spacer
            if (trimmed === '') {
                elements.push(<div key={`sp-${i}`} className="h-2" />);
                continue;
            }

            // Normal paragraph
            elements.push(
                <p key={`p-${i}`} className="text-[13.5px] leading-relaxed">{parseInline(trimmed)}</p>
            );
        }

        // Flush any unclosed dilekce
        if (inDilekce) flushDilekce();

        return elements;
    };

    /* ─── Lifecycle ─── */

    useEffect(() => { loadConversations(); }, [loadConversations]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    const scrollToTop = () => {
        messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    useEffect(() => {
        if (isLoadingHistoryRef.current) {
            isLoadingHistoryRef.current = false;
            scrollToTop();
        } else {
            scrollToBottom();
        }
    }, [messages]);

    const handleManualSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMessage] })
            });
            if (!response.ok) throw new Error(response.statusText);

            const assistantMessageId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) return;

            let gatheredContent = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const chunkLines = chunk.split('\n');
                for (const cl of chunkLines) {
                    if (cl.startsWith('0:')) {
                        try { gatheredContent += JSON.parse(cl.substring(2)); } catch { }
                    } else if (cl.trim() !== '' && !/^\d+:/.test(cl)) {
                        gatheredContent += cl;
                    }
                }
                setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: gatheredContent } : m));
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' }]);
        } finally {
            setIsLoading(false);
            setTimeout(() => { setMessages(cur => { saveConversation(cur); return cur; }); }, 100);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Dosya yükleme başarısız');
            const data = await response.json();
            setInput(`Şu belgeyi analiz et ve hukuki durumu değerlendir:\n\n---\n${data.text}\n---\n\n`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Dosya yüklenirken bir hata oluştu.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /* ─── Render ─── */

    return (
        <div className="flex h-screen overflow-hidden relative">

            {/* ── Overlay (mobile sidebar open) ── */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-dark-charcoal/20 backdrop-blur-[2px] md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ══════ ChatGPT-Style Sidebar ══════ */}
            <aside
                className={cn(
                    "fixed md:relative z-40 h-full flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    "bg-rx-bg border-r border-dark-charcoal/8 text-dark-charcoal/70",
                    "w-[260px]",
                    sidebarOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0 md:w-0 md:min-w-0 md:overflow-hidden"
                )}
            >
                {/* Sidebar Header */}
                <div className="flex items-center gap-2 p-2 h-[52px] flex-shrink-0">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-dark-charcoal/[0.06] transition-colors"
                        title="Kenar çubuğunu kapat"
                    >
                        <PanelLeftClose className="h-5 w-5 text-dark-charcoal/50" />
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={startNewConversation}
                        className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-dark-charcoal/[0.06] transition-colors"
                        title="Yeni sohbet"
                    >
                        <Plus className="h-5 w-5 text-dark-charcoal/50" />
                    </button>
                    <button
                        onClick={() => {/* future: search conversations */}}
                        className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-dark-charcoal/[0.06] transition-colors"
                        title="Sohbetlerde ara"
                    >
                        <Search className="h-5 w-5 text-dark-charcoal/50" />
                    </button>
                </div>

                {/* Conversation List */}
                <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 scrollbar-thin">
                    {conversations.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            <p className="text-dark-charcoal/30 text-xs">Henüz sohbet yok</p>
                            <p className="text-dark-charcoal/20 text-[11px] mt-1">Bir soru sorarak başlayın</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {groupedConversations.map((group) => (
                                <div key={group.label}>
                                    <p className="px-2 mb-1.5 text-[11px] font-semibold text-dark-charcoal/30 tracking-wide">
                                        {group.label}
                                    </p>
                                    <div className="space-y-0.5">
                                        {group.items.map(c => (
                                            <div
                                                key={c.id}
                                                className="relative group"
                                            >
                                                {editingId === c.id ? (
                                                    <div className="flex items-center px-2 py-1.5 rounded-lg bg-dark-charcoal/[0.06]">
                                                        <input
                                                            ref={editInputRef}
                                                            value={editingTitle}
                                                            onChange={(e) => setEditingTitle(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') submitRename();
                                                                if (e.key === 'Escape') setEditingId(null);
                                                            }}
                                                            onBlur={() => submitRename()}
                                                            className="flex-1 bg-transparent text-[13px] text-dark-charcoal outline-none min-w-0"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => loadConversation(c.id)}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadConversation(c.id); }}
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13px] transition-colors relative cursor-pointer select-none",
                                                            currentConversationId === c.id
                                                                ? "bg-dark-charcoal/[0.08] text-dark-charcoal"
                                                                : "text-dark-charcoal/55 hover:bg-dark-charcoal/[0.05] hover:text-dark-charcoal/80"
                                                        )}
                                                    >
                                                        <span className="truncate flex-1 pr-6">{c.title}</span>

                                                        {/* Gradient fade for long titles */}
                                                        <span className={cn(
                                                            "absolute right-0 top-0 h-full w-12 rounded-r-lg pointer-events-none",
                                                            currentConversationId === c.id
                                                                ? "bg-gradient-to-l from-[#edebd9] via-[#edebd9]/80 to-transparent"
                                                                : "bg-gradient-to-l from-[#f7f5e9] to-transparent group-hover:from-[#f2f0de]"
                                                        )} />

                                                        {/* Hover actions */}
                                                        <div className={cn(
                                                            "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10",
                                                            "opacity-0 group-hover:opacity-100 transition-opacity"
                                                        )}>
                                                            {contextMenuId === c.id ? (
                                                                <div ref={contextRef} className="flex items-center gap-0.5 bg-white rounded-md p-0.5 border border-dark-charcoal/10 shadow-lg">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setContextMenuId(null); startRename(c); }}
                                                                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-dark-charcoal/[0.06] text-dark-charcoal/40 hover:text-dark-charcoal transition-colors"
                                                                        title="Yeniden Adlandır"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setContextMenuId(null); deleteConversation(c.id); }}
                                                                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/10 text-dark-charcoal/40 hover:text-red-500 transition-colors"
                                                                        title="Sil"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setContextMenuId(c.id); }}
                                                                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-dark-charcoal/[0.06] text-dark-charcoal/30 hover:text-dark-charcoal/60 transition-colors"
                                                                >
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className="flex-shrink-0 border-t border-dark-charcoal/8 p-2">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-dark-charcoal/[0.06] transition-colors text-dark-charcoal/40 hover:text-dark-charcoal/70"
                    >
                        <div className="h-7 w-7 rounded-full bg-dark-charcoal/[0.06] flex items-center justify-center flex-shrink-0">
                            <Scale className="h-3.5 w-3.5 text-dark-charcoal/50" />
                        </div>
                        <span className="text-[13px] font-medium">LegalPath Ana Sayfa</span>
                    </Link>
                </div>
            </aside>

            {/* ── Main Chat ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-rx-bg">

                {/* topbar */}
                <div className="flex items-center h-[52px] px-3 border-b border-dark-charcoal/5 flex-shrink-0 bg-rx-bg">
                    {/* Sidebar toggle — only visible when sidebar closed */}
                    {!sidebarOpen && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="h-10 w-10 flex items-center justify-center rounded-lg text-dark-charcoal/50 hover:text-dark-charcoal hover:bg-dark-charcoal/5 transition-colors"
                                title="Kenar çubuğunu aç"
                            >
                                <PanelLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={startNewConversation}
                                className="h-10 w-10 flex items-center justify-center rounded-lg text-dark-charcoal/50 hover:text-dark-charcoal hover:bg-dark-charcoal/5 transition-colors"
                                title="Yeni sohbet"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-sm font-medium text-dark-charcoal/70">
                            {currentConversationId 
                                ? (conversations.find(c => c.id === currentConversationId)?.title || 'Sohbet')
                                : 'LegalPath AI Asistan'}
                        </span>
                    </div>

                    {/* Right spacer to balance centered title */}
                    {!sidebarOpen && <div className="w-[88px]" />}
                </div>

                {/* messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 space-y-6">
                        {/* empty state */}
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="h-14 w-14 rounded-2xl bg-white border border-dark-charcoal/5 flex items-center justify-center shadow-sm mb-5">
                                    <Zap className="h-7 w-7 text-dark-charcoal/70" />
                                </div>
                                <h2 className="font-serif text-2xl md:text-3xl text-dark-charcoal mb-2">Size nasıl yardımcı olabilirim?</h2>
                                <p className="text-dark-charcoal/50 text-sm max-w-md">
                                    Hukuki sorular sorabilir, emsal karar arayabilir veya dilekçe taslağı oluşturabilirsiniz.
                                </p>
                            </div>
                        )}

                        {/* message list */}
                        {messages.map((m: any) => (
                            <div key={m.id} className={cn("flex gap-3", m.role === 'user' ? "justify-end" : "justify-start")}>
                                {/* avatar */}
                                {m.role !== 'user' && (
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div className="h-7 w-7 rounded-full bg-white border border-dark-charcoal/10 flex items-center justify-center shadow-sm">
                                            <Bot className="h-4 w-4 text-dark-charcoal/70" />
                                        </div>
                                    </div>
                                )}

                                {/* bubble */}
                                <div className={cn(
                                    "relative group min-w-0",
                                    m.role === 'user' ? "max-w-[85%] md:max-w-[70%]" : "max-w-full md:max-w-[90%]"
                                )}>
                                    <div className={cn(
                                        "rounded-2xl px-4 py-3 shadow-sm overflow-hidden",
                                        m.role === 'user'
                                            ? "bg-[#1a1a1a] rounded-br-sm"
                                            : "bg-white border border-dark-charcoal/8 rounded-bl-sm"
                                    )}>
                                        <div className={cn(
                                            "text-[13.5px] leading-relaxed break-words",
                                            m.role === 'user' ? "text-[#f0f0f0]" : "text-dark-charcoal/85"
                                        )}>
                                            {m.role === 'assistant' ? linkifyContent(m.content) : m.content}
                                        </div>
                                    </div>

                                    {/* copy btn */}
                                    {m.role === 'assistant' && m.content && (
                                        <button
                                            onClick={() => handleCopy(m.content, m.id)}
                                            className="absolute -bottom-5 right-1 flex items-center gap-1 text-[10px] text-dark-charcoal/30 hover:text-dark-charcoal/60 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Kopyala"
                                        >
                                            {copiedId === m.id ? (
                                                <><Check className="h-3 w-3 text-emerald-500" /> <span className="text-emerald-500">Kopyalandı</span></>
                                            ) : (
                                                <><Copy className="h-3 w-3" /> Kopyala</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* loading dots */}
                        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex gap-3 justify-start">
                                <div className="h-7 w-7 rounded-full bg-white border border-dark-charcoal/10 flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Bot className="h-4 w-4 text-dark-charcoal/70" />
                                </div>
                                <div className="bg-white border border-dark-charcoal/8 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} className="h-6" />
                    </div>
                </div>

                {/* ── Input bar ── */}
                <div className="flex-shrink-0 border-t border-dark-charcoal/8 bg-rx-bg p-3 md:p-4">
                    <div className="mx-auto max-w-3xl">
                        <form
                            onSubmit={handleManualSubmit}
                            className="relative flex items-end gap-1.5 bg-white border border-dark-charcoal/10 rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-dark-charcoal/5 transition-shadow"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf,.txt,.md" className="hidden" />

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 flex-shrink-0 rounded-xl text-dark-charcoal/40 hover:text-dark-charcoal hover:bg-dark-charcoal/5"
                                disabled={isUploading}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            </Button>

                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleManualSubmit(); }
                                }}
                                placeholder={isUploading ? "Dosya analizi yapılıyor..." : "Hukuki sorunuzu yazın..."}
                                className="flex-1 min-h-[40px] max-h-[160px] py-2.5 px-2 bg-transparent border-0 focus-visible:ring-0 resize-none text-dark-charcoal placeholder:text-dark-charcoal/30 text-sm leading-relaxed"
                                rows={1}
                            />

                            <Button
                                type="submit"
                                size="icon"
                                disabled={isLoading || isUploading || !input.trim()}
                                className={cn(
                                    "h-9 w-9 flex-shrink-0 rounded-xl transition-all",
                                    input.trim()
                                        ? "bg-dark-charcoal text-white hover:bg-dark-charcoal/90"
                                        : "bg-dark-charcoal/5 text-dark-charcoal/20"
                                )}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                        <p className="text-center text-[10px] text-dark-charcoal/25 mt-2.5 font-medium">
                            LegalPath, hukuki tavsiye yerine geçmez. Resmi kaynaklardan teyit ediniz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

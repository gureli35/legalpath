'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Mic, Square, Save, RotateCcw,
    MessageSquare, AlertTriangle, FileText,
    CheckCircle2, Brain, Bot, User,
    ChevronRight, ArrowRight, Play, Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock AI Suggestions
const MOCK_SUGGESTIONS = [
    {
        id: 1,
        type: 'question',
        content: 'Müvekkile sor: Ayrılık tarihi tam olarak ne zaman?',
        trigger: 'boşanma'
    },
    {
        id: 2,
        type: 'risk',
        content: 'Dikkat: Zina davası için 6 aylık hak düşürücü süre riski var.',
        trigger: 'zina'
    },
    {
        id: 3,
        type: 'document',
        content: 'İstenmesi gereken belge: Otel kayıtları ve HTS dökümleri.',
        trigger: 'delil'
    }
];

// Mock Transcript Segments for Simulation
const MOCK_TRANSCRIPT_FLOW = [
    { role: 'lawyer', text: 'Hoş geldiniz, bugün size nasıl yardımcı olabilirim?' },
    { role: 'client', text: 'Merhaba avukat bey, eşimle boşanma sürecindeyiz ve beni aldattığını düşünüyorum.' },
    { role: 'lawyer', text: 'Anlıyorum, bu zor bir süreç. Aldatma şüphenizi destekleyen somut delilleriniz var mı?' },
    { role: 'client', text: 'Evet, bazı otel kayıtları buldum ve gece geç saatlerde yapılan mesajlaşmalar var.' },
    { role: 'lawyer', text: 'Bu kayıtlar çok önemli olabilir. Peki ayrılık fiilen ne zaman başladı?' },
    { role: 'client', text: 'Yaklaşık 3 ay önce evi terk etti.' }
];

export default function OnGorusmePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<{ role: string, text: string }[]>([]);
    const [suggestions, setSuggestions] = useState<typeof MOCK_SUGGESTIONS>([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const flowIndexRef = useRef(0);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);

                // Simulate transcript flow
                if (elapsedTime % 3 === 0 && flowIndexRef.current < MOCK_TRANSCRIPT_FLOW.length) {
                    const nextSegment = MOCK_TRANSCRIPT_FLOW[flowIndexRef.current];
                    setTranscript(prev => [...prev, nextSegment]);

                    // Trigger suggestions based on keywords
                    if (nextSegment.text.toLowerCase().includes('boşanma')) {
                        setSuggestions(prev => [...prev, MOCK_SUGGESTIONS[0]]);
                    }
                    if (nextSegment.text.toLowerCase().includes('aldattığını')) {
                        setSuggestions(prev => [...prev, MOCK_SUGGESTIONS[1]]);
                    }
                    if (nextSegment.text.toLowerCase().includes('kayıtları')) {
                        setSuggestions(prev => [...prev, MOCK_SUGGESTIONS[2]]);
                    }

                    flowIndexRef.current += 1;
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording, elapsedTime]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        setIsRecording(true);
        if (transcript.length === 0) {
            setTranscript([]);
            setSuggestions([]);
            flowIndexRef.current = 0;
            setElapsedTime(0);
        }
    };

    const handleStop = () => setIsRecording(false);

    const handleReset = () => {
        setIsRecording(false);
        setTranscript([]);
        setSuggestions([]);
        setElapsedTime(0);
        flowIndexRef.current = 0;
    };

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col bg-rx-bg overflow-hidden">

            {/* Header */}
            <header className="flex items-center justify-between border-b border-dark-charcoal/5 bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rx-red/[0.08] text-rx-red">
                        <Mic className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-serif font-medium text-dark-charcoal">Ön Görüşme Asistanı</h1>
                        <div className="flex items-center gap-2">
                            <span className={cn("flex h-2 w-2 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-dark-charcoal/20")} />
                            <p className="text-xs font-medium text-dark-charcoal/50">
                                {isRecording ? 'Kayıt Yapılıyor...' : 'Hazır'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="font-mono text-xl font-medium text-dark-charcoal">
                        {formatTime(elapsedTime)}
                    </div>
                    <div className="h-8 w-px bg-dark-charcoal/10" />
                    <div className="flex items-center gap-2">
                        {!isRecording ? (
                            <Button onClick={handleStart} className="bg-rx-red hover:bg-rx-red/90 text-white gap-2 rounded-lg">
                                <Mic className="h-4 w-4" /> Görüşmeyi Başlat
                            </Button>
                        ) : (
                            <Button onClick={handleStop} variant="outline" className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 gap-2 rounded-lg">
                                <Square className="h-4 w-4 fill-current" /> Durdur
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleReset} disabled={isRecording} title="Sıfırla">
                            <RotateCcw className="h-4 w-4 text-dark-charcoal/60" />
                        </Button>
                    </div>
                    <Button disabled={transcript.length === 0} className="bg-white border border-dark-charcoal/10 text-dark-charcoal hover:bg-gray-50 gap-2 rounded-lg shadow-sm">
                        <Save className="h-4 w-4" /> Notları Kaydet
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 overflow-hidden">

                {/* Left Panel: Real-time Transcript */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {transcript.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <div className="mb-4 rounded-full bg-dark-charcoal/5 p-6">
                                    <Mic className="h-8 w-8 text-dark-charcoal/40" />
                                </div>
                                <h3 className="text-lg font-medium text-dark-charcoal">Görüşme Kaydını Başlatın</h3>
                                <p className="mt-2 text-sm text-dark-charcoal/60 max-w-sm">
                                    Mikrofon butonuna basarak görüşmeyi başlatın. Yapay zeka konuşmaları anlık olarak metne dökecek ve analiz edecektir.
                                </p>
                            </div>
                        ) : (
                            transcript.map((segment, index) => (
                                <div key={index} className={cn(
                                    "flex w-full gap-4 animate-in fade-in slide-in-from-bottom-2",
                                    segment.role === 'lawyer' ? "justify-end" : "justify-start"
                                )}>
                                    <div className={cn(
                                        "flex max-w-[80%] flex-col rounded-2xl p-4 shadow-sm",
                                        segment.role === 'lawyer'
                                            ? "bg-gray-100 text-dark-charcoal rounded-tr-sm"
                                            : "bg-white border border-dark-charcoal/5 text-dark-charcoal rounded-tl-sm"
                                    )}>
                                        <span className={cn(
                                            "mb-1 text-[11px] font-bold uppercase tracking-wider",
                                            segment.role === 'lawyer' ? "text-dark-charcoal/60" : "text-rx-red font-extrabold"
                                        )}>
                                            {segment.role === 'lawyer' ? 'Avukat' : 'Müvekkil'}
                                        </span>
                                        <p className="text-sm leading-relaxed">{segment.text}</p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>

                {/* Right Panel: AI Assistant */}
                <div className="w-96 border-l border-dark-charcoal/5 bg-white flex flex-col shadow-lg">
                    <div className="border-b border-dark-charcoal/5 p-4 bg-rx-bg/30">
                        <div className="flex items-center gap-2 text-sm font-bold text-dark-charcoal">
                            <Brain className="h-4 w-4 text-rx-red" />
                            AI Analiz & Öneriler
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {suggestions.length === 0 ? (
                            <div className="mt-10 text-center text-xs text-dark-charcoal/40">
                                <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Konuşma analizi bekleniyor...</p>
                            </div>
                        ) : (
                            suggestions.map((suggestion) => (
                                <div key={suggestion.id} className="group relative overflow-hidden rounded-xl border border-dark-charcoal/10 bg-white p-4 shadow-sm transition-all hover:border-rx-red/30 hover:shadow-md animate-in zoom-in-95">
                                    <div className={cn(
                                        "absolute left-0 top-0 h-full w-1",
                                        suggestion.type === 'question' ? 'bg-blue-500' :
                                            suggestion.type === 'risk' ? 'bg-amber-500' : 'bg-emerald-500'
                                    )} />

                                    <div className="mb-2 flex items-center gap-2">
                                        {suggestion.type === 'question' && <MessageSquare className="h-3.5 w-3.5 text-blue-500" />}
                                        {suggestion.type === 'risk' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                                        {suggestion.type === 'document' && <FileText className="h-3.5 w-3.5 text-emerald-500" />}

                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider",
                                            suggestion.type === 'question' ? 'text-blue-500' :
                                                suggestion.type === 'risk' ? 'text-amber-500' : 'text-emerald-500'
                                        )}>
                                            {suggestion.type === 'question' ? 'Soru Önerisi' :
                                                suggestion.type === 'risk' ? 'Risk Uyarısı' : 'Belge Talebi'}
                                        </span>
                                    </div>

                                    <p className="text-sm font-medium text-dark-charcoal/90 leading-snug">
                                        {suggestion.content}
                                    </p>

                                    <div className="mt-3 flex justify-end">
                                        <Button size="sm" variant="ghost" className="h-6 rounded-md px-2 text-[10px] text-dark-charcoal/40 hover:text-dark-charcoal">
                                            Bunu kaydet
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* AI Summary Preview (Bottom of sidebar) */}
                    <div className="border-t border-dark-charcoal/5 p-4 bg-rx-bg/50">
                        <h4 className="flex items-center gap-1.5 text-xs font-bold text-dark-charcoal mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Anlık Tespitler
                        </h4>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-[11px] font-medium text-dark-charcoal">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Boşanma sebebi: <span className="text-dark-charcoal font-bold">Zina (Şüpheli)</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-dark-charcoal">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Delil durumu: <span className="text-dark-charcoal font-bold">Mevcut (Dijital)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

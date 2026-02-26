'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText, ArrowLeft, Loader2, Copy, Check, Download,
  Scale, FileSignature, ScrollText, Stamp, Mail, Shield,
  ChevronRight, Sparkles, RotateCcw, Upload, Search,
  AlertTriangle, BookOpen, FileSearch, PenTool, X, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const DOCUMENT_TYPES = [
  { id: 'dilekce', label: 'Dilekçe', desc: 'Dava, şikayet, talep dilekçesi', icon: Scale, color: 'text-rx-red bg-rx-red/[0.06]' },
  { id: 'savunma', label: 'Savunma', desc: 'Cevap ve savunma dilekçesi', icon: Shield, color: 'text-blue-600 bg-blue-500/[0.06]' },
  { id: 'ihtarname', label: 'İhtarname', desc: 'Noterden çekilecek ihtarname', icon: FileSignature, color: 'text-amber-700 bg-amber-500/[0.06]' },
  { id: 'sozlesme', label: 'Sözleşme', desc: 'İş, kira, hizmet sözleşmesi', icon: ScrollText, color: 'text-emerald-600 bg-emerald-500/[0.06]' },
  { id: 'vekaletname', label: 'Vekaletname', desc: 'Genel veya özel vekaletname', icon: Stamp, color: 'text-purple-600 bg-purple-500/[0.06]' },
  { id: 'mektup', label: 'Hukuki Yazı', desc: 'Resmi yazışma ve mektup', icon: Mail, color: 'text-cyan-600 bg-cyan-500/[0.06]' },
];

type Tab = 'yazim' | 'analiz';

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-dark-charcoal">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderContent(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      return <h4 key={i} className="mt-5 mb-1.5 text-[14px] font-bold tracking-tight text-dark-charcoal">{renderInline(trimmed.slice(4))}</h4>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="mt-6 mb-2 text-[15px] font-bold tracking-tight text-dark-charcoal">{renderInline(trimmed.slice(3))}</h3>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={i} className="mt-6 mb-3 text-lg font-bold text-dark-charcoal">{renderInline(trimmed.slice(2))}</h2>;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const dotIdx = trimmed.indexOf('.');
      return (
        <div key={i} className="flex items-start gap-2.5 py-0.5 pl-1">
          <span className="mt-[1px] flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-dark-charcoal/[0.07] text-[10px] font-bold text-dark-charcoal/60">
            {trimmed.slice(0, dotIdx)}
          </span>
          <span className="flex-1 text-[13.5px] leading-relaxed">
            {renderInline(trimmed.slice(dotIdx + 1).trim())}
          </span>
        </div>
      );
    }
    if (/^[*\-]\s/.test(trimmed)) {
      return (
        <div key={i} className="flex items-start gap-2.5 py-0.5 pl-1">
          <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-dark-charcoal/30" />
          <span className="flex-1 text-[13.5px] leading-relaxed">
            {renderInline(trimmed.slice(2))}
          </span>
        </div>
      );
    }
    if (/^---+$/.test(trimmed)) {
      return <hr key={i} className="my-4 border-dark-charcoal/10" />;
    }
    if (trimmed === '') return <div key={i} className="h-2" />;
    return <p key={i} className="text-[13.5px] leading-relaxed">{renderInline(trimmed)}</p>;
  });
}

export default function BelgeYazimPage() {
  const [activeTab, setActiveTab] = useState<Tab>('yazim');

  return (
    <div className="flex flex-col min-h-screen bg-rx-bg">
      <div className="sticky top-0 z-50 border-b border-dark-charcoal/5 bg-rx-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-1.5 text-dark-charcoal/50 hover:text-dark-charcoal transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-dark-charcoal/10" />
          <Link href="/" className="font-serif text-base text-dark-charcoal/70 hover:text-dark-charcoal transition-colors">
            Legal<span className="italic text-rx-red/70">Path</span>
          </Link>
          <div className="h-4 w-px bg-dark-charcoal/10" />
          <div className="flex items-center gap-0.5 rounded-lg bg-dark-charcoal/[0.04] p-0.5">
            <button
              onClick={() => setActiveTab('yazim')}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === 'yazim'
                  ? "bg-white text-dark-charcoal shadow-sm"
                  : "text-dark-charcoal/50 hover:text-dark-charcoal/70"
              )}
            >
              <PenTool className="h-3 w-3" />
              Belge Yazım
            </button>
            <button
              onClick={() => setActiveTab('analiz')}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === 'analiz'
                  ? "bg-white text-dark-charcoal shadow-sm"
                  : "text-dark-charcoal/50 hover:text-dark-charcoal/70"
              )}
            >
              <FileSearch className="h-3 w-3" />
              Belge Analizi
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'yazim' ? <BelgeYazimTab /> : <BelgeAnalizTab />}

      <footer className="border-t border-dark-charcoal/5 bg-rx-bg px-5 py-6 md:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="font-serif text-sm text-dark-charcoal/30">
            Legal<span className="italic">Path</span>
          </Link>
          <span className="font-mono text-[10px] text-dark-charcoal/20">© 2025 LegalPath</span>
        </div>
      </footer>
    </div>
  );
}

function BelgeYazimTab() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'select' | 'describe' | 'result'>('select');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'result' && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generatedContent, step]);

  const handleEnhance = async () => {
    if (!description.trim()) return;
    setIsEnhancing(true);
    try {
      const response = await fetch('/api/prompt-iyilestir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          details,
          documentType: selectedType ? DOCUMENT_TYPES.find(t => t.id === selectedType)?.label : undefined
        }),
      });
      if (!response.ok) throw new Error('İyileştirme başarısız');
      const data = await response.json();
      if (data.enhancedText) {
        setDescription(data.enhancedText);
        setDetails('');
      }
    } catch (error) {
      console.error('Enhance error:', error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedType || !description.trim()) return;
    setIsGenerating(true);
    setGeneratedContent('');
    setStep('result');
    try {
      const response = await fetch('/api/belge-yaz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: selectedType, description, details }),
      });
      if (!response.ok) throw new Error('Belge oluşturma başarısız');
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let gathered = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try { gathered += JSON.parse(line.substring(2)); } catch { /* skip */ }
          }
        }
        setGeneratedContent(gathered);
      }
    } catch (error) {
      console.error('Generate error:', error);
      setGeneratedContent('⚠️ Belge oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const typeLabel = DOCUMENT_TYPES.find(t => t.id === selectedType)?.label || 'belge';
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: generatedContent,
          title: `${typeLabel} Taslağı`,
          documentType: typeLabel,
        }),
      });
      if (!response.ok) throw new Error('DOCX oluşturulamadı');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${typeLabel}_taslak_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback to txt download
      console.error('DOCX export failed, falling back to txt:', error);
      const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${typeLabel}_taslak_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setSelectedType(null);
    setDescription('');
    setDetails('');
    setGeneratedContent('');
    setStep('select');
  };

  const selectedTemplate = DOCUMENT_TYPES.find(t => t.id === selectedType);

  return (
    <div className="flex-1 mx-auto w-full max-w-5xl px-5 md:px-8 py-10 md:py-16">
      <div className="mb-10 md:mb-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rx-red/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rx-red">
          <Sparkles className="h-3 w-3" />
          Yapay Zeka ile Belge Oluşturma
        </div>
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-dark-charcoal md:text-4xl lg:text-5xl">
          Akıllı Belge <span className="italic">Yazım</span>
        </h1>
        <p className="mt-3 max-w-xl text-dark-charcoal/50 leading-relaxed">
          Durumunuzu açıklayın, yapay zeka profesyonel hukuki belge taslağını saniyeler içinde oluştursun.
        </p>
      </div>

      <div className={cn("transition-all duration-300", step !== 'select' && selectedType && 'mb-8')}>
        {step === 'select' && (
          <div className="mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">1. Belge Türünü Seçin</span>
          </div>
        )}
        {step === 'select' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => { setSelectedType(type.id); setStep('describe'); }}
                className={cn(
                  "group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all",
                  selectedType === type.id
                    ? "border-dark-charcoal/20 bg-white shadow-md"
                    : "border-dark-charcoal/5 bg-white hover:border-dark-charcoal/15 hover:shadow-sm"
                )}
              >
                <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl", type.color)}>
                  <type.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-base text-dark-charcoal">{type.label}</h3>
                    <ChevronRight className="h-4 w-4 text-dark-charcoal/20 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 text-xs text-dark-charcoal/40">{type.desc}</p>
                </div>
              </button>
            ))}
          </div>
        ) : selectedTemplate && (
          <button
            onClick={() => { if (!isGenerating) setStep('select'); }}
            className="inline-flex items-center gap-3 rounded-xl border border-dark-charcoal/10 bg-white px-4 py-2.5 text-left transition-all hover:border-dark-charcoal/20"
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", selectedTemplate.color)}>
              <selectedTemplate.icon className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-medium text-dark-charcoal">{selectedTemplate.label}</span>
              <span className="ml-2 text-xs text-dark-charcoal/30">— değiştirmek için tıklayın</span>
            </div>
          </button>
        )}
      </div>

      {(step === 'describe' || step === 'result') && (
        <div className="mb-8">
          {step === 'describe' && (
            <div className="mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">2. Durumunuzu Açıklayın</span>
            </div>
          )}
          <div className="rounded-2xl border border-dark-charcoal/8 bg-white p-5 shadow-sm">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: İşverenimden kıdem tazminatı alamadım. 5 yıldır çalıştığım şirketten haklı neden gösterilmeden çıkarıldım..."
              className="min-h-[100px] border-0 bg-transparent p-0 text-sm leading-relaxed text-dark-charcoal placeholder:text-dark-charcoal/25 focus-visible:ring-0 resize-none"
              disabled={isGenerating || isEnhancing}
            />
            <div className="mt-4 border-t border-dark-charcoal/5 pt-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dark-charcoal/40 hover:text-dark-charcoal/60 transition-colors">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  Ek Detaylar (Opsiyonel)
                </summary>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Tarafların isimleri, tarihler, meblağlar, mahkeme bilgileri..."
                  className="mt-3 min-h-[60px] border border-dark-charcoal/5 bg-rx-bg/50 text-xs leading-relaxed text-dark-charcoal placeholder:text-dark-charcoal/25 focus-visible:ring-1 focus-visible:ring-dark-charcoal/10 resize-none rounded-xl p-3"
                  disabled={isGenerating || isEnhancing}
                />
              </details>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] text-dark-charcoal/25">
                AI tarafından oluşturulan belgeler taslak niteliğindedir.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleEnhance}
                  disabled={isGenerating || isEnhancing || !description.trim()}
                  variant="outline"
                  className={cn(
                    "gap-2 rounded-xl px-4 shadow-sm transition-all border-dark-charcoal/10 hover:border-dark-charcoal/20 hover:bg-dark-charcoal/[0.02] bg-white text-dark-charcoal",
                    !description.trim() && "text-dark-charcoal/30 bg-transparent"
                  )}
                >
                  {isEnhancing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> İyileştiriliyor...</>
                  ) : (
                    <><Wand2 className="h-4 w-4 text-purple-500" /> Yazımı İyileştir</>
                  )}
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || isEnhancing || !description.trim()}
                  className={cn(
                    "gap-2 rounded-xl px-5 shadow-sm transition-all",
                    description.trim()
                      ? "bg-dark-charcoal text-white hover:bg-dark-charcoal/90"
                      : "bg-dark-charcoal/5 text-dark-charcoal/20"
                  )}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Oluşturuluyor...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Belge Oluştur</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'result' && (generatedContent || isGenerating) && (
        <div ref={resultRef}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">3. Oluşturulan Belge</span>
            {generatedContent && !isGenerating && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Kopyalandı</> : <><Copy className="h-3 w-3" /> Kopyala</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  <Download className="h-3 w-3" /> DOCX İndir
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  <RotateCcw className="h-3 w-3" /> Yeni Belge
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-dark-charcoal/8 bg-white p-6 md:p-8 shadow-sm">
            {isGenerating && !generatedContent && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-dark-charcoal/40" />
                <span className="text-sm text-dark-charcoal/40">Belge oluşturuluyor...</span>
              </div>
            )}
            <div className="prose-legal text-dark-charcoal/80">
              {renderContent(generatedContent)}
            </div>
            {isGenerating && generatedContent && (
              <div className="mt-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce" />
              </div>
            )}
          </div>
          {!isGenerating && generatedContent && (
            <div className="mt-4 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4">
              <p className="text-xs text-amber-700/70 leading-relaxed">
                <strong className="text-amber-800">⚠️ Önemli Uyarı:</strong> Bu belge yapay zeka tarafından oluşturulmuş bir taslaktır.
                Hukuki işlemlerinizde kullanmadan önce mutlaka bir avukata danışmanız önerilir.
                Kişisel bilgilerin doğruluğunu kontrol edin ve [___] ile işaretlenmiş alanları doldurun.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BelgeAnalizTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisContent, setAnalysisContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysisContent && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [analysisContent]);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md', '.rtf'];
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(ext)) {
      alert('Desteklenmeyen dosya formatı. Lütfen PDF, TXT veya Markdown yükleyin.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu çok büyük. Maksimum 10 MB yükleyebilirsiniz.');
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setAnalysisContent('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setAnalysisContent('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Analiz başarısız');
      }

      if (!response.body) throw new Error('Yanıt gövdesi boş');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let gathered = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.substring(2));
              gathered += text;
              setAnalysisContent(gathered);
            } catch { /* skip */ }
          }
        }
      }
    } catch (error: unknown) {
      console.error('Analyze error:', error);
      const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setAnalysisContent(prev => prev + '\n\n⚠️ Analiz sırasında hata oluştu: ' + message + '. Lütfen tekrar deneyin.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysisContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: analysisContent,
          title: `Belge Analizi - ${fileName}`,
          documentType: 'Analiz Raporu',
        }),
      });
      if (!response.ok) throw new Error('DOCX oluşturulamadı');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analiz_' + fileName.replace(/\.[^.]+$/, '') + '_' + new Date().toISOString().slice(0, 10) + '.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('DOCX export failed, falling back to txt:', error);
      const blob = new Blob([analysisContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'analiz_' + fileName.replace(/\.[^.]+$/, '') + '_' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileName('');
    setAnalysisContent('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileSize = file ? (file.size / 1024).toFixed(1) + ' KB' : '';

  return (
    <div className="flex-1 mx-auto w-full max-w-5xl px-5 md:px-8 py-10 md:py-16">
      <div className="mb-10 md:mb-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-600">
          <FileSearch className="h-3 w-3" />
          Yapay Zeka ile Belge Analizi
        </div>
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-dark-charcoal md:text-4xl lg:text-5xl">
          Hukuki Belge <span className="italic">Analizi</span>
        </h1>
        <p className="mt-3 max-w-xl text-dark-charcoal/50 leading-relaxed">
          Sözleşme, dilekçe veya herhangi bir hukuki belgenizi yükleyin — yapay zeka riskli maddeleri tespit etsin, iyileştirme önerileri sunsun.
        </p>
      </div>

      <div className="mb-8">
        <div className="mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">1. Belgenizi Yükleyin</span>
        </div>
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative cursor-pointer rounded-2xl border-2 border-dashed p-12 md:p-16 text-center transition-all",
              isDragging
                ? "border-blue-400 bg-blue-50/50"
                : "border-dark-charcoal/15 bg-white hover:border-dark-charcoal/25 hover:bg-dark-charcoal/[0.01]"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.rtf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
              className="hidden"
            />
            <div className={cn(
              "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm transition-colors",
              isDragging
                ? "border-blue-300 bg-blue-100 text-blue-500"
                : "border-dark-charcoal/8 bg-rx-bg text-dark-charcoal/40"
            )}>
              <Upload className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-dark-charcoal/60">
              {isDragging ? 'Dosyayı bırakın...' : 'Belgenizi sürükleyin veya tıklayarak seçin'}
            </p>
            <p className="mt-1.5 text-xs text-dark-charcoal/30">
              PDF, TXT, Markdown · Maksimum 10 MB
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dark-charcoal/8 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/[0.06] text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-dark-charcoal">{fileName}</p>
                  <p className="text-[11px] text-dark-charcoal/40">{fileSize}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isAnalyzing && !analysisContent && (
                  <button
                    onClick={handleReset}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-charcoal/30 hover:bg-dark-charcoal/5 hover:text-dark-charcoal/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {!analysisContent && !isAnalyzing && (
              <div className="mt-4 flex items-center justify-between border-t border-dark-charcoal/5 pt-4">
                <p className="text-[10px] text-dark-charcoal/25">
                  Belgeniz güvenli şekilde analiz edilecektir.
                </p>
                <Button
                  onClick={handleAnalyze}
                  className="gap-2 rounded-xl bg-dark-charcoal px-5 text-white shadow-sm hover:bg-dark-charcoal/90"
                >
                  <Search className="h-4 w-4" />
                  Analiz Et
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {(analysisContent || isAnalyzing) && (
        <div ref={resultRef}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">2. Analiz Sonucu</span>
            {analysisContent && !isAnalyzing && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  {copied ? <><Check className="h-3 w-3 text-emerald-500" /> Kopyalandı</> : <><Copy className="h-3 w-3" /> Kopyala</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  <Download className="h-3 w-3" /> DOCX İndir
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 gap-1.5 text-xs text-dark-charcoal/50 hover:text-dark-charcoal">
                  <RotateCcw className="h-3 w-3" /> Yeni Analiz
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-dark-charcoal/8 bg-white p-6 md:p-8 shadow-sm">
            {fileName && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-dark-charcoal/[0.03] px-3 py-1.5 text-xs text-dark-charcoal/50">
                <FileText className="h-3 w-3" />
                {fileName}
              </div>
            )}
            {isAnalyzing && !analysisContent && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="relative">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/[0.06] flex items-center justify-center">
                    <FileSearch className="h-6 w-6 text-blue-600" />
                  </div>
                  <Loader2 className="absolute -top-1 -right-1 h-5 w-5 animate-spin text-dark-charcoal/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-dark-charcoal/60">Belge analiz ediliyor...</p>
                  <p className="mt-1 text-xs text-dark-charcoal/30">Bu işlem birkaç saniye sürebilir</p>
                </div>
              </div>
            )}
            <div className="prose-legal text-dark-charcoal/80">
              {renderContent(analysisContent)}
            </div>
            {isAnalyzing && analysisContent && (
              <div className="mt-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-dark-charcoal/30 animate-bounce" />
              </div>
            )}
          </div>
          {!isAnalyzing && analysisContent && (
            <div className="mt-4 rounded-xl border border-blue-200/50 bg-blue-50/50 p-4">
              <p className="text-xs text-blue-700/70 leading-relaxed">
                <strong className="text-blue-800">ℹ️ Bilgi:</strong> Bu analiz yapay zeka tarafından oluşturulmuştur.
                Hukuki kararlarınızı bu analize dayandırmadan önce mutlaka bir avukata danışmanız önerilir.
                Analiz sonuçları tavsiye niteliğindedir ve hukuki mütalaa yerine geçmez.
              </p>
            </div>
          )}
        </div>
      )}

      {!file && !analysisContent && (
        <div className="mt-6">
          <div className="mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-dark-charcoal/30">Neler Analiz Edilebilir?</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Scale, title: 'Dilekçeler', desc: 'Dava, itiraz, temyiz dilekçeleri', color: 'text-rx-red bg-rx-red/[0.06]' },
              { icon: ScrollText, title: 'Sözleşmeler', desc: 'İş, kira, hizmet, satış sözleşmeleri', color: 'text-emerald-600 bg-emerald-500/[0.06]' },
              { icon: FileSignature, title: 'İhtarnameler', desc: 'Noter ihtarnameleri ve ihbar yazıları', color: 'text-amber-700 bg-amber-500/[0.06]' },
              { icon: BookOpen, title: 'Mahkeme Kararları', desc: 'Karar metinleri ve gerekçeli kararlar', color: 'text-blue-600 bg-blue-500/[0.06]' },
              { icon: AlertTriangle, title: 'Tüketici Şikayetleri', desc: 'Tüketici hakem heyeti başvuruları', color: 'text-purple-600 bg-purple-500/[0.06]' },
              { icon: Shield, title: 'Diğer Belgeler', desc: 'Her türlü hukuki metin ve yazışma', color: 'text-cyan-600 bg-cyan-500/[0.06]' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl border border-dark-charcoal/5 bg-white p-4 transition-all">
                <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl", item.color)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm text-dark-charcoal">{item.title}</h3>
                  <p className="mt-0.5 text-[11px] text-dark-charcoal/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

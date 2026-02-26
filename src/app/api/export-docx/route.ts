import { NextRequest } from 'next/server';
import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, BorderStyle, TabStopType, TabStopPosition
} from 'docx';

export async function POST(req: NextRequest) {
    try {
        const { content, title, documentType } = await req.json();

        if (!content) {
            return new Response(JSON.stringify({ error: 'İçerik gerekli' }), { status: 400 });
        }

        const children: Paragraph[] = [];

        // Header
        children.push(
            new Paragraph({
                children: [new TextRun({ text: title || 'Hukuki Belge', bold: true, size: 32, font: 'Times New Roman' })],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            })
        );

        if (documentType) {
            children.push(
                new Paragraph({
                    children: [new TextRun({ text: `Belge Türü: ${documentType}`, italics: true, size: 20, color: '666666', font: 'Times New Roman' })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                })
            );
        }

        children.push(
            new Paragraph({
                children: [new TextRun({ text: `Tarih: ${new Date().toLocaleDateString('tr-TR')}`, size: 20, color: '666666', font: 'Times New Roman' })],
                alignment: AlignmentType.RIGHT,
                spacing: { after: 400 },
            })
        );

        // Separator
        children.push(
            new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
                spacing: { after: 300 },
            })
        );

        // Parse content line by line
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();

            // Skip markdown artifacts
            if (/^---\s*(DİLEKÇE|BELGE)\s*(BAŞLANGIÇ|BİTİŞ)\s*---$/i.test(trimmed)) continue;

            // Heading ## or ###
            if (trimmed.startsWith('### ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanMarkdown(trimmed.slice(4)), bold: true, size: 24, font: 'Times New Roman' })],
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 },
                }));
                continue;
            }
            if (trimmed.startsWith('## ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanMarkdown(trimmed.slice(3)), bold: true, size: 26, font: 'Times New Roman' })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 },
                }));
                continue;
            }
            if (trimmed.startsWith('# ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: cleanMarkdown(trimmed.slice(2)), bold: true, size: 28, font: 'Times New Roman' })],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 },
                }));
                continue;
            }

            // Horizontal rule
            if (/^---+$/.test(trimmed)) {
                children.push(new Paragraph({
                    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
                    spacing: { before: 200, after: 200 },
                }));
                continue;
            }

            // Numbered list
            if (/^\d+\.\s/.test(trimmed)) {
                const dotIdx = trimmed.indexOf('.');
                const rest = trimmed.slice(dotIdx + 1).trim();
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: trimmed.slice(0, dotIdx + 1) + ' ', bold: true, size: 22, font: 'Times New Roman' }),
                        ...parseInlineFormatting(rest),
                    ],
                    indent: { left: 400 },
                    spacing: { before: 60, after: 60 },
                }));
                continue;
            }

            // Bullet list
            if (/^[*\-]\s/.test(trimmed)) {
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: '• ', size: 22, font: 'Times New Roman' }),
                        ...parseInlineFormatting(trimmed.slice(2)),
                    ],
                    indent: { left: 400 },
                    spacing: { before: 60, after: 60 },
                }));
                continue;
            }

            // Empty line
            if (trimmed === '') {
                children.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
                continue;
            }

            // Normal paragraph
            children.push(new Paragraph({
                children: parseInlineFormatting(trimmed),
                spacing: { before: 60, after: 60 },
            }));
        }

        // Footer
        children.push(
            new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
                spacing: { before: 600 },
            })
        );
        children.push(new Paragraph({
            children: [new TextRun({
                text: '⚠️ Bu belge LegalPath AI tarafından oluşturulmuştur. Taslak niteliğindedir, bir avukata danışılması önerilir.',
                italics: true, size: 16, color: '999999', font: 'Times New Roman'
            })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100 },
        }));

        const doc = new Document({
            sections: [{ children }],
            creator: 'LegalPath AI',
            title: title || 'Hukuki Belge',
            description: 'LegalPath AI ile oluşturulmuş hukuki belge',
        });

        const buffer = await Packer.toBuffer(doc);
        const uint8 = new Uint8Array(buffer);

        return new Response(uint8, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(title || 'belge')}_${new Date().toISOString().slice(0, 10)}.docx"`,
            },
        });
    } catch (error: any) {
        console.error('DOCX export error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}

function cleanMarkdown(text: string): string {
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim();
}

function parseInlineFormatting(text: string): TextRun[] {
    const runs: TextRun[] = [];
    const parts = text.split(/(\*\*.*?\*\*)/g);
    for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22, font: 'Times New Roman' }));
        } else if (part) {
            runs.push(new TextRun({ text: part, size: 22, font: 'Times New Roman' }));
        }
    }
    return runs;
}

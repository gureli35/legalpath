#!/usr/bin/env npx tsx
/**
 * Adalet Bakanlığı Hukuk Sözlüğü Scraper v3
 * Now using the correct HTML structure: div.terim > col-md-4 (term) + col-md-8 (definition)
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://sozluk.adalet.gov.tr';
const OUTPUT_FILE = path.join(process.cwd(), 'hukuk_sozlugu.json');

// Turkish alphabet for pagination
const HARFLER = ['A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'];

interface Terim {
    terim: string;
    anlam: string;
    harf: string;
}

async function fetchTermsByLetter(harf: string): Promise<Terim[]> {
    const terimler: Terim[] = [];

    try {
        // The site uses /harf/X for letter pages
        const url = `${BASE_URL}/harf/${encodeURIComponent(harf)}`;
        console.log(`📥 Fetching: ${url}`);

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'tr-TR,tr;q=0.9',
            }
        });

        if (!res.ok) {
            console.warn(`⚠️ Failed to fetch ${harf}: ${res.status}`);
            return terimler;
        }

        const html = await res.text();

        // Pattern: <div class="terim"><div class="col-md-4">TERM</div><div class="col-md-8">DEFINITION</div></div>
        const terimPattern = /<div\s+class="terim">\s*<div\s+class="col-md-4">([^<]+)<\/div>\s*<div\s+class="col-md-8">([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)?[^<]*)<\/div>/gi;

        let match;
        while ((match = terimPattern.exec(html)) !== null) {
            const term = match[1].trim();
            let definition = match[2]
                .replace(/<[^>]+>/g, '') // Remove HTML tags
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim();

            if (term && definition && term.length > 0) {
                terimler.push({
                    terim: term,
                    anlam: definition,
                    harf: harf
                });
            }
        }

        // If first pattern didn't work, try alternative
        if (terimler.length === 0) {
            // Try more relaxed pattern
            const altPattern = /class="col-md-4">([^<]+)<\/div>\s*<div[^>]*class="col-md-8">([^<]+)/gi;
            while ((match = altPattern.exec(html)) !== null) {
                const term = match[1].trim();
                let definition = match[2].trim();

                if (term && definition && term.length > 1 && definition.length > 5) {
                    terimler.push({
                        terim: term,
                        anlam: definition,
                        harf: harf
                    });
                }
            }
        }

        console.log(`  Found ${terimler.length} terms for "${harf}"`);

    } catch (e) {
        console.error(`❌ Error for letter ${harf}:`, e);
    }

    return terimler;
}

async function main() {
    console.log('🚀 Adalet Bakanlığı Hukuk Sözlüğü Scraper v3\n');

    const allTerimler: Terim[] = [];

    for (const harf of HARFLER) {
        const terimler = await fetchTermsByLetter(harf);
        allTerimler.push(...terimler);
        console.log(`  ✅ Total so far: ${allTerimler.length} terms\n`);

        // Save progress after each letter
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTerimler, null, 2), 'utf-8');

        // Be nice to the server
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n========== SUMMARY ==========');
    console.log(`✅ Total terms scraped: ${allTerimler.length}`);
    console.log(`📁 Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);

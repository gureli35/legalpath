
import { emsalClient } from '../src/lib/emsal-client';

async function testMevzuatSearch() {
    const query = "İş kazası sonucu maluliyet tazminatı";
    console.log(`Testing search for: "${query}"`);

    try {
        const mevzuatResults = await emsalClient.searchMevzuat(query);
        console.log(`\nFound ${mevzuatResults.length} mevzuat items:`);
        mevzuatResults.forEach((r, i) => {
            console.log(`${i + 1}. ${r.kanun_adi} - Madde ${r.madde_no} (Score: ${r.score})`);
            console.log(`   Preview: ${r.icerik.substring(0, 100)}...`);
        });

        if (mevzuatResults.length === 0) {
            console.log("❌ No results found! Check FTS/Embedding logic.");
        }
    } catch (error) {
        console.error("❌ Search failed:", error);
    }
}

testMevzuatSearch();

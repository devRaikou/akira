/**
 * ═══════════════════════════════════════════════════════════════
 * 🗑️ AKIRA BOT - KOMUT SİLME SCRİPTİ
 * ═══════════════════════════════════════════════════════════════
 * 
 * Bu script, Discord'a kaydedilmiş slash komutlarını siler.
 * 
 * KULLANIM:
 *   node src/scripts/deleteCommands.js          - Tüm guild komutlarını sil
 *   node src/scripts/deleteCommands.js global   - Tüm global komutları sil
 *   node src/scripts/deleteCommands.js all      - Hem guild hem global sil
 * 
 * ⚠️ DİKKAT: Bu işlem geri alınamaz!
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// 🔧 KONFİGÜRASYON
// ─────────────────────────────────────────────────────────────

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Doğrulama
if (!TOKEN || !CLIENT_ID) {
    console.error('❌ HATA: .env dosyasında BOT_TOKEN veya CLIENT_ID eksik!');
    process.exit(1);
}

// Komut satırı argümanları
const args = process.argv.slice(2);
const deleteGlobal = args.includes('global') || args.includes('all');
const deleteGuild = !args.includes('global') || args.includes('all');

// ─────────────────────────────────────────────────────────────
// 🗑️ KOMUTLARI SİL
// ─────────────────────────────────────────────────────────────

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    console.log('═'.repeat(50));
    console.log('🗑️  KOMUT SİLME SCRİPTİ');
    console.log('═'.repeat(50));
    console.log();

    try {
        // ─────────────────────────────────────────────────────────
        // 🏠 GUILD KOMUTLARINI SİL
        // ─────────────────────────────────────────────────────────
        if (deleteGuild) {
            if (!GUILD_ID) {
                console.error('❌ GUILD_ID tanımlanmamış, guild komutları silinemez!');
            } else {
                console.log(`🔄 Guild komutları siliniyor... (${GUILD_ID})`);

                // Mevcut komutları listele
                const guildCommands = await rest.get(
                    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
                );

                console.log(`   📋 ${guildCommands.length} komut bulundu:`);
                guildCommands.forEach(cmd => console.log(`      - /${cmd.name}`));

                // Tümünü sil (boş array göndererek)
                await rest.put(
                    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                    { body: [] }
                );

                console.log(`   ✅ ${guildCommands.length} guild komutu silindi!\n`);
            }
        }

        // ─────────────────────────────────────────────────────────
        // 🌍 GLOBAL KOMUTLARI SİL
        // ─────────────────────────────────────────────────────────
        if (deleteGlobal) {
            console.log('🔄 Global komutlar siliniyor...');

            // Mevcut global komutları listele
            const globalCommands = await rest.get(
                Routes.applicationCommands(CLIENT_ID)
            );

            console.log(`   📋 ${globalCommands.length} global komut bulundu:`);
            globalCommands.forEach(cmd => console.log(`      - /${cmd.name}`));

            // Tümünü sil
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: [] }
            );

            console.log(`   ✅ ${globalCommands.length} global komut silindi!\n`);
        }

        console.log('═'.repeat(50));
        console.log('✅ Silme işlemi tamamlandı!');
        console.log('═'.repeat(50));
        console.log('\n💡 Komutları tekrar kaydetmek için:');
        console.log('   node src/scripts/registerCommands.js');

    } catch (error) {
        console.error('\n❌ HATA:', error);
        
        if (error.code === 50001) {
            console.error('   Bot\'un yeterli yetkisi yok!');
        }
        
        process.exit(1);
    }
})();

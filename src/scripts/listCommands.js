/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 AKIRA BOT - KOMUT LİSTELEME SCRİPTİ
 * ═══════════════════════════════════════════════════════════════
 * 
 * Discord'a kayıtlı komutları listeler.
 * 
 * KULLANIM:
 *   node src/scripts/listCommands.js
 */

const { REST, Routes } = require('discord.js');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// 🔧 KONFİGÜRASYON
// ─────────────────────────────────────────────────────────────

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ HATA: .env dosyasında BOT_TOKEN veya CLIENT_ID eksik!');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 📋 KOMUTLARI LİSTELE
// ─────────────────────────────────────────────────────────────

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    console.log('═'.repeat(60));
    console.log('📋  KAYITLI KOMUTLAR');
    console.log('═'.repeat(60));
    console.log();

    try {
        // ─────────────────────────────────────────────────────────
        // 🏠 GUILD KOMUTLARI
        // ─────────────────────────────────────────────────────────
        if (GUILD_ID) {
            console.log(`🏠 Guild Komutları (${GUILD_ID}):`);
            console.log('─'.repeat(40));

            const guildCommands = await rest.get(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
            );

            if (guildCommands.length === 0) {
                console.log('   (Kayıtlı komut yok)');
            } else {
                guildCommands.forEach((cmd, i) => {
                    console.log(`   ${i + 1}. /${cmd.name}`);
                    console.log(`      └─ ${cmd.description}`);
                    if (cmd.options?.length > 0) {
                        console.log(`      └─ Parametreler: ${cmd.options.map(o => o.name).join(', ')}`);
                    }
                });
            }

            console.log();
        }

        // ─────────────────────────────────────────────────────────
        // 🌍 GLOBAL KOMUTLAR
        // ─────────────────────────────────────────────────────────
        console.log('🌍 Global Komutlar:');
        console.log('─'.repeat(40));

        const globalCommands = await rest.get(
            Routes.applicationCommands(CLIENT_ID)
        );

        if (globalCommands.length === 0) {
            console.log('   (Kayıtlı komut yok)');
        } else {
            globalCommands.forEach((cmd, i) => {
                console.log(`   ${i + 1}. /${cmd.name}`);
                console.log(`      └─ ${cmd.description}`);
            });
        }

        console.log();
        console.log('═'.repeat(60));
        console.log(`📊 Toplam: ${GUILD_ID ? (await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID))).length : 0} guild, ${globalCommands.length} global`);
        console.log('═'.repeat(60));

    } catch (error) {
        console.error('❌ HATA:', error.message);
        process.exit(1);
    }
})();

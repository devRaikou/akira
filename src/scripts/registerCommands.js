/**
 * ═══════════════════════════════════════════════════════════════
 * 📝 AKIRA BOT - KOMUT KAYIT SCRİPTİ
 * ═══════════════════════════════════════════════════════════════
 * 
 * Bu script, slash komutlarını Discord'a kaydeder.
 * 
 * KULLANIM:
 *   node src/scripts/registerCommands.js
 * 
 * ÖNEMLİ:
 *   - Komutlar sadece belirtilen GUILD'e kaydedilir (global DEĞİL!)
 *   - Bu script bot çalışırken kullanılmamalıdır
 *   - Komut değişikliklerinde bu script çalıştırılmalıdır
 */

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// 🔧 KONFİGÜRASYON
// ─────────────────────────────────────────────────────────────

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// Doğrulama
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('❌ HATA: .env dosyasında BOT_TOKEN, CLIENT_ID veya GUILD_ID eksik!');
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// 📁 KOMUTLARI TOPLA
// ─────────────────────────────────────────────────────────────

const commands = [];
const commandsPath = path.join(__dirname, '..', 'commands');

// Kategori klasörlerini oku
const categories = fs.readdirSync(commandsPath).filter(file => {
    return fs.statSync(path.join(commandsPath, file)).isDirectory();
});

console.log('📂 Komutlar toplanıyor...\n');

for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

    console.log(`  📁 ${category}/`);

    for (const file of commandFiles) {
        try {
            const filePath = path.join(categoryPath, file);
            
            // Cache'i temizle (önceki çalıştırmalardan)
            delete require.cache[require.resolve(filePath)];
            
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`     ✅ ${command.data.name}`);
            } else {
                console.log(`     ⚠️ ${file} - data veya execute eksik, atlanıyor`);
            }
        } catch (error) {
            console.log(`     ❌ ${file} - Hata: ${error.message}`);
        }
    }
}

console.log(`\n📊 Toplam ${commands.length} komut bulundu.\n`);

// ─────────────────────────────────────────────────────────────
// 🚀 KOMUTLARI KAYDET
// ─────────────────────────────────────────────────────────────

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🔄 Komutlar Discord\'a kaydediliyor...');
        console.log(`   Guild ID: ${GUILD_ID}\n`);

        // Guild-specific komutları kaydet (anlık güncelleme)
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('═'.repeat(50));
        console.log(`✅ ${data.length} komut başarıyla kaydedildi!`);
        console.log('═'.repeat(50));
        console.log('\n📋 Kaydedilen Komutlar:');
        
        data.forEach((cmd, index) => {
            console.log(`   ${index + 1}. /${cmd.name}`);
        });

        console.log('\n💡 İpucu: Komutlar sunucuda hemen aktif olacaktır.');

    } catch (error) {
        console.error('\n❌ HATA:', error);
        
        if (error.code === 50001) {
            console.error('   Bot\'un bu sunucuda yeterli yetkisi yok!');
        } else if (error.code === 10002) {
            console.error('   Sunucu bulunamadı! GUILD_ID\'yi kontrol edin.');
        }
        
        process.exit(1);
    }
})();

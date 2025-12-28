/**
 * ═══════════════════════════════════════════════════════════════
 * 🔧 AKIRA BOT - EVAL KOMUTU (GELİŞTİRİCİ)
 * ═══════════════════════════════════════════════════════════════
 * 
 * JavaScript kodu çalıştırır. SADECE geliştiriciler için!
 * ⚠️ DİKKAT: Bu komut çok tehlikelidir, dikkatli kullanın!
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper, truncate } = require('../../utils');
const util = require('util');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('[DEV] JavaScript kodu çalıştırır.')
        .addStringOption(option =>
            option
                .setName('kod')
                .setDescription('Çalıştırılacak JavaScript kodu')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('gizli')
                .setDescription('Sonucu sadece sen gör')
                .setRequired(false)
        ),

    // Komut ayarları
    cooldown: 0,                    // Developer'lar zaten muaf
    developerOnly: true,            // SADECE geliştiriciler
    requiredPermissions: [],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const code = interaction.options.getString('kod');
        const ephemeral = interaction.options.getBoolean('gizli') ?? true;

        // Token koruması
        const tokenPattern = /client\.token|process\.env\.BOT_TOKEN|process\.env/gi;
        if (tokenPattern.test(code)) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Güvenlik', 'Token veya hassas bilgi içeren kod çalıştırılamaz!')],
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral });

        try {
            // Kodu çalıştır
            let result = await eval(code);

            // Sonucu formatla
            if (typeof result !== 'string') {
                result = util.inspect(result, { depth: 2 });
            }

            // Token temizliği
            result = result.replace(new RegExp(config.bot.token, 'gi'), '[TOKEN GİZLİ]');

            // Uzun sonuçları kes
            result = truncate(result, 1900);

            const embed = new EmbedBuilder()
                .setTitle('✅ Eval Başarılı')
                .addFields(
                    { name: '📥 Girdi', value: `\`\`\`js\n${truncate(code, 500)}\n\`\`\``, inline: false },
                    { name: '📤 Çıktı', value: `\`\`\`js\n${result}\n\`\`\``, inline: false }
                )
                .setColor(config.colors.success)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Eval Hatası')
                .addFields(
                    { name: '📥 Girdi', value: `\`\`\`js\n${truncate(code, 500)}\n\`\`\``, inline: false },
                    { name: '❌ Hata', value: `\`\`\`js\n${truncate(error.message, 1000)}\n\`\`\``, inline: false }
                )
                .setColor(config.colors.error)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * 🏓 AKIRA BOT - PING KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Bot ve API gecikmesini gösterir.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/botConfig');
const database = require('../../database/connection');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot ve API gecikmesini gösterir.'),

    // Komut ayarları
    cooldown: 3,
    developerOnly: false,
    requiredPermissions: [],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        // İlk yanıt
        const sent = await interaction.reply({
            content: '🏓 Ping ölçülüyor...',
            fetchReply: true
        });

        // Gecikmeleri hesapla
        const wsLatency = client.ws.ping;
        const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;

        // Veritabanı gecikmesi
        let dbLatency = 'N/A';
        try {
            if (database.checkConnection()) {
                dbLatency = `${await database.ping()}ms`;
            }
        } catch (e) {
            dbLatency = 'Bağlantı yok';
        }

        // Gecikme durumu emoji
        const getStatusEmoji = (ms) => {
            if (ms < 100) return '🟢';
            if (ms < 200) return '🟡';
            return '🔴';
        };

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(config.colors.primary)
            .addFields(
                {
                    name: `${getStatusEmoji(wsLatency)} WebSocket`,
                    value: `\`${wsLatency}ms\``,
                    inline: true
                },
                {
                    name: `${getStatusEmoji(apiLatency)} API`,
                    value: `\`${apiLatency}ms\``,
                    inline: true
                },
                {
                    name: '🗄️ Veritabanı',
                    value: `\`${dbLatency}\``,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Akira Bot' });

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};

/**
 * ═══════════════════════════════════════════════════════════════
 * 🟢 AKIRA BOT - READY EVENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Bot başarıyla Discord'a bağlandığında tetiklenir.
 */

const { ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const config = require('../config/botConfig');

module.exports = {
    name: 'clientReady',
    once: true, // Sadece bir kez çalışır

    async execute(client) {
        // ─────────────────────────────────────────────────────────────
        // 🎨 BOT PRESENCE AYARLA
        // ─────────────────────────────────────────────────────────────
        const activityTypes = {
            'PLAYING': ActivityType.Playing,
            'WATCHING': ActivityType.Watching,
            'LISTENING': ActivityType.Listening,
            'COMPETING': ActivityType.Competing,
            'STREAMING': ActivityType.Streaming
        };

        client.user.setPresence({
            status: config.presence.status,
            activities: [{
                name: config.presence.activity.name,
                type: activityTypes[config.presence.activity.type] || ActivityType.Watching
            }]
        });

        // ─────────────────────────────────────────────────────────────
        // 📊 BAŞLATMA LOGU
        // ─────────────────────────────────────────────────────────────
        Logger.startup(client.user.tag, client.guilds.cache.size);

        // Komut sayısı
        Logger.info(`Yüklenen komut sayısı: ${client.commands?.size || 0}`);

        // Guild kontrolü
        const targetGuild = client.guilds.cache.get(config.bot.guildId);
        if (targetGuild) {
            Logger.info(`Hedef sunucu bulundu: ${targetGuild.name}`);
            Logger.info(`Üye sayısı: ${targetGuild.memberCount}`);
        } else {
            Logger.warn(`Hedef sunucu bulunamadı! Guild ID: ${config.bot.guildId}`);
        }

        // Developer modu uyarısı
        if (config.bot.devMode) {
            Logger.warn('⚠️ Bot DEVELOPMENT modunda çalışıyor!');
        }
    }
};

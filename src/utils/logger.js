/**
 * ═══════════════════════════════════════════════════════════════
 * 📝 AKIRA BOT - LOGGER UTILITY
 * ═══════════════════════════════════════════════════════════════
 * 
 * Merkezi log sistemi - Console ve Webhook desteği
 */

const { WebhookClient, EmbedBuilder } = require('discord.js');
const config = require('../config/botConfig');

class Logger {
    constructor() {
        this.webhookClient = null;
        this.initWebhook();
    }

    /**
     * Webhook client'ı başlat
     */
    initWebhook() {
        if (config.logging.webhookUrl) {
            try {
                this.webhookClient = new WebhookClient({ url: config.logging.webhookUrl });
            } catch (error) {
                console.error('[LOGGER] Webhook başlatılamadı:', error.message);
            }
        }
    }

    /**
     * Timestamp oluştur
     */
    getTimestamp() {
        return new Date().toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Console'a log yaz
     */
    consoleLog(level, emoji, color, message, ...args) {
        if (!config.logging.enableConsole) return;

        const timestamp = this.getTimestamp();
        const prefix = `${color}[${timestamp}] ${emoji} [${level}]\x1b[0m`;
        
        console.log(prefix, message, ...args);
    }

    /**
     * Webhook'a log gönder
     */
    async webhookLog(level, color, message, error = null) {
        if (!config.logging.enableWebhook || !this.webhookClient) return;

        try {
            const embed = new EmbedBuilder()
                .setTitle(`${level} Log`)
                .setDescription(`\`\`\`\n${message}\n\`\`\``)
                .setColor(color)
                .setTimestamp();

            if (error) {
                embed.addFields({
                    name: 'Hata Detayı',
                    value: `\`\`\`\n${error.stack || error.message || error}\n\`\`\``.slice(0, 1024)
                });
            }

            await this.webhookClient.send({ embeds: [embed] });
        } catch (err) {
            console.error('[LOGGER] Webhook log gönderilemedi:', err.message);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 📊 LOG METODLARI
    // ─────────────────────────────────────────────────────────────

    /**
     * Bilgi logu
     */
    info(message, ...args) {
        if (!config.logging.levels.info) return;
        this.consoleLog('INFO', 'ℹ️', '\x1b[36m', message, ...args);
        this.webhookLog('INFO', config.colors.info, message);
    }

    /**
     * Başarı logu
     */
    success(message, ...args) {
        if (!config.logging.levels.info) return;
        this.consoleLog('SUCCESS', '✅', '\x1b[32m', message, ...args);
        this.webhookLog('SUCCESS', config.colors.success, message);
    }

    /**
     * Uyarı logu
     */
    warn(message, ...args) {
        if (!config.logging.levels.warn) return;
        this.consoleLog('WARN', '⚠️', '\x1b[33m', message, ...args);
        this.webhookLog('WARN', config.colors.warning, message);
    }

    /**
     * Hata logu
     */
    error(message, error = null, ...args) {
        if (!config.logging.levels.error) return;
        this.consoleLog('ERROR', '❌', '\x1b[31m', message, error || '', ...args);
        this.webhookLog('ERROR', config.colors.error, message, error);
    }

    /**
     * Debug logu (sadece dev mode'da)
     */
    debug(message, ...args) {
        if (!config.logging.levels.debug) return;
        this.consoleLog('DEBUG', '🔧', '\x1b[35m', message, ...args);
    }

    /**
     * Komut logu
     */
    command(user, commandName, guildName) {
        if (!config.logging.levels.info) return;
        const message = `${user} kullanıcısı "${commandName}" komutunu kullandı [${guildName}]`;
        this.consoleLog('COMMAND', '⚡', '\x1b[34m', message);
    }

    /**
     * Sistem başlatma logu
     */
    startup(botTag, guildCount) {
        const border = '═'.repeat(50);
        console.log('\x1b[36m');
        console.log(border);
        console.log('  🤖 AKIRA BOT BAŞLATILDI');
        console.log(border);
        console.log(`  📛 Bot: ${botTag}`);
        console.log(`  🏠 Sunucu: ${guildCount}`);
        console.log(`  📅 Tarih: ${this.getTimestamp()}`);
        console.log(border);
        console.log('\x1b[0m');
    }
}

// Singleton instance
module.exports = new Logger();

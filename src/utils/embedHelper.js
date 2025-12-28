/**
 * ═══════════════════════════════════════════════════════════════
 * 🛠️ AKIRA BOT - EMBED BUILDER UTILITY
 * ═══════════════════════════════════════════════════════════════
 * 
 * Önceden yapılandırılmış embed şablonları
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/botConfig');

class EmbedHelper {
    /**
     * Başarı embed'i oluştur
     */
    static success(title, description) {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.success} ${title}`)
            .setDescription(description)
            .setColor(config.colors.success)
            .setTimestamp();
    }

    /**
     * Hata embed'i oluştur
     */
    static error(title, description) {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.error} ${title}`)
            .setDescription(description)
            .setColor(config.colors.error)
            .setTimestamp();
    }

    /**
     * Uyarı embed'i oluştur
     */
    static warning(title, description) {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.warning} ${title}`)
            .setDescription(description)
            .setColor(config.colors.warning)
            .setTimestamp();
    }

    /**
     * Bilgi embed'i oluştur
     */
    static info(title, description) {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.info} ${title}`)
            .setDescription(description)
            .setColor(config.colors.info)
            .setTimestamp();
    }

    /**
     * Cooldown embed'i oluştur
     */
    static cooldown(remainingTime) {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.cooldown} Yavaş Ol!`)
            .setDescription(`Bu komutu tekrar kullanmak için **${remainingTime}** beklemelisin.`)
            .setColor(config.colors.warning)
            .setTimestamp();
    }

    /**
     * Yetki hatası embed'i oluştur
     */
    static noPermission(missingPermissions = []) {
        let description = 'Bu komutu kullanmak için yetkin yok.';
        
        if (missingPermissions.length > 0) {
            description += `\n\n**Eksik Yetkiler:**\n${missingPermissions.map(p => `• ${p}`).join('\n')}`;
        }

        return new EmbedBuilder()
            .setTitle(`${config.emojis.error} Yetersiz Yetki`)
            .setDescription(description)
            .setColor(config.colors.error)
            .setTimestamp();
    }

    /**
     * Geliştirici komutu embed'i
     */
    static developerOnly() {
        return new EmbedBuilder()
            .setTitle(`${config.emojis.error} Geliştirici Komutu`)
            .setDescription('Bu komut sadece bot geliştiricileri tarafından kullanılabilir.')
            .setColor(config.colors.error)
            .setTimestamp();
    }

    /**
     * Moderasyon logu embed'i
     */
    static modLog(action, moderator, target, reason) {
        const actionEmojis = {
            ban: config.emojis.ban,
            kick: config.emojis.kick,
            mute: config.emojis.mute,
            warn: config.emojis.warn
        };

        return new EmbedBuilder()
            .setTitle(`${actionEmojis[action] || '⚡'} Moderasyon İşlemi`)
            .addFields(
                { name: 'İşlem', value: action.toUpperCase(), inline: true },
                { name: 'Moderatör', value: `${moderator}`, inline: true },
                { name: 'Hedef', value: `${target}`, inline: true },
                { name: 'Sebep', value: reason || 'Belirtilmedi' }
            )
            .setColor(config.colors.warning)
            .setTimestamp();
    }

    /**
     * Özel embed oluştur
     */
    static custom(options = {}) {
        const embed = new EmbedBuilder();

        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.color) embed.setColor(options.color);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.author) embed.setAuthor(options.author);
        if (options.footer) embed.setFooter(options.footer);
        if (options.fields) embed.addFields(options.fields);
        if (options.timestamp !== false) embed.setTimestamp();

        return embed;
    }
}

module.exports = EmbedHelper;

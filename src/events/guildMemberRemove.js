/**
 * ═══════════════════════════════════════════════════════════════
 * 👋 AKIRA BOT - GUILD MEMBER REMOVE EVENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucudan üye ayrıldığında tetiklenir.
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/botConfig');
const { Logger } = require('../utils');
const { GuildSettings } = require('../database');

module.exports = {
    name: 'guildMemberRemove',
    once: false,

    async execute(member, client) {
        // Sadece hedef sunucuda çalış
        if (member.guild.id !== config.bot.guildId) return;

        try {
            // ─────────────────────────────────────────────────────────────
            // ⚙️ SUNUCU AYARLARINI AL
            // ─────────────────────────────────────────────────────────────
            const settings = await GuildSettings.findOrCreate(member.guild.id);

            // ─────────────────────────────────────────────────────────────
            // 👋 AYRILMA MESAJI
            // ─────────────────────────────────────────────────────────────
            if (settings.leaveChannel) {
                const channel = member.guild.channels.cache.get(settings.leaveChannel);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('👋 Görüşürüz!')
                        .setDescription(`**${member.user.tag}** sunucudan ayrıldı.`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setColor(config.colors.error)
                        .setFooter({ text: `Kalan üye: ${member.guild.memberCount}` })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(e => {
                        Logger.error('Ayrılma mesajı gönderilemedi:', e);
                    });
                }
            }

            Logger.info(`Üye ayrıldı: ${member.user.tag} (${member.guild.name})`);

        } catch (error) {
            Logger.error('GuildMemberRemove event hatası:', error);
        }
    }
};

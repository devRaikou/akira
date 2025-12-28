/**
 * ═══════════════════════════════════════════════════════════════
 * 👋 AKIRA BOT - GUILD MEMBER ADD EVENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucuya yeni üye katıldığında tetiklenir.
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config/botConfig');
const { Logger } = require('../utils');
const { GuildSettings, User } = require('../database');

module.exports = {
    name: 'guildMemberAdd',
    once: false,

    async execute(member, client) {
        // Sadece hedef sunucuda çalış
        if (member.guild.id !== config.bot.guildId) return;

        try {
            // ─────────────────────────────────────────────────────────────
            // 📝 KULLANICI KAYDI
            // ─────────────────────────────────────────────────────────────
            await User.findOrCreate(
                member.id,
                member.user.username,
                member.guild.id
            );

            // ─────────────────────────────────────────────────────────────
            // ⚙️ SUNUCU AYARLARINI AL
            // ─────────────────────────────────────────────────────────────
            const settings = await GuildSettings.findOrCreate(member.guild.id);

            // ─────────────────────────────────────────────────────────────
            // 🎭 OTOMATİK ROL
            // ─────────────────────────────────────────────────────────────
            if (settings.autoRole) {
                const role = member.guild.roles.cache.get(settings.autoRole);
                if (role) {
                    await member.roles.add(role).catch(e => {
                        Logger.error('Otomatik rol verilemedi:', e);
                    });
                }
            }

            // ─────────────────────────────────────────────────────────────
            // 👋 HOŞGELDİN MESAJI
            // ─────────────────────────────────────────────────────────────
            if (settings.welcomeChannel) {
                const channel = member.guild.channels.cache.get(settings.welcomeChannel);
                if (channel) {
                    const welcomeMessage = settings.welcomeMessage
                        .replace('{user}', `<@${member.id}>`)
                        .replace('{username}', member.user.username)
                        .replace('{server}', member.guild.name)
                        .replace('{memberCount}', member.guild.memberCount);

                    const embed = new EmbedBuilder()
                        .setTitle('👋 Hoş Geldin!')
                        .setDescription(welcomeMessage)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                        .setColor(config.colors.success)
                        .setFooter({ text: `Üye #${member.guild.memberCount}` })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] }).catch(e => {
                        Logger.error('Hoşgeldin mesajı gönderilemedi:', e);
                    });
                }
            }

            Logger.info(`Yeni üye: ${member.user.tag} (${member.guild.name})`);

        } catch (error) {
            Logger.error('GuildMemberAdd event hatası:', error);
        }
    }
};

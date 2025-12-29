/**
 * ═══════════════════════════════════════════════════════════════
 * 🎖️ AKIRA BOT - RANK KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcının seviye kartını gösterir
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { UserLevel, GuildSettings } = require('../../database');
const { createRankCard, EmbedHelper } = require('../../utils');
const config = require('../../config/botConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Seviye kartını görüntüle')
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Seviyesine bakılacak kullanıcı')
                .setRequired(false)
        ),

    cooldown: 10,
    developerOnly: false,

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('kullanici') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Bot kontrolü
        if (targetUser.bot) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Botların seviye bilgisi bulunmuyor!')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            // Sunucu ayarlarını kontrol et
            const settings = await GuildSettings.findOrCreate(interaction.guild.id);
            
            if (!settings.levelSystem?.enabled) {
                return await interaction.editReply({
                    embeds: [EmbedHelper.warning('Sistem Kapalı', 'Bu sunucuda seviye sistemi aktif değil.')]
                });
            }

            // Kullanıcı verisini al
            const userData = await UserLevel.findOrCreate(targetUser.id, interaction.guild.id, {
                username: targetUser.username,
                displayName: targetMember?.displayName,
                avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
            });

            // Sıralamayı al
            const rankData = await UserLevel.getUserRank(targetUser.id, interaction.guild.id);
            const rank = rankData?.rank || 1;

            // Gerekli XP hesapla
            const requiredXp = UserLevel.calculateRequiredXp(userData.level);

            // Status bilgisi
            let status = 'offline';
            if (targetMember?.presence) {
                status = targetMember.presence.status || 'offline';
            }

            // Rank kartı oluştur
            const attachment = await createRankCard({
                username: targetUser.username,
                displayName: targetMember?.displayName || null,
                avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                level: userData.level,
                rank: rank,
                currentXp: userData.xp,
                requiredXp: requiredXp,
                totalXp: userData.totalXp,
                messageCount: userData.messageCount,
                badges: userData.badges || [],
                status: status
            }, {
                background: userData.cardSettings?.background || { type: 'gradient', value: '#1a1a2e,#16213e,#0f3460' },
                progressBarColor: userData.cardSettings?.progressBarColor || '#5865F2',
                accentColor: userData.cardSettings?.accentColor || '#5865F2',
                textColor: userData.cardSettings?.textColor || '#ffffff',
                opacity: userData.cardSettings?.opacity || 0.9
            });

            // Ek bilgiler embed
            const infoEmbed = new EmbedBuilder()
                .setColor(config.colors.primary)
                .setFooter({ 
                    text: `${interaction.guild.name} • Seviye Sistemi`, 
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            // XP boost aktif mi?
            if (userData.xpMultiplier > 1 && userData.boostExpiresAt && new Date(userData.boostExpiresAt) > new Date()) {
                infoEmbed.addFields({
                    name: '🚀 XP Boost Aktif',
                    value: `**x${userData.xpMultiplier}** çarpan • Bitiş: <t:${Math.floor(new Date(userData.boostExpiresAt).getTime() / 1000)}:R>`,
                    inline: false
                });
            }

            await interaction.editReply({ 
                files: [attachment]
            });

        } catch (error) {
            console.error('Rank komutu hatası:', error);
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', 'Rank kartı oluşturulurken bir hata oluştu.')]
            });
        }
    }
};

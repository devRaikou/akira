/**
 * ═══════════════════════════════════════════════════════════════
 * ℹ️ AKIRA BOT - SUNUCU BİLGİ KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Sunucu hakkında detaylı bilgi gösterir.
 */

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config/botConfig');
const { formatDate, formatDuration } = require('../../utils/helpers');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucu hakkında detaylı bilgi gösterir.'),

    // Komut ayarları
    cooldown: 10,
    developerOnly: false,
    requiredPermissions: [],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const guild = interaction.guild;

        // Kanal sayıları
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // Üye sayıları
        const members = guild.members.cache;
        const humans = members.filter(m => !m.user.bot).size;
        const bots = members.filter(m => m.user.bot).size;
        const online = members.filter(m => m.presence?.status !== 'offline').size;

        // Boost bilgisi
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        // Doğrulama seviyesi
        const verificationLevels = {
            0: 'Yok',
            1: 'Düşük',
            2: 'Orta',
            3: 'Yüksek',
            4: 'Çok Yüksek'
        };

        // Sunucu yaşı
        const createdAt = guild.createdAt;
        const age = formatDuration(Date.now() - createdAt.getTime());

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setColor(config.colors.primary)
            .addFields(
                {
                    name: '👑 Sunucu Sahibi',
                    value: `<@${guild.ownerId}>`,
                    inline: true
                },
                {
                    name: '📅 Kuruluş Tarihi',
                    value: formatDate(createdAt),
                    inline: true
                },
                {
                    name: '⏳ Sunucu Yaşı',
                    value: age,
                    inline: true
                },
                {
                    name: `👥 Üyeler (${guild.memberCount})`,
                    value: `👤 İnsan: ${humans}\n🤖 Bot: ${bots}\n🟢 Çevrimiçi: ${online}`,
                    inline: true
                },
                {
                    name: `📁 Kanallar (${channels.size})`,
                    value: `💬 Yazı: ${textChannels}\n🔊 Ses: ${voiceChannels}\n📂 Kategori: ${categories}`,
                    inline: true
                },
                {
                    name: '🎭 Roller',
                    value: `${guild.roles.cache.size} rol`,
                    inline: true
                },
                {
                    name: '💎 Boost Durumu',
                    value: `Seviye: ${boostLevel}\nBoost: ${boostCount}`,
                    inline: true
                },
                {
                    name: '🔒 Doğrulama',
                    value: verificationLevels[guild.verificationLevel] || 'Bilinmiyor',
                    inline: true
                },
                {
                    name: '😀 Emoji',
                    value: `${guild.emojis.cache.size} emoji`,
                    inline: true
                }
            )
            .setImage(guild.bannerURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: `ID: ${guild.id}` })
            .setTimestamp();

        // Sunucu açıklaması varsa ekle
        if (guild.description) {
            embed.setDescription(guild.description);
        }

        await interaction.reply({ embeds: [embed] });
    }
};

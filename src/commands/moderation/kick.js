/**
 * ═══════════════════════════════════════════════════════════════
 * 👢 AKIRA BOT - KICK KOMUTU (GELİŞMİŞ)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıyı sunucudan atar.
 * - Onay butonu ile güvenli işlem
 * - Detaylı log kaydı
 * - Kullanıcı geçmişi görüntüleme
 * - DM bildirimi
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');
const { ModerationLog, GuildSettings } = require('../../database');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kullanıcıyı sunucudan atar.')
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Atılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Atma sebebi')
                .setMaxLength(500)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('sessiz')
                .setDescription('Kullanıcıya DM gönderilmesin mi?')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.KickMembers],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const silent = interaction.options.getBoolean('sessiz') || false;

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Üye sunucuda değilse
        if (!targetMember) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Kullanıcı Bulunamadı', 'Bu kullanıcı sunucuda değil veya bulunamadı!')],
                ephemeral: true
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini atamaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Kendini atamazsın!')],
                ephemeral: true
            });
        }

        // Botu atamaz
        if (targetUser.id === client.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Beni atamazsın!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini atamaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Sunucu sahibini atamazsın!')],
                ephemeral: true
            });
        }

        // Rol hiyerarşisi kontrolü
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hiyerarşi Hatası', 'Bu kullanıcının rolü seninle aynı veya daha yüksek!')],
                ephemeral: true
            });
        }

        // Bot'un rolü yeterli mi?
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Yetki Hatası', 'Bu kullanıcıyı atmak için yetkim yeterli değil!')],
                ephemeral: true
            });
        }

        // Kullanıcı atılabilir mi?
        if (!targetMember.kickable) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Başarısız', 'Bu kullanıcı atılamaz! (Yetki sorunu olabilir)')],
                ephemeral: true
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 📊 KULLANICI GEÇMİŞİ
        // ─────────────────────────────────────────────────────────────
        const userHistory = await ModerationLog.getUserHistory(interaction.guild.id, targetUser.id, 5);
        const userStats = {
            totalActions: userHistory.length,
            bans: userHistory.filter(h => h.action === 'ban').length,
            kicks: userHistory.filter(h => h.action === 'kick').length,
            warns: userHistory.filter(h => h.action === 'warn').length
        };

        // Kullanıcı bilgileri
        const memberInfo = {
            joinedAt: targetMember.joinedAt,
            createdAt: targetUser.createdAt,
            roles: targetMember.roles.cache.filter(r => r.id !== interaction.guild.id).size,
            highestRole: targetMember.roles.highest.name
        };

        // ─────────────────────────────────────────────────────────────
        // ⚠️ ONAY MESAJI
        // ─────────────────────────────────────────────────────────────
        const confirmEmbed = new EmbedBuilder()
            .setTitle('👢 Atma Onayı')
            .setDescription(`**${targetUser.tag}** kullanıcısını sunucudan atmak istediğine emin misin?`)
            .setColor(config.colors.warning)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { 
                    name: '👤 Hedef Kullanıcı', 
                    value: `${targetUser.tag}\n\`${targetUser.id}\``, 
                    inline: true 
                },
                { 
                    name: '🏷️ En Yüksek Rol', 
                    value: memberInfo.highestRole, 
                    inline: true 
                },
                { 
                    name: '📅 Sunucuya Katılım', 
                    value: `<t:${Math.floor(memberInfo.joinedAt.getTime() / 1000)}:R>`, 
                    inline: true 
                },
                { 
                    name: '📝 Sebep', 
                    value: reason, 
                    inline: false 
                }
            )
            .setTimestamp();

        // Kullanıcı geçmişi varsa ekle
        if (userStats.totalActions > 0) {
            confirmEmbed.addFields({
                name: '📋 Kullanıcı Geçmişi',
                value: `Toplam: **${userStats.totalActions}** işlem\n` +
                       `🔨 Ban: **${userStats.bans}** | 👢 Kick: **${userStats.kicks}** | ⚠️ Uyarı: **${userStats.warns}**`,
                inline: false
            });
        }

        // Son işlemler
        if (userHistory.length > 0) {
            const recentActions = userHistory.slice(0, 3).map(h => 
                `• **${h.action.toUpperCase()}** - <t:${Math.floor(h.createdAt.getTime() / 1000)}:R> - ${h.reason.substring(0, 30)}${h.reason.length > 30 ? '...' : ''}`
            ).join('\n');
            
            confirmEmbed.addFields({
                name: '🕐 Son İşlemler',
                value: recentActions,
                inline: false
            });
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('kick_confirm')
                    .setLabel('At')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('👢'),
                new ButtonBuilder()
                    .setCustomId('kick_cancel')
                    .setLabel('İptal')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        const response = await interaction.reply({
            embeds: [confirmEmbed],
            components: [buttons],
            fetchReply: true
        });

        // ─────────────────────────────────────────────────────────────
        // 🔘 BUTON ETKİLEŞİMİ
        // ─────────────────────────────────────────────────────────────
        try {
            const confirmation = await response.awaitMessageComponent({
                filter: i => i.user.id === interaction.user.id,
                componentType: ComponentType.Button,
                time: 30000
            });

            if (confirmation.customId === 'kick_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ İşlem İptal Edildi')
                    .setDescription('Atma işlemi iptal edildi.')
                    .setColor(config.colors.error)
                    .setTimestamp();

                return await confirmation.update({
                    embeds: [cancelEmbed],
                    components: []
                });
            }

            // ─────────────────────────────────────────────────────────────
            // 👢 ATMA İŞLEMİ
            // ─────────────────────────────────────────────────────────────
            await confirmation.deferUpdate();

            let dmSent = false;

            // Kullanıcıya DM gönder (sessiz mod değilse)
            if (!silent) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('👢 Sunucudan Atıldın')
                        .setDescription(`**${interaction.guild.name}** sunucusundan atıldın.`)
                        .setColor(config.colors.warning)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
                        .addFields(
                            { name: '📝 Sebep', value: reason, inline: false },
                            { name: '👮 Moderatör', value: interaction.user.tag, inline: true },
                            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: `Sunucu ID: ${interaction.guild.id} • Tekrar katılabilirsin` })
                        .setTimestamp();

                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (e) {
                    // DM kapalıysa devam et
                }
            }

            // At
            await targetMember.kick(`[Case #?] ${reason} | Moderatör: ${interaction.user.tag}`);

            // ─────────────────────────────────────────────────────────────
            // 📝 LOG KAYDI
            // ─────────────────────────────────────────────────────────────
            const logEntry = await ModerationLog.createLog({
                guildId: interaction.guild.id,
                action: 'kick',
                target: {
                    userId: targetUser.id,
                    username: targetUser.tag,
                    displayName: targetMember.displayName,
                    avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
                },
                moderator: {
                    userId: interaction.user.id,
                    username: interaction.user.tag,
                    displayName: interaction.member.displayName
                },
                reason: reason,
                details: {
                    channelId: interaction.channel.id,
                    channelName: interaction.channel.name
                },
                dmSent: dmSent
            });

            // ─────────────────────────────────────────────────────────────
            // ✅ BAŞARI MESAJI
            // ─────────────────────────────────────────────────────────────
            const successEmbed = new EmbedBuilder()
                .setTitle('👢 Kullanıcı Atıldı')
                .setColor(config.colors.success)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(
                    { 
                        name: '👤 Atılan Kullanıcı', 
                        value: `${targetUser.tag}\n\`${targetUser.id}\``, 
                        inline: true 
                    },
                    { 
                        name: '👮 Moderatör', 
                        value: `${interaction.user.tag}`, 
                        inline: true 
                    },
                    { 
                        name: '📋 Case', 
                        value: `#${logEntry.caseId}`, 
                        inline: true 
                    },
                    { 
                        name: '📝 Sebep', 
                        value: reason, 
                        inline: false 
                    },
                    { 
                        name: '📬 DM Durumu', 
                        value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', 
                        inline: true 
                    },
                    { 
                        name: '📅 Sunucudaki Süre', 
                        value: formatDuration(Date.now() - memberInfo.joinedAt.getTime()), 
                        inline: true 
                    }
                )
                .setFooter({ text: `Case #${logEntry.caseId} • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            await confirmation.editReply({
                embeds: [successEmbed],
                components: []
            });

            // ─────────────────────────────────────────────────────────────
            // 📢 MOD LOG KANALI
            // ─────────────────────────────────────────────────────────────
            await sendModLog(interaction.guild, logEntry, targetUser, interaction.user, memberInfo);

        } catch (error) {
            if (error.code === 'InteractionCollectorError') {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Süre Doldu')
                    .setDescription('Onay süresi doldu. İşlem iptal edildi.')
                    .setColor(config.colors.error)
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: []
                });
            } else {
                console.error('Kick error:', error);
                const errorEmbed = EmbedHelper.error('Hata', `Atma başarısız: ${error.message}`);
                
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [errorEmbed], components: [] });
                } else {
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 🔧 YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────

/**
 * Süreyi okunabilir formata çevirir
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} yıl ${months % 12} ay`;
    if (months > 0) return `${months} ay ${days % 30} gün`;
    if (days > 0) return `${days} gün ${hours % 24} saat`;
    if (hours > 0) return `${hours} saat ${minutes % 60} dakika`;
    if (minutes > 0) return `${minutes} dakika`;
    return `${seconds} saniye`;
}

/**
 * Mod log kanalına mesaj gönderir
 */
async function sendModLog(guild, logEntry, target, moderator, memberInfo) {
    try {
        const settings = await GuildSettings.findOrCreate(guild.id);
        
        if (!settings.modLogChannel) return;

        const logChannel = await guild.channels.fetch(settings.modLogChannel).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('👢 Kullanıcı Atıldı')
            .setColor(config.colors.warning)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📋 Case', value: `#${logEntry.caseId}`, inline: true },
                { name: '👤 Kullanıcı', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '👮 Moderatör', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
                { name: '📝 Sebep', value: logEntry.reason, inline: false },
                { name: '📬 DM', value: logEntry.dmSent ? '✅' : '❌', inline: true },
                { name: '📅 Sunucuda', value: formatDuration(Date.now() - memberInfo.joinedAt.getTime()), inline: true }
            )
            .setFooter({ text: `Case #${logEntry.caseId}` })
            .setTimestamp();

        const logMessage = await logChannel.send({ embeds: [logEmbed] });
        
        // Log mesaj ID'sini kaydet
        await ModerationLog.updateCase(guild.id, logEntry.caseId, { logMessageId: logMessage.id });

    } catch (error) {
        console.error('Mod log error:', error);
    }
}

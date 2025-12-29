/**
 * ═══════════════════════════════════════════════════════════════
 * 🔨 AKIRA BOT - BAN KOMUTU (GELİŞMİŞ)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıyı sunucudan yasaklar.
 * - Onay butonu ile güvenli işlem
 * - Süre bazlı yasaklama (tempban)
 * - Detaylı log kaydı
 * - Kullanıcı geçmişi görüntüleme
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
        .setName('ban')
        .setDescription('Kullanıcıyı sunucudan yasaklar.')
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Yasaklanacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Yasaklama sebebi')
                .setMaxLength(500)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('sure')
                .setDescription('Yasaklama süresi (örn: 1d, 7d, 30d, permanent)')
                .setRequired(false)
                .addChoices(
                    { name: '1 Saat', value: '1h' },
                    { name: '6 Saat', value: '6h' },
                    { name: '12 Saat', value: '12h' },
                    { name: '1 Gün', value: '1d' },
                    { name: '3 Gün', value: '3d' },
                    { name: '7 Gün', value: '7d' },
                    { name: '14 Gün', value: '14d' },
                    { name: '30 Gün', value: '30d' },
                    { name: 'Kalıcı', value: 'permanent' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('mesaj_sil')
                .setDescription('Kaç günlük mesajları silinsin? (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('sessiz')
                .setDescription('Kullanıcıya DM gönderilmesin mi?')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.BanMembers],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const duration = interaction.options.getString('sure') || 'permanent';
        const deleteMessageDays = interaction.options.getInteger('mesaj_sil') || 0;
        const silent = interaction.options.getBoolean('sessiz') || false;

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini banlayamaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Kendini yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Botu banlayamaz
        if (targetUser.id === client.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Beni yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini banlayamaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Sunucu sahibini yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Rol hiyerarşisi kontrolü
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    embeds: [EmbedHelper.error('Hiyerarşi Hatası', 'Bu kullanıcının rolü seninle aynı veya daha yüksek!')],
                    ephemeral: true
                });
            }

            // Bot'un rolü yeterli mi?
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.reply({
                    embeds: [EmbedHelper.error('Yetki Hatası', 'Bu kullanıcıyı yasaklamak için yetkim yeterli değil!')],
                    ephemeral: true
                });
            }
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

        // Süre hesaplama
        const durationInfo = parseDuration(duration);
        const durationText = durationInfo.text;
        const expiresAt = durationInfo.expiresAt;

        // ─────────────────────────────────────────────────────────────
        // ⚠️ ONAY MESAJI
        // ─────────────────────────────────────────────────────────────
        const confirmEmbed = new EmbedBuilder()
            .setTitle('🔨 Yasaklama Onayı')
            .setDescription(`**${targetUser.tag}** kullanıcısını yasaklamak istediğine emin misin?`)
            .setColor(config.colors.warning)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { 
                    name: '👤 Hedef Kullanıcı', 
                    value: `${targetUser.tag}\n\`${targetUser.id}\``, 
                    inline: true 
                },
                { 
                    name: '⏱️ Süre', 
                    value: durationText, 
                    inline: true 
                },
                { 
                    name: '🗑️ Mesaj Silme', 
                    value: deleteMessageDays > 0 ? `Son ${deleteMessageDays} gün` : 'Yok', 
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

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ban_confirm')
                    .setLabel('Yasakla')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔨'),
                new ButtonBuilder()
                    .setCustomId('ban_cancel')
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

            if (confirmation.customId === 'ban_cancel') {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ İşlem İptal Edildi')
                    .setDescription('Yasaklama işlemi iptal edildi.')
                    .setColor(config.colors.error)
                    .setTimestamp();

                return await confirmation.update({
                    embeds: [cancelEmbed],
                    components: []
                });
            }

            // ─────────────────────────────────────────────────────────────
            // 🔨 YASAKLAMA İŞLEMİ
            // ─────────────────────────────────────────────────────────────
            await confirmation.deferUpdate();

            let dmSent = false;

            // Kullanıcıya DM gönder (sessiz mod değilse)
            if (!silent) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🔨 Sunucudan Yasaklandın')
                        .setDescription(`**${interaction.guild.name}** sunucusundan yasaklandın.`)
                        .setColor(config.colors.error)
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
                        .addFields(
                            { name: '📝 Sebep', value: reason, inline: false },
                            { name: '⏱️ Süre', value: durationText, inline: true },
                            { name: '👮 Moderatör', value: interaction.user.tag, inline: true }
                        )
                        .setFooter({ text: `Sunucu ID: ${interaction.guild.id}` })
                        .setTimestamp();

                    if (expiresAt) {
                        dmEmbed.addFields({
                            name: '📅 Bitiş Tarihi',
                            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
                            inline: false
                        });
                    }

                    await targetUser.send({ embeds: [dmEmbed] });
                    dmSent = true;
                } catch (e) {
                    // DM kapalıysa devam et
                }
            }

            // Yasakla
            await interaction.guild.members.ban(targetUser.id, {
                reason: `[Case #?] ${reason} | Moderatör: ${interaction.user.tag} | Süre: ${durationText}`,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });

            // ─────────────────────────────────────────────────────────────
            // 📝 LOG KAYDI
            // ─────────────────────────────────────────────────────────────
            const logEntry = await ModerationLog.createLog({
                guildId: interaction.guild.id,
                action: 'ban',
                target: {
                    userId: targetUser.id,
                    username: targetUser.tag,
                    displayName: targetMember?.displayName || targetUser.username,
                    avatarUrl: targetUser.displayAvatarURL({ dynamic: true })
                },
                moderator: {
                    userId: interaction.user.id,
                    username: interaction.user.tag,
                    displayName: interaction.member.displayName
                },
                reason: reason,
                duration: {
                    value: durationInfo.value,
                    unit: durationInfo.unit,
                    expiresAt: expiresAt
                },
                details: {
                    deletedMessageDays: deleteMessageDays,
                    channelId: interaction.channel.id,
                    channelName: interaction.channel.name
                },
                dmSent: dmSent
            });

            // Ban reason'ını case ID ile güncelle
            try {
                await interaction.guild.bans.edit(targetUser.id, {
                    reason: `[Case #${logEntry.caseId}] ${reason} | Moderatör: ${interaction.user.tag} | Süre: ${durationText}`
                });
            } catch (e) {
                // Güncelleme başarısız olursa devam et
            }

            // ─────────────────────────────────────────────────────────────
            // ✅ BAŞARI MESAJI
            // ─────────────────────────────────────────────────────────────
            const successEmbed = new EmbedBuilder()
                .setTitle('🔨 Kullanıcı Yasaklandı')
                .setColor(config.colors.success)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(
                    { 
                        name: '👤 Yasaklanan Kullanıcı', 
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
                        name: '⏱️ Süre', 
                        value: durationText, 
                        inline: true 
                    },
                    { 
                        name: '🗑️ Silinen Mesajlar', 
                        value: deleteMessageDays > 0 ? `Son ${deleteMessageDays} gün` : 'Yok', 
                        inline: true 
                    },
                    { 
                        name: '📬 DM Durumu', 
                        value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', 
                        inline: true 
                    }
                )
                .setFooter({ text: `Case #${logEntry.caseId} • ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (expiresAt) {
                successEmbed.addFields({
                    name: '📅 Bitiş Tarihi',
                    value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F> (<t:${Math.floor(expiresAt.getTime() / 1000)}:R>)`,
                    inline: false
                });
            }

            await confirmation.editReply({
                embeds: [successEmbed],
                components: []
            });

            // ─────────────────────────────────────────────────────────────
            // 📢 MOD LOG KANALI
            // ─────────────────────────────────────────────────────────────
            await sendModLog(interaction.guild, logEntry, targetUser, interaction.user);

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
                console.error('Ban error:', error);
                const errorEmbed = EmbedHelper.error('Hata', `Yasaklama başarısız: ${error.message}`);
                
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
 * Süre string'ini parse eder
 */
function parseDuration(duration) {
    const durations = {
        '1h': { value: 1, unit: 'hours', ms: 60 * 60 * 1000, text: '1 Saat' },
        '6h': { value: 6, unit: 'hours', ms: 6 * 60 * 60 * 1000, text: '6 Saat' },
        '12h': { value: 12, unit: 'hours', ms: 12 * 60 * 60 * 1000, text: '12 Saat' },
        '1d': { value: 1, unit: 'days', ms: 24 * 60 * 60 * 1000, text: '1 Gün' },
        '3d': { value: 3, unit: 'days', ms: 3 * 24 * 60 * 60 * 1000, text: '3 Gün' },
        '7d': { value: 7, unit: 'days', ms: 7 * 24 * 60 * 60 * 1000, text: '7 Gün' },
        '14d': { value: 14, unit: 'days', ms: 14 * 24 * 60 * 60 * 1000, text: '14 Gün' },
        '30d': { value: 30, unit: 'days', ms: 30 * 24 * 60 * 60 * 1000, text: '30 Gün' },
        'permanent': { value: null, unit: 'permanent', ms: null, text: 'Kalıcı' }
    };

    const durationInfo = durations[duration] || durations['permanent'];
    
    return {
        value: durationInfo.value,
        unit: durationInfo.unit,
        text: durationInfo.text,
        expiresAt: durationInfo.ms ? new Date(Date.now() + durationInfo.ms) : null
    };
}

/**
 * Mod log kanalına mesaj gönderir
 */
async function sendModLog(guild, logEntry, target, moderator) {
    try {
        const settings = await GuildSettings.findOrCreate(guild.id);
        
        if (!settings.modLogChannel) return;

        const logChannel = await guild.channels.fetch(settings.modLogChannel).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('🔨 Kullanıcı Yasaklandı')
            .setColor(config.colors.error)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📋 Case', value: `#${logEntry.caseId}`, inline: true },
                { name: '👤 Kullanıcı', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '👮 Moderatör', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
                { name: '📝 Sebep', value: logEntry.reason, inline: false },
                { name: '⏱️ Süre', value: logEntry.duration.unit === 'permanent' ? 'Kalıcı' : `${logEntry.duration.value} ${logEntry.duration.unit}`, inline: true },
                { name: '📬 DM', value: logEntry.dmSent ? '✅' : '❌', inline: true }
            )
            .setFooter({ text: `Case #${logEntry.caseId}` })
            .setTimestamp();

        if (logEntry.duration.expiresAt) {
            logEmbed.addFields({
                name: '📅 Bitiş',
                value: `<t:${Math.floor(logEntry.duration.expiresAt.getTime() / 1000)}:F>`,
                inline: true
            });
        }

        const logMessage = await logChannel.send({ embeds: [logEmbed] });
        
        // Log mesaj ID'sini kaydet
        await ModerationLog.updateCase(guild.id, logEntry.caseId, { logMessageId: logMessage.id });

    } catch (error) {
        console.error('Mod log error:', error);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 AKIRA BOT - CASE KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tek bir moderasyon kaydını detaylı görüntüler ve düzenler.
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');
const { ModerationLog } = require('../../database');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('case')
        .setDescription('Moderasyon kaydını görüntüle veya düzenle.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('goruntule')
                .setDescription('Bir case\'i detaylı görüntüle')
                .addIntegerOption(option =>
                    option
                        .setName('numara')
                        .setDescription('Case numarası')
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sebep')
                .setDescription('Bir case\'in sebebini güncelle')
                .addIntegerOption(option =>
                    option
                        .setName('numara')
                        .setDescription('Case numarası')
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('yeni_sebep')
                        .setDescription('Yeni sebep')
                        .setMaxLength(500)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sil')
                .setDescription('Bir case\'i geçersiz kıl (soft delete)')
                .addIntegerOption(option =>
                    option
                        .setName('numara')
                        .setDescription('Case numarası')
                        .setMinValue(1)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('neden')
                        .setDescription('Silme nedeni')
                        .setMaxLength(200)
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    // Komut ayarları
    cooldown: 3,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ModerateMembers],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const caseNumber = interaction.options.getInteger('numara');

        await interaction.deferReply();

        // Case'i bul
        const caseData = await ModerationLog.findByCase(interaction.guild.id, caseNumber);

        if (!caseData) {
            return await interaction.editReply({
                embeds: [EmbedHelper.error('Case Bulunamadı', `**#${caseNumber}** numaralı case bulunamadı.`)]
            });
        }

        switch (subcommand) {
            case 'goruntule':
                await handleView(interaction, caseData);
                break;
            case 'sebep':
                await handleUpdateReason(interaction, caseData);
                break;
            case 'sil':
                await handleRevoke(interaction, caseData);
                break;
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 👁️ CASE GÖRÜNTÜLEME
// ─────────────────────────────────────────────────────────────
async function handleView(interaction, caseData) {
    const embed = new EmbedBuilder()
        .setTitle(`${getActionEmoji(caseData.action)} Case #${caseData.caseId}`)
        .setColor(getActionColor(caseData.action))
        .addFields(
            {
                name: '📋 İşlem Türü',
                value: getActionName(caseData.action),
                inline: true
            },
            {
                name: '📅 Tarih',
                value: `<t:${Math.floor(caseData.createdAt.getTime() / 1000)}:F>\n(<t:${Math.floor(caseData.createdAt.getTime() / 1000)}:R>)`,
                inline: true
            },
            {
                name: '✅ Durum',
                value: caseData.active ? '🟢 Aktif' : '🔴 Geçersiz',
                inline: true
            },
            {
                name: '👤 Hedef Kullanıcı',
                value: `${caseData.target.username}\n\`${caseData.target.userId}\``,
                inline: true
            },
            {
                name: '👮 Moderatör',
                value: `${caseData.moderator.username}\n\`${caseData.moderator.userId}\``,
                inline: true
            },
            {
                name: '📬 DM Durumu',
                value: caseData.dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi',
                inline: true
            },
            {
                name: '📝 Sebep',
                value: caseData.reason,
                inline: false
            }
        )
        .setTimestamp();

    // Süre bilgisi (varsa)
    if (caseData.duration && caseData.duration.unit !== 'permanent') {
        embed.addFields({
            name: '⏱️ Süre',
            value: `${caseData.duration.value} ${getDurationUnitName(caseData.duration.unit)}`,
            inline: true
        });

        if (caseData.duration.expiresAt) {
            const expired = new Date(caseData.duration.expiresAt) < new Date();
            embed.addFields({
                name: '📅 Bitiş',
                value: expired 
                    ? `~~<t:${Math.floor(new Date(caseData.duration.expiresAt).getTime() / 1000)}:F>~~ (Sona erdi)` 
                    : `<t:${Math.floor(new Date(caseData.duration.expiresAt).getTime() / 1000)}:F>`,
                inline: true
            });
        }
    } else if (caseData.action === 'ban') {
        embed.addFields({
            name: '⏱️ Süre',
            value: 'Kalıcı',
            inline: true
        });
    }

    // Ek detaylar
    if (caseData.details) {
        const details = [];
        
        if (caseData.details.messagesDeleted) {
            details.push(`🗑️ Silinen Mesaj: **${caseData.details.messagesDeleted}**`);
        }
        if (caseData.details.deletedMessageDays) {
            details.push(`📅 Silinen Mesaj Günü: **${caseData.details.deletedMessageDays}**`);
        }
        if (caseData.details.channelName) {
            details.push(`📍 Kanal: **#${caseData.details.channelName}**`);
        }

        if (details.length > 0) {
            embed.addFields({
                name: '📊 Ek Detaylar',
                value: details.join('\n'),
                inline: false
            });
        }
    }

    // Geri alınma bilgisi
    if (caseData.revoked && caseData.revoked.isRevoked) {
        embed.addFields({
            name: '🚫 Geçersiz Kılındı',
            value: `**Kim:** <@${caseData.revoked.revokedBy}>\n` +
                   `**Tarih:** <t:${Math.floor(new Date(caseData.revoked.revokedAt).getTime() / 1000)}:F>\n` +
                   `**Neden:** ${caseData.revoked.revokeReason || 'Belirtilmedi'}`,
            inline: false
        });
    }

    // Avatar
    if (caseData.target.avatarUrl) {
        embed.setThumbnail(caseData.target.avatarUrl);
    }

    embed.setFooter({ text: `Case #${caseData.caseId}` });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// ✏️ SEBEP GÜNCELLEME
// ─────────────────────────────────────────────────────────────
async function handleUpdateReason(interaction, caseData) {
    const newReason = interaction.options.getString('yeni_sebep');
    const oldReason = caseData.reason;

    // Güncelle
    await ModerationLog.updateCase(interaction.guild.id, caseData.caseId, {
        reason: newReason
    });

    const embed = new EmbedBuilder()
        .setTitle(`✏️ Case #${caseData.caseId} Güncellendi`)
        .setColor(config.colors.success)
        .addFields(
            {
                name: '📋 İşlem',
                value: `${getActionEmoji(caseData.action)} ${getActionName(caseData.action)}`,
                inline: true
            },
            {
                name: '👤 Hedef',
                value: caseData.target.username,
                inline: true
            },
            {
                name: '✏️ Güncelleyen',
                value: interaction.user.tag,
                inline: true
            },
            {
                name: '📝 Eski Sebep',
                value: oldReason,
                inline: false
            },
            {
                name: '📝 Yeni Sebep',
                value: newReason,
                inline: false
            }
        )
        .setFooter({ text: `Case #${caseData.caseId}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 🗑️ CASE GEÇERSİZ KILMA
// ─────────────────────────────────────────────────────────────
async function handleRevoke(interaction, caseData) {
    const revokeReason = interaction.options.getString('neden');

    // Zaten geçersiz mi?
    if (caseData.revoked && caseData.revoked.isRevoked) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Zaten Geçersiz', `Case #${caseData.caseId} zaten geçersiz kılınmış.`)]
        });
    }

    // Geçersiz kıl
    await ModerationLog.revokeCase(
        interaction.guild.id, 
        caseData.caseId, 
        interaction.user.id, 
        revokeReason
    );

    const embed = new EmbedBuilder()
        .setTitle(`🚫 Case #${caseData.caseId} Geçersiz Kılındı`)
        .setColor(config.colors.error)
        .addFields(
            {
                name: '📋 İşlem',
                value: `${getActionEmoji(caseData.action)} ${getActionName(caseData.action)}`,
                inline: true
            },
            {
                name: '👤 Hedef',
                value: caseData.target.username,
                inline: true
            },
            {
                name: '🚫 Geçersiz Kılan',
                value: interaction.user.tag,
                inline: true
            },
            {
                name: '📝 Geçersiz Kılma Nedeni',
                value: revokeReason,
                inline: false
            }
        )
        .setFooter({ text: `Case #${caseData.caseId}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 🔧 YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────

function getActionEmoji(action) {
    const emojis = {
        ban: '🔨',
        unban: '🔓',
        kick: '👢',
        mute: '🔇',
        unmute: '🔊',
        warn: '⚠️',
        timeout: '⏰',
        clear: '🧹'
    };
    return emojis[action] || '📋';
}

function getActionName(action) {
    const names = {
        ban: 'Ban',
        unban: 'Unban',
        kick: 'Kick',
        mute: 'Mute',
        unmute: 'Unmute',
        warn: 'Uyarı',
        timeout: 'Timeout',
        clear: 'Mesaj Temizleme'
    };
    return names[action] || action;
}

function getActionColor(action) {
    const colors = {
        ban: config.colors.error,
        unban: config.colors.success,
        kick: config.colors.warning,
        mute: config.colors.error,
        unmute: config.colors.success,
        warn: config.colors.warning,
        timeout: config.colors.warning,
        clear: config.colors.info
    };
    return colors[action] || config.colors.primary;
}

function getDurationUnitName(unit) {
    const units = {
        seconds: 'Saniye',
        minutes: 'Dakika',
        hours: 'Saat',
        days: 'Gün',
        weeks: 'Hafta',
        permanent: 'Kalıcı'
    };
    return units[unit] || unit;
}

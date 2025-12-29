/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 AKIRA BOT - MODLOG KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Moderasyon kayıtlarını görüntüler.
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
const { ModerationLog } = require('../../database');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Moderasyon kayıtlarını görüntüler.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kullanici')
                .setDescription('Kullanıcının moderasyon geçmişini görüntüle')
                .addUserOption(option =>
                    option
                        .setName('hedef')
                        .setDescription('Geçmişi görüntülenecek kullanıcı')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('son')
                .setDescription('Son moderasyon işlemlerini görüntüle')
                .addIntegerOption(option =>
                    option
                        .setName('adet')
                        .setDescription('Gösterilecek kayıt sayısı (1-25)')
                        .setMinValue(1)
                        .setMaxValue(25)
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('tur')
                        .setDescription('Filtrelenecek işlem türü')
                        .setRequired(false)
                        .addChoices(
                            { name: '🔨 Ban', value: 'ban' },
                            { name: '👢 Kick', value: 'kick' },
                            { name: '⚠️ Uyarı', value: 'warn' },
                            { name: '🧹 Temizle', value: 'clear' },
                            { name: '🔇 Mute', value: 'mute' },
                            { name: '⏰ Timeout', value: 'timeout' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('moderator')
                .setDescription('Moderatörün işlemlerini görüntüle')
                .addUserOption(option =>
                    option
                        .setName('mod')
                        .setDescription('Moderatör')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('istatistik')
                .setDescription('Sunucu moderasyon istatistiklerini görüntüle')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ModerateMembers],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply();

        switch (subcommand) {
            case 'kullanici':
                await handleUserHistory(interaction);
                break;
            case 'son':
                await handleRecentLogs(interaction);
                break;
            case 'moderator':
                await handleModeratorLogs(interaction);
                break;
            case 'istatistik':
                await handleStats(interaction);
                break;
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 📋 KULLANICI GEÇMİŞİ
// ─────────────────────────────────────────────────────────────
async function handleUserHistory(interaction) {
    const targetUser = interaction.options.getUser('hedef');
    const history = await ModerationLog.getUserHistory(interaction.guild.id, targetUser.id, 25);

    if (history.length === 0) {
        return await interaction.editReply({
            embeds: [EmbedHelper.info('Kayıt Yok', `**${targetUser.tag}** kullanıcısına ait moderasyon kaydı bulunamadı.`)]
        });
    }

    // İstatistikler
    const stats = {
        ban: history.filter(h => h.action === 'ban').length,
        kick: history.filter(h => h.action === 'kick').length,
        warn: history.filter(h => h.action === 'warn').length,
        mute: history.filter(h => h.action === 'mute').length,
        timeout: history.filter(h => h.action === 'timeout').length,
        clear: history.filter(h => h.action === 'clear').length
    };

    const embed = new EmbedBuilder()
        .setTitle(`📋 ${targetUser.tag} - Moderasyon Geçmişi`)
        .setColor(config.colors.primary)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            {
                name: '📊 İstatistikler',
                value: `🔨 Ban: **${stats.ban}** | 👢 Kick: **${stats.kick}** | ⚠️ Uyarı: **${stats.warn}**\n` +
                       `🔇 Mute: **${stats.mute}** | ⏰ Timeout: **${stats.timeout}** | 🧹 Temizle: **${stats.clear}**`,
                inline: false
            }
        )
        .setFooter({ text: `Toplam ${history.length} kayıt` })
        .setTimestamp();

    // Son kayıtlar
    const recentLogs = history.slice(0, 10).map(log => {
        const emoji = getActionEmoji(log.action);
        const date = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
        const reason = log.reason.length > 50 ? log.reason.substring(0, 50) + '...' : log.reason;
        return `${emoji} **#${log.caseId}** | ${date}\n└ ${reason}`;
    }).join('\n\n');

    embed.addFields({
        name: '🕐 Son Kayıtlar',
        value: recentLogs || 'Kayıt yok',
        inline: false
    });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 📋 SON KAYITLAR
// ─────────────────────────────────────────────────────────────
async function handleRecentLogs(interaction) {
    const limit = interaction.options.getInteger('adet') || 10;
    const actionType = interaction.options.getString('tur');

    let logs;
    if (actionType) {
        logs = await ModerationLog.find({ 
            guildId: interaction.guild.id, 
            action: actionType 
        }).sort({ createdAt: -1 }).limit(limit);
    } else {
        logs = await ModerationLog.getRecentLogs(interaction.guild.id, limit);
    }

    if (logs.length === 0) {
        return await interaction.editReply({
            embeds: [EmbedHelper.info('Kayıt Yok', 'Moderasyon kaydı bulunamadı.')]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`📋 Son Moderasyon Kayıtları`)
        .setColor(config.colors.primary)
        .setDescription(actionType ? `Filtre: **${getActionName(actionType)}**` : null)
        .setFooter({ text: `${logs.length} kayıt gösteriliyor` })
        .setTimestamp();

    const logEntries = logs.map(log => {
        const emoji = getActionEmoji(log.action);
        const date = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
        const reason = log.reason.length > 40 ? log.reason.substring(0, 40) + '...' : log.reason;
        return `${emoji} **#${log.caseId}** | ${log.target.username}\n└ ${reason} • ${date}`;
    }).join('\n\n');

    embed.addFields({
        name: '📜 Kayıtlar',
        value: logEntries,
        inline: false
    });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 📋 MODERATÖR KAYITLARI
// ─────────────────────────────────────────────────────────────
async function handleModeratorLogs(interaction) {
    const moderator = interaction.options.getUser('mod');
    const logs = await ModerationLog.getModeratorLogs(interaction.guild.id, moderator.id, 25);

    if (logs.length === 0) {
        return await interaction.editReply({
            embeds: [EmbedHelper.info('Kayıt Yok', `**${moderator.tag}** moderatörüne ait işlem kaydı bulunamadı.`)]
        });
    }

    // İstatistikler
    const stats = {
        ban: logs.filter(h => h.action === 'ban').length,
        kick: logs.filter(h => h.action === 'kick').length,
        warn: logs.filter(h => h.action === 'warn').length,
        clear: logs.filter(h => h.action === 'clear').length
    };

    const embed = new EmbedBuilder()
        .setTitle(`👮 ${moderator.tag} - Moderasyon İşlemleri`)
        .setColor(config.colors.primary)
        .setThumbnail(moderator.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            {
                name: '📊 İstatistikler',
                value: `🔨 Ban: **${stats.ban}** | 👢 Kick: **${stats.kick}** | ⚠️ Uyarı: **${stats.warn}** | 🧹 Temizle: **${stats.clear}**`,
                inline: false
            }
        )
        .setFooter({ text: `Toplam ${logs.length} işlem` })
        .setTimestamp();

    // Son işlemler
    const recentLogs = logs.slice(0, 10).map(log => {
        const emoji = getActionEmoji(log.action);
        const date = `<t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
        return `${emoji} **#${log.caseId}** | ${log.target.username} • ${date}`;
    }).join('\n');

    embed.addFields({
        name: '🕐 Son İşlemler',
        value: recentLogs,
        inline: false
    });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 📊 İSTATİSTİKLER
// ─────────────────────────────────────────────────────────────
async function handleStats(interaction) {
    const stats = await ModerationLog.getGuildStats(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${interaction.guild.name} - Moderasyon İstatistikleri`)
        .setColor(config.colors.primary)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
        .addFields(
            {
                name: '📈 Genel İstatistikler',
                value: `Toplam İşlem: **${stats.total}**`,
                inline: false
            },
            {
                name: '🔨 Ban',
                value: `**${stats.ban}**`,
                inline: true
            },
            {
                name: '👢 Kick',
                value: `**${stats.kick}**`,
                inline: true
            },
            {
                name: '⚠️ Uyarı',
                value: `**${stats.warn}**`,
                inline: true
            },
            {
                name: '🔇 Mute',
                value: `**${stats.mute}**`,
                inline: true
            },
            {
                name: '⏰ Timeout',
                value: `**${stats.timeout}**`,
                inline: true
            },
            {
                name: '🧹 Temizle',
                value: `**${stats.clear}**`,
                inline: true
            }
        )
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

    // En son 5 işlem
    const recentLogs = await ModerationLog.getRecentLogs(interaction.guild.id, 5);
    if (recentLogs.length > 0) {
        const recent = recentLogs.map(log => {
            const emoji = getActionEmoji(log.action);
            return `${emoji} **#${log.caseId}** | ${log.target.username} • <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`;
        }).join('\n');

        embed.addFields({
            name: '🕐 Son İşlemler',
            value: recent,
            inline: false
        });
    }

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
        clear: 'Temizle'
    };
    return names[action] || action;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * ⏰ AKIRA BOT - TIMEOUT KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıyı geçici olarak susturur (Discord native timeout).
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
        .setName('timeout')
        .setDescription('Kullanıcıyı geçici olarak susturur.')
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Susturulacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sure')
                .setDescription('Susturma süresi')
                .setRequired(true)
                .addChoices(
                    { name: '60 Saniye', value: '60s' },
                    { name: '5 Dakika', value: '5m' },
                    { name: '10 Dakika', value: '10m' },
                    { name: '30 Dakika', value: '30m' },
                    { name: '1 Saat', value: '1h' },
                    { name: '3 Saat', value: '3h' },
                    { name: '6 Saat', value: '6h' },
                    { name: '12 Saat', value: '12h' },
                    { name: '1 Gün', value: '1d' },
                    { name: '3 Gün', value: '3d' },
                    { name: '1 Hafta', value: '7d' },
                    { name: '2 Hafta', value: '14d' },
                    { name: '28 Gün (Maksimum)', value: '28d' }
                )
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Susturma sebebi')
                .setMaxLength(500)
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('sessiz')
                .setDescription('Kullanıcıya DM gönderilmesin mi?')
                .setRequired(false)
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
        const targetUser = interaction.options.getUser('kullanici');
        const duration = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const silent = interaction.options.getBoolean('sessiz') || false;

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Üye sunucuda değilse
        if (!targetMember) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Kullanıcı Bulunamadı', 'Bu kullanıcı sunucuda değil!')],
                ephemeral: true
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini susturamaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Kendini susturamazsın!')],
                ephemeral: true
            });
        }

        // Botu susturamaz
        if (targetUser.id === client.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Beni susturamazsın!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini susturamaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Sunucu sahibini susturamazsın!')],
                ephemeral: true
            });
        }

        // Bot kontrolü
        if (targetUser.bot) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Botları susturamazsın!')],
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
                embeds: [EmbedHelper.error('Yetki Hatası', 'Bu kullanıcıyı susturmak için yetkim yeterli değil!')],
                ephemeral: true
            });
        }

        // Zaten timeout'ta mı?
        if (targetMember.isCommunicationDisabled()) {
            const currentTimeout = targetMember.communicationDisabledUntil;
            return await interaction.reply({
                embeds: [EmbedHelper.warning('Zaten Susturulmuş', 
                    `Bu kullanıcı zaten susturulmuş.\n` +
                    `**Bitiş:** <t:${Math.floor(currentTimeout.getTime() / 1000)}:F> (<t:${Math.floor(currentTimeout.getTime() / 1000)}:R>)`
                )],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // ─────────────────────────────────────────────────────────────
        // 📊 KULLANICI GEÇMİŞİ
        // ─────────────────────────────────────────────────────────────
        const userHistory = await ModerationLog.getUserHistory(interaction.guild.id, targetUser.id, 5);
        const previousTimeouts = await ModerationLog.getUserActionHistory(
            interaction.guild.id, 
            targetUser.id, 
            'timeout', 
            10
        );

        // Süre hesaplama
        const durationInfo = parseDuration(duration);

        // ─────────────────────────────────────────────────────────────
        // ⏰ TIMEOUT İŞLEMİ
        // ─────────────────────────────────────────────────────────────
        let dmSent = false;

        // Kullanıcıya DM gönder
        if (!silent) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⏰ Susturuldun')
                    .setDescription(`**${interaction.guild.name}** sunucusunda susturuldun.`)
                    .setColor(config.colors.warning)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
                    .addFields(
                        { name: '📝 Sebep', value: reason, inline: false },
                        { name: '⏱️ Süre', value: durationInfo.text, inline: true },
                        { name: '👮 Moderatör', value: interaction.user.tag, inline: true },
                        { 
                            name: '📅 Bitiş', 
                            value: `<t:${Math.floor(durationInfo.expiresAt.getTime() / 1000)}:F>`, 
                            inline: false 
                        }
                    )
                    .setFooter({ text: 'Bu süre boyunca mesaj gönderemez, tepki ekleyemez ve sesli kanallara katılamazsın.' })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
                dmSent = true;
            } catch (e) {
                // DM kapalıysa devam et
            }
        }

        // Timeout uygula
        await targetMember.timeout(durationInfo.ms, `[Case #?] ${reason} | Moderatör: ${interaction.user.tag}`);

        // ─────────────────────────────────────────────────────────────
        // 📝 LOG KAYDI
        // ─────────────────────────────────────────────────────────────
        const logEntry = await ModerationLog.createLog({
            guildId: interaction.guild.id,
            action: 'timeout',
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
            duration: {
                value: durationInfo.value,
                unit: durationInfo.unit,
                expiresAt: durationInfo.expiresAt
            },
            details: {
                channelId: interaction.channel.id,
                channelName: interaction.channel.name
            },
            dmSent: dmSent
        });

        // ─────────────────────────────────────────────────────────────
        // ✅ BAŞARI MESAJI
        // ─────────────────────────────────────────────────────────────
        const totalTimeouts = previousTimeouts.length + 1;
        
        const successEmbed = new EmbedBuilder()
            .setTitle('⏰ Kullanıcı Susturuldu')
            .setColor(config.colors.success)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { 
                    name: '👤 Susturulan Kullanıcı', 
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
                    value: durationInfo.text, 
                    inline: true 
                },
                { 
                    name: '📅 Bitiş', 
                    value: `<t:${Math.floor(durationInfo.expiresAt.getTime() / 1000)}:F>\n(<t:${Math.floor(durationInfo.expiresAt.getTime() / 1000)}:R>)`, 
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

        // Önceki timeout'lar
        if (totalTimeouts > 1) {
            successEmbed.addFields({
                name: '⚠️ Geçmiş',
                value: `Bu kullanıcı daha önce **${totalTimeouts - 1}** kez susturulmuş.`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [successEmbed] });

        // ─────────────────────────────────────────────────────────────
        // 📢 MOD LOG KANALI
        // ─────────────────────────────────────────────────────────────
        await sendModLog(interaction.guild, logEntry, targetUser, interaction.user, durationInfo);
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
        '60s': { value: 60, unit: 'seconds', ms: 60 * 1000, text: '60 Saniye' },
        '5m': { value: 5, unit: 'minutes', ms: 5 * 60 * 1000, text: '5 Dakika' },
        '10m': { value: 10, unit: 'minutes', ms: 10 * 60 * 1000, text: '10 Dakika' },
        '30m': { value: 30, unit: 'minutes', ms: 30 * 60 * 1000, text: '30 Dakika' },
        '1h': { value: 1, unit: 'hours', ms: 60 * 60 * 1000, text: '1 Saat' },
        '3h': { value: 3, unit: 'hours', ms: 3 * 60 * 60 * 1000, text: '3 Saat' },
        '6h': { value: 6, unit: 'hours', ms: 6 * 60 * 60 * 1000, text: '6 Saat' },
        '12h': { value: 12, unit: 'hours', ms: 12 * 60 * 60 * 1000, text: '12 Saat' },
        '1d': { value: 1, unit: 'days', ms: 24 * 60 * 60 * 1000, text: '1 Gün' },
        '3d': { value: 3, unit: 'days', ms: 3 * 24 * 60 * 60 * 1000, text: '3 Gün' },
        '7d': { value: 7, unit: 'days', ms: 7 * 24 * 60 * 60 * 1000, text: '1 Hafta' },
        '14d': { value: 14, unit: 'days', ms: 14 * 24 * 60 * 60 * 1000, text: '2 Hafta' },
        '28d': { value: 28, unit: 'days', ms: 28 * 24 * 60 * 60 * 1000, text: '28 Gün' }
    };

    const durationInfo = durations[duration] || durations['1h'];
    
    return {
        value: durationInfo.value,
        unit: durationInfo.unit,
        ms: durationInfo.ms,
        text: durationInfo.text,
        expiresAt: new Date(Date.now() + durationInfo.ms)
    };
}

/**
 * Mod log kanalına mesaj gönderir
 */
async function sendModLog(guild, logEntry, target, moderator, durationInfo) {
    try {
        const settings = await GuildSettings.findOrCreate(guild.id);
        
        if (!settings.modLogChannel) return;

        const logChannel = await guild.channels.fetch(settings.modLogChannel).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('⏰ Kullanıcı Susturuldu')
            .setColor(config.colors.warning)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📋 Case', value: `#${logEntry.caseId}`, inline: true },
                { name: '👤 Kullanıcı', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '👮 Moderatör', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
                { name: '📝 Sebep', value: logEntry.reason, inline: false },
                { name: '⏱️ Süre', value: durationInfo.text, inline: true },
                { name: '📅 Bitiş', value: `<t:${Math.floor(durationInfo.expiresAt.getTime() / 1000)}:R>`, inline: true },
                { name: '📬 DM', value: logEntry.dmSent ? '✅' : '❌', inline: true }
            )
            .setFooter({ text: `Case #${logEntry.caseId}` })
            .setTimestamp();

        const logMessage = await logChannel.send({ embeds: [logEmbed] });
        
        await ModerationLog.updateCase(guild.id, logEntry.caseId, { logMessageId: logMessage.id });

    } catch (error) {
        console.error('Mod log error:', error);
    }
}

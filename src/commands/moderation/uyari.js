/**
 * ═══════════════════════════════════════════════════════════════
 * ⚠️ AKIRA BOT - UYARI KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıya uyarı verir ve kayıt altına alır.
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits
} = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');
const { ModerationLog, GuildSettings } = require('../../database');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('uyari')
        .setDescription('Kullanıcıya uyarı verir.')
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Uyarılacak kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('sebep')
                .setDescription('Uyarı sebebi')
                .setMaxLength(500)
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('sessiz')
                .setDescription('Kullanıcıya DM gönderilmesin mi?')
                .setRequired(false)
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
        const targetUser = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const silent = interaction.options.getBoolean('sessiz') || false;

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini uyaramaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Kendine uyarı veremezsin!')],
                ephemeral: true
            });
        }

        // Botu uyaramaz
        if (targetUser.bot) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Botlara uyarı veremezsin!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini uyaramaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('İşlem Reddedildi', 'Sunucu sahibine uyarı veremezsin!')],
                ephemeral: true
            });
        }

        // Rol hiyerarşisi kontrolü
        if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hiyerarşi Hatası', 'Bu kullanıcının rolü seninle aynı veya daha yüksek!')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        // ─────────────────────────────────────────────────────────────
        // 📊 KULLANICI GEÇMİŞİ
        // ─────────────────────────────────────────────────────────────
        const previousWarnings = await ModerationLog.getUserActionHistory(
            interaction.guild.id, 
            targetUser.id, 
            'warn', 
            10
        );

        // ─────────────────────────────────────────────────────────────
        // 📝 LOG KAYDI
        // ─────────────────────────────────────────────────────────────
        let dmSent = false;

        // Kullanıcıya DM gönder
        if (!silent) {
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Uyarı Aldın')
                    .setDescription(`**${interaction.guild.name}** sunucusunda uyarı aldın.`)
                    .setColor(config.colors.warning)
                    .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 }))
                    .addFields(
                        { name: '📝 Sebep', value: reason, inline: false },
                        { name: '👮 Moderatör', value: interaction.user.tag, inline: true },
                        { name: '⚠️ Toplam Uyarı', value: `${previousWarnings.length + 1}`, inline: true }
                    )
                    .setFooter({ text: 'Lütfen sunucu kurallarına uy!' })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
                dmSent = true;
            } catch (e) {
                // DM kapalıysa devam et
            }
        }

        const logEntry = await ModerationLog.createLog({
            guildId: interaction.guild.id,
            action: 'warn',
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
            details: {
                channelId: interaction.channel.id,
                channelName: interaction.channel.name
            },
            dmSent: dmSent
        });

        // ─────────────────────────────────────────────────────────────
        // ✅ BAŞARI MESAJI
        // ─────────────────────────────────────────────────────────────
        const totalWarnings = previousWarnings.length + 1;
        
        const successEmbed = new EmbedBuilder()
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .setColor(config.colors.warning)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { 
                    name: '👤 Uyarılan Kullanıcı', 
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
                    name: '⚠️ Toplam Uyarı', 
                    value: `**${totalWarnings}** uyarı`, 
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

        // Uyarı sayısı yüksekse uyar
        if (totalWarnings >= 3) {
            successEmbed.addFields({
                name: '🚨 Dikkat',
                value: `Bu kullanıcı **${totalWarnings}** kez uyarıldı! Daha ciddi bir işlem düşünebilirsin.`,
                inline: false
            });
        }

        // Son uyarılar
        if (previousWarnings.length > 0) {
            const recentWarnings = previousWarnings.slice(0, 3).map((w, i) => 
                `${i + 1}. <t:${Math.floor(w.createdAt.getTime() / 1000)}:R> - ${w.reason.substring(0, 40)}${w.reason.length > 40 ? '...' : ''}`
            ).join('\n');
            
            successEmbed.addFields({
                name: '📋 Önceki Uyarılar',
                value: recentWarnings,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [successEmbed] });

        // ─────────────────────────────────────────────────────────────
        // 📢 MOD LOG KANALI
        // ─────────────────────────────────────────────────────────────
        await sendModLog(interaction.guild, logEntry, targetUser, interaction.user, totalWarnings);
    }
};

/**
 * Mod log kanalına mesaj gönderir
 */
async function sendModLog(guild, logEntry, target, moderator, totalWarnings) {
    try {
        const settings = await GuildSettings.findOrCreate(guild.id);
        
        if (!settings.modLogChannel) return;

        const logChannel = await guild.channels.fetch(settings.modLogChannel).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('⚠️ Kullanıcı Uyarıldı')
            .setColor(config.colors.warning)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📋 Case', value: `#${logEntry.caseId}`, inline: true },
                { name: '👤 Kullanıcı', value: `${target.tag}\n\`${target.id}\``, inline: true },
                { name: '👮 Moderatör', value: `${moderator.tag}\n\`${moderator.id}\``, inline: true },
                { name: '📝 Sebep', value: logEntry.reason, inline: false },
                { name: '⚠️ Toplam Uyarı', value: `${totalWarnings}`, inline: true },
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

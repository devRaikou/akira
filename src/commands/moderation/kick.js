/**
 * ═══════════════════════════════════════════════════════════════
 * 👢 AKIRA BOT - KICK KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıyı sunucudan atar.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');

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

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Üye sunucuda değilse
        if (!targetMember) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Bu kullanıcı sunucuda değil!')],
                ephemeral: true
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini atamaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Kendini atamazsın!')],
                ephemeral: true
            });
        }

        // Botu atamaz
        if (targetUser.id === client.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Beni atamazsın!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini atamaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Sunucu sahibini atamazsın!')],
                ephemeral: true
            });
        }

        // Rol hiyerarşisi kontrolü
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Bu kullanıcının rolü seninle aynı veya daha yüksek!')],
                ephemeral: true
            });
        }

        // Bot'un rolü yeterli mi?
        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Bu kullanıcıyı atmak için yetkim yeterli değil!')],
                ephemeral: true
            });
        }

        // Kullanıcı atılabilir mi?
        if (!targetMember.kickable) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Bu kullanıcı atılamaz!')],
                ephemeral: true
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 👢 ATMA İŞLEMİ
        // ─────────────────────────────────────────────────────────────
        try {
            // Kullanıcıya DM gönder
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${config.emojis.kick} Atıldın!`)
                    .setDescription(`**${interaction.guild.name}** sunucusundan atıldın.`)
                    .addFields(
                        { name: 'Sebep', value: reason },
                        { name: 'Moderatör', value: interaction.user.tag }
                    )
                    .setColor(config.colors.warning)
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (e) {
                // DM kapalıysa devam et
            }

            // At
            await targetMember.kick(`${reason} | Moderatör: ${interaction.user.tag}`);

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setTitle(`${config.emojis.kick} Kullanıcı Atıldı`)
                .addFields(
                    { name: 'Kullanıcı', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Moderatör', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setColor(config.colors.success)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            await interaction.reply({
                embeds: [EmbedHelper.error('Hata', `Atma başarısız: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};

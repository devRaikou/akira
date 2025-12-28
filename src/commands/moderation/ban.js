/**
 * ═══════════════════════════════════════════════════════════════
 * 🔨 AKIRA BOT - BAN KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıyı sunucudan yasaklar.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');

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
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('mesaj_sil')
                .setDescription('Kaç günlük mesajları silinsin? (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
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
        const deleteMessageDays = interaction.options.getInteger('mesaj_sil') || 0;

        // Hedef üyeyi al
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // ─────────────────────────────────────────────────────────────
        // 🔒 GÜVENLİK KONTROLLERİ
        // ─────────────────────────────────────────────────────────────
        
        // Kendini banlayamaz
        if (targetUser.id === interaction.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Kendini yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Botu banlayamaz
        if (targetUser.id === client.user.id) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Beni yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Sunucu sahibini banlayamaz
        if (targetUser.id === interaction.guild.ownerId) {
            return await interaction.reply({
                embeds: [EmbedHelper.error('Hata', 'Sunucu sahibini yasaklayamazsın!')],
                ephemeral: true
            });
        }

        // Rol hiyerarşisi kontrolü
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return await interaction.reply({
                    embeds: [EmbedHelper.error('Hata', 'Bu kullanıcının rolü seninle aynı veya daha yüksek!')],
                    ephemeral: true
                });
            }

            // Bot'un rolü yeterli mi?
            if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
                return await interaction.reply({
                    embeds: [EmbedHelper.error('Hata', 'Bu kullanıcıyı yasaklamak için yetkim yeterli değil!')],
                    ephemeral: true
                });
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 🔨 YASAKLAMA İŞLEMİ
        // ─────────────────────────────────────────────────────────────
        try {
            // Kullanıcıya DM gönder
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`${config.emojis.ban} Yasaklandın!`)
                    .setDescription(`**${interaction.guild.name}** sunucusundan yasaklandın.`)
                    .addFields(
                        { name: 'Sebep', value: reason },
                        { name: 'Moderatör', value: interaction.user.tag }
                    )
                    .setColor(config.colors.error)
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (e) {
                // DM kapalıysa devam et
            }

            // Yasakla
            await interaction.guild.members.ban(targetUser.id, {
                reason: `${reason} | Moderatör: ${interaction.user.tag}`,
                deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
            });

            // Başarı mesajı
            const successEmbed = new EmbedBuilder()
                .setTitle(`${config.emojis.ban} Kullanıcı Yasaklandı`)
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
                embeds: [EmbedHelper.error('Hata', `Yasaklama başarısız: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};

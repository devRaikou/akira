/**
 * ═══════════════════════════════════════════════════════════════
 * 🧹 AKIRA BOT - TEMİZLE KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Belirtilen sayıda mesajı siler.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/botConfig');
const { EmbedHelper } = require('../../utils');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen sayıda mesajı siler.')
        .addIntegerOption(option =>
            option
                .setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('kullanici')
                .setDescription('Sadece bu kullanıcının mesajlarını sil')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    // Komut ayarları
    cooldown: 5,
    developerOnly: false,
    requiredPermissions: [PermissionFlagsBits.ManageMessages],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('miktar');
        const targetUser = interaction.options.getUser('kullanici');

        await interaction.deferReply({ ephemeral: true });

        try {
            // Mesajları al
            let messages = await interaction.channel.messages.fetch({ limit: 100 });

            // 14 günden eski mesajları filtrele (Discord API limiti)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            messages = messages.filter(msg => msg.createdTimestamp > twoWeeksAgo);

            // Kullanıcı filtresi
            if (targetUser) {
                messages = messages.filter(msg => msg.author.id === targetUser.id);
            }

            // İstenen miktara göre kes
            messages = [...messages.values()].slice(0, amount);

            if (messages.length === 0) {
                return await interaction.editReply({
                    embeds: [EmbedHelper.warning('Uyarı', 'Silinecek mesaj bulunamadı. (14 günden eski mesajlar silinemez)')]
                });
            }

            // Mesajları sil
            const deleted = await interaction.channel.bulkDelete(messages, true);

            // Başarı mesajı
            const embed = new EmbedBuilder()
                .setTitle(`${config.emojis.success} Mesajlar Silindi`)
                .setDescription(`**${deleted.size}** mesaj başarıyla silindi.`)
                .setColor(config.colors.success)
                .setTimestamp();

            if (targetUser) {
                embed.addFields({
                    name: 'Filtre',
                    value: `Sadece ${targetUser.tag} kullanıcısının mesajları`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

            // Log mesajı (kanal - birkaç saniye sonra sil)
            const logMsg = await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`${config.emojis.success} **${interaction.user.tag}** tarafından **${deleted.size}** mesaj silindi.`)
                        .setColor(config.colors.info)
                ]
            });

            setTimeout(() => logMsg.delete().catch(() => {}), 5000);

        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', `Mesajlar silinemedi: ${error.message}`)]
            });
        }
    }
};

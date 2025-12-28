/**
 * ═══════════════════════════════════════════════════════════════
 * 🔄 AKIRA BOT - RELOAD KOMUTU (GELİŞTİRİCİ)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Komutları yeniden yükler. SADECE geliştiriciler için!
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/botConfig');
const { reloadCommand, reloadAllCommands } = require('../../handlers/commandHandler');
const { EmbedHelper } = require('../../utils');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('[DEV] Komutları yeniden yükler.')
        .addStringOption(option =>
            option
                .setName('komut')
                .setDescription('Yeniden yüklenecek komut (boş = tümü)')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    // Komut ayarları
    cooldown: 0,
    developerOnly: true,
    requiredPermissions: [],

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const commandName = interaction.options.getString('komut');

        await interaction.deferReply({ ephemeral: true });

        try {
            let result;

            if (commandName) {
                // Tek komut yeniden yükle
                result = await reloadCommand(client, commandName);
            } else {
                // Tüm komutları yeniden yükle
                result = await reloadAllCommands(client);
            }

            const embed = result.success
                ? EmbedHelper.success('Reload Başarılı', result.message)
                : EmbedHelper.error('Reload Hatası', result.message);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply({
                embeds: [EmbedHelper.error('Hata', `Reload başarısız: ${error.message}`)]
            });
        }
    },

    // ─────────────────────────────────────────────────────────────
    // 🔄 AUTOCOMPLETE
    // ─────────────────────────────────────────────────────────────
    async autocomplete(interaction, client) {
        const focusedValue = interaction.options.getFocused().toLowerCase();

        const commands = client.commands
            .filter(cmd => cmd.data.name.toLowerCase().includes(focusedValue))
            .map(cmd => ({ name: cmd.data.name, value: cmd.data.name }))
            .slice(0, 25);

        await interaction.respond(commands);
    }
};

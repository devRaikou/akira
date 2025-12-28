/**
 * ═══════════════════════════════════════════════════════════════
 * ⚡ AKIRA BOT - INTERACTION CREATE EVENT
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tüm interaction'ları (slash commands, buttons, modals) işler.
 * Yetki kontrolü, cooldown ve hata yönetimi burada yapılır.
 */

const { InteractionType, PermissionFlagsBits } = require('discord.js');
const config = require('../config/botConfig');
const permissions = require('../config/permissions');
const { CooldownManager, EmbedHelper, Logger } = require('../utils');
const { handleCommandError } = require('../handlers/errorHandler');
const { User } = require('../database');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction, client) {
        // ─────────────────────────────────────────────────────────────
        // 🎮 SLASH COMMAND İŞLEME
        // ─────────────────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction, client);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // 🔘 BUTTON İŞLEME
        // ─────────────────────────────────────────────────────────────
        if (interaction.isButton()) {
            await handleButton(interaction, client);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // 📋 SELECT MENU İŞLEME
        // ─────────────────────────────────────────────────────────────
        if (interaction.isAnySelectMenu()) {
            await handleSelectMenu(interaction, client);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // 📝 MODAL İŞLEME
        // ─────────────────────────────────────────────────────────────
        if (interaction.isModalSubmit()) {
            await handleModal(interaction, client);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // 🔄 AUTOCOMPLETE İŞLEME
        // ─────────────────────────────────────────────────────────────
        if (interaction.isAutocomplete()) {
            await handleAutocomplete(interaction, client);
            return;
        }
    }
};

/**
 * Slash Command işleyici
 */
async function handleSlashCommand(interaction, client) {
    const command = client.commands.get(interaction.commandName);

    // Komut bulunamadı
    if (!command) {
        Logger.warn(`Bilinmeyen komut çağrıldı: ${interaction.commandName}`);
        return;
    }

    // Sunucu kontrolü (sadece belirlenen sunucuda çalış)
    if (interaction.guildId !== config.bot.guildId) {
        await interaction.reply({
            embeds: [EmbedHelper.error('Hata', 'Bu komut sadece belirli bir sunucuda kullanılabilir.')],
            ephemeral: true
        });
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // 👨‍💻 DEVELOPER KONTROLÜ
    // ─────────────────────────────────────────────────────────────
    const isDeveloper = config.developers.ids.includes(interaction.user.id);

    if (command.developerOnly && !isDeveloper) {
        await interaction.reply({
            embeds: [EmbedHelper.developerOnly()],
            ephemeral: true
        });
        return;
    }

    // ─────────────────────────────────────────────────────────────
    // 🔐 YETKİ KONTROLÜ
    // ─────────────────────────────────────────────────────────────
    if (command.requiredPermissions && command.requiredPermissions.length > 0) {
        const missingPerms = permissions.getMissingPermissions(
            interaction.member,
            command.requiredPermissions
        );

        if (missingPerms.length > 0) {
            await interaction.reply({
                embeds: [EmbedHelper.noPermission(missingPerms)],
                ephemeral: true
            });
            return;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ⏱️ COOLDOWN KONTROLÜ
    // ─────────────────────────────────────────────────────────────
    const cooldownSeconds = command.cooldown || config.cooldown.defaultCooldown;
    
    // Developer'lar cooldown'dan muaf
    if (!isDeveloper || !config.developers.privileges.bypassCooldown) {
        const remainingCooldown = await CooldownManager.check(
            interaction.user.id,
            interaction.commandName,
            interaction.guildId
        );

        if (remainingCooldown) {
            const formattedTime = CooldownManager.formatTime(remainingCooldown);
            await interaction.reply({
                embeds: [EmbedHelper.cooldown(formattedTime)],
                ephemeral: true
            });
            return;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUTU ÇALIŞTIR
    // ─────────────────────────────────────────────────────────────
    try {
        // Cooldown ayarla (komut başarılı olursa)
        await CooldownManager.set(
            interaction.user.id,
            interaction.commandName,
            interaction.guildId,
            cooldownSeconds
        );

        // Komutu çalıştır
        await command.execute(interaction, client);

        // Komut kullanımını logla
        Logger.command(interaction.user.tag, interaction.commandName, interaction.guild.name);

        // Kullanıcı istatistiğini güncelle (opsiyonel)
        try {
            await User.incrementCommandUsage(interaction.user.id, interaction.guildId);
        } catch (e) {
            // İstatistik hatası kritik değil, devam et
        }

    } catch (error) {
        // Cooldown'u temizle (hata durumunda)
        await CooldownManager.clear(
            interaction.user.id,
            interaction.commandName,
            interaction.guildId
        );

        await handleCommandError(interaction, error);
    }
}

/**
 * Button işleyici
 */
async function handleButton(interaction, client) {
    // Custom ID formatı: action_param1_param2
    const [action, ...params] = interaction.customId.split('_');

    Logger.debug(`Button tıklandı: ${interaction.customId}`);

    // Button handler'ları buraya eklenebilir
    // Örnek: if (action === 'confirm') { ... }
}

/**
 * Select Menu işleyici
 */
async function handleSelectMenu(interaction, client) {
    Logger.debug(`Select menu kullanıldı: ${interaction.customId}`);

    // Select menu handler'ları buraya eklenebilir
}

/**
 * Modal işleyici
 */
async function handleModal(interaction, client) {
    Logger.debug(`Modal gönderildi: ${interaction.customId}`);

    // Modal handler'ları buraya eklenebilir
}

/**
 * Autocomplete işleyici
 */
async function handleAutocomplete(interaction, client) {
    const command = client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) {
        return;
    }

    try {
        await command.autocomplete(interaction, client);
    } catch (error) {
        Logger.error(`Autocomplete hatası [${interaction.commandName}]:`, error);
    }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 AKIRA BOT - YARDIM KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tüm komutları kategorilere göre listeler.
 * Kullanıcının yetkisine göre sadece erişebildiği komutları gösterir.
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/botConfig');
const { getAccessibleCommands, getCommandsByCategory } = require('../../handlers/commandHandler');

module.exports = {
    // ─────────────────────────────────────────────────────────────
    // 📝 KOMUT META VERİLERİ
    // ─────────────────────────────────────────────────────────────
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları ve kullanımlarını gösterir.')
        .addStringOption(option =>
            option
                .setName('komut')
                .setDescription('Detaylı bilgi almak istediğin komut')
                .setRequired(false)
        ),

    // Komut ayarları
    cooldown: 5,                    // 5 saniye cooldown
    developerOnly: false,           // Herkes kullanabilir
    requiredPermissions: [],        // Özel yetki gerekmez

    // ─────────────────────────────────────────────────────────────
    // ▶️ KOMUT ÇALIŞTIRMA
    // ─────────────────────────────────────────────────────────────
    async execute(interaction, client) {
        const specificCommand = interaction.options.getString('komut');

        // Belirli bir komut sorgulandıysa
        if (specificCommand) {
            return await showCommandDetails(interaction, client, specificCommand);
        }

        // Tüm komutları göster
        return await showAllCommands(interaction, client);
    }
};

/**
 * Tüm komutları kategorilere göre göster
 */
async function showAllCommands(interaction, client) {
    // Kullanıcının erişebildiği komutları al
    const accessibleCommands = getAccessibleCommands(
        client,
        interaction.member,
        config.developers.ids
    );

    // Ana embed
    const embed = new EmbedBuilder()
        .setTitle('📚 Komut Listesi')
        .setDescription(
            `Merhaba **${interaction.user.username}**!\n\n` +
            `Aşağıda kullanabileceğin komutların listesi bulunuyor.\n` +
            `Detaylı bilgi için: \`/yardim komut:<komut_adı>\``
        )
        .setColor(config.colors.primary)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ 
            text: `Toplam ${accessibleCommands.size} komut kullanılabilir`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

    // Kategorilere göre grupla
    const categories = new Map();

    for (const [name, command] of accessibleCommands) {
        const category = command.category || 'other';
        if (!categories.has(category)) {
            categories.set(category, []);
        }
        categories.get(category).push(command);
    }

    // Her kategori için field ekle
    for (const [categoryKey, commands] of categories) {
        const categoryInfo = config.categories[categoryKey] || {
            name: categoryKey,
            emoji: '📁'
        };

        const commandList = commands
            .map(cmd => `\`/${cmd.data.name}\``)
            .join(' • ');

        embed.addFields({
            name: `${categoryInfo.emoji} ${categoryInfo.name}`,
            value: commandList || 'Komut yok',
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * Belirli bir komutun detaylarını göster
 */
async function showCommandDetails(interaction, client, commandName) {
    const command = client.commands.get(commandName.toLowerCase());

    if (!command) {
        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.error} Komut Bulunamadı`)
            .setDescription(`**${commandName}** adında bir komut bulunamadı.`)
            .setColor(config.colors.error)
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Yetki kontrolü
    const isDeveloper = config.developers.ids.includes(interaction.user.id);
    
    if (command.developerOnly && !isDeveloper) {
        const embed = new EmbedBuilder()
            .setTitle(`${config.emojis.error} Erişim Engellendi`)
            .setDescription('Bu komutun detaylarını görüntüleme yetkin yok.')
            .setColor(config.colors.error)
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Kategori bilgisi
    const categoryInfo = config.categories[command.category] || {
        name: command.category,
        emoji: '📁'
    };

    // Yetki listesi
    const permissions = require('../../config/permissions');
    const requiredPermsText = command.requiredPermissions?.length > 0
        ? command.requiredPermissions.map(p => permissions.permissionNames[p] || 'Bilinmiyor').join(', ')
        : 'Yok';

    // Detay embed'i
    const embed = new EmbedBuilder()
        .setTitle(`📖 /${command.data.name}`)
        .setDescription(command.data.description)
        .setColor(config.colors.info)
        .addFields(
            { 
                name: '📁 Kategori', 
                value: `${categoryInfo.emoji} ${categoryInfo.name}`, 
                inline: true 
            },
            { 
                name: '⏱️ Cooldown', 
                value: `${command.cooldown || config.cooldown.defaultCooldown} saniye`, 
                inline: true 
            },
            { 
                name: '👨‍💻 Geliştirici', 
                value: command.developerOnly ? 'Evet' : 'Hayır', 
                inline: true 
            },
            { 
                name: '🔐 Gerekli Yetkiler', 
                value: requiredPermsText, 
                inline: false 
            }
        )
        .setTimestamp()
        .setFooter({ text: 'Akira Bot • Yardım Sistemi' });

    // Komut seçenekleri varsa ekle
    if (command.data.options?.length > 0) {
        const optionsText = command.data.options.map(opt => {
            const required = opt.required ? '(zorunlu)' : '(opsiyonel)';
            return `• \`${opt.name}\` ${required}: ${opt.description}`;
        }).join('\n');

        embed.addFields({
            name: '⚙️ Parametreler',
            value: optionsText,
            inline: false
        });
    }

    await interaction.reply({ embeds: [embed] });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 🎨 AKIRA BOT - KART ÖZELLEŞTİRME KOMUTU
 * ═══════════════════════════════════════════════════════════════
 * 
 * Kullanıcıların rank kartlarını özelleştirmesi için
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { UserLevel } = require('../../database');
const { EmbedHelper, RankCard } = require('../../utils');
const config = require('../../config/botConfig');

// Ön tanımlı renk paletleri
const COLOR_PRESETS = {
    // Temel renkler
    fire: {
        name: '🔥 Ateş',
        background: ['#ff6b35', '#f7931e', '#ffd93d'],
        progressBar: '#ff4500',
        accent: '#fff'
    },
    ocean: {
        name: '🌊 Okyanus',
        background: ['#0077b6', '#00b4d8', '#90e0ef'],
        progressBar: '#00b4d8',
        accent: '#fff'
    },
    forest: {
        name: '🌲 Orman',
        background: ['#2d6a4f', '#40916c', '#74c69d'],
        progressBar: '#52b788',
        accent: '#fff'
    },
    sunset: {
        name: '🌅 Gün Batımı',
        background: ['#ff6b6b', '#feca57', '#ff9ff3'],
        progressBar: '#ff6b6b',
        accent: '#fff'
    },
    midnight: {
        name: '🌙 Gece Yarısı',
        background: ['#191970', '#000080', '#4169e1'],
        progressBar: '#7b68ee',
        accent: '#fff'
    },
    aurora: {
        name: '🌌 Aurora',
        background: ['#12c2e9', '#c471ed', '#f64f59'],
        progressBar: '#c471ed',
        accent: '#fff'
    },
    cyber: {
        name: '🤖 Cyber',
        background: ['#0d0d0d', '#1a1a2e', '#16213e'],
        progressBar: '#00ff88',
        accent: '#00ff88'
    },
    sakura: {
        name: '🌸 Sakura',
        background: ['#ffb7c5', '#ffc8dd', '#ffafcc'],
        progressBar: '#ff85a2',
        accent: '#5c374c'
    },
    neon: {
        name: '💜 Neon',
        background: ['#6c5ce7', '#a29bfe', '#fd79a8'],
        progressBar: '#fd79a8',
        accent: '#fff'
    },
    gold: {
        name: '👑 Altın',
        background: ['#f7dc6f', '#f0b27a', '#eb984e'],
        progressBar: '#d4ac0d',
        accent: '#1a1a1a'
    },
    arctic: {
        name: '❄️ Arktik',
        background: ['#74b9ff', '#81ecec', '#ffffff'],
        progressBar: '#0984e3',
        accent: '#2d3436'
    },
    lava: {
        name: '🌋 Lav',
        background: ['#c0392b', '#e74c3c', '#f39c12'],
        progressBar: '#e74c3c',
        accent: '#fff'
    },
    default: {
        name: '⚙️ Varsayılan',
        background: ['#667eea', '#764ba2'],
        progressBar: '#667eea',
        accent: '#fff'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kart')
        .setDescription('Rank kartını özelleştir')
        .addSubcommand(subcommand =>
            subcommand
                .setName('tema')
                .setDescription('Hazır tema seç')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('renk')
                .setDescription('Özel renk ayarla')
                .addStringOption(option =>
                    option
                        .setName('tip')
                        .setDescription('Hangi renk ayarlanacak')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎨 Arka Plan', value: 'background' },
                            { name: '📊 İlerleme Çubuğu', value: 'progressBar' },
                            { name: '✨ Vurgu Rengi', value: 'accent' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('renk')
                        .setDescription('HEX renk kodu (örn: #ff5733 veya ff5733)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('gradient')
                .setDescription('Arka plan gradient ayarla')
                .addStringOption(option =>
                    option
                        .setName('renk1')
                        .setDescription('İlk renk (HEX)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('renk2')
                        .setDescription('İkinci renk (HEX)')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('renk3')
                        .setDescription('Üçüncü renk (HEX - isteğe bağlı)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sifirla')
                .setDescription('Kart ayarlarını varsayılana döndür')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('onizleme')
                .setDescription('Kart önizlemesi göster')
        ),

    cooldown: 10,
    developerOnly: false,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'tema':
                    await handleTheme(interaction);
                    break;
                case 'renk':
                    await handleColor(interaction);
                    break;
                case 'gradient':
                    await handleGradient(interaction);
                    break;
                case 'sifirla':
                    await handleReset(interaction);
                    break;
                case 'onizleme':
                    await handlePreview(interaction);
                    break;
            }
        } catch (error) {
            console.error('Kart komutu hatası:', error);
            const replyMethod = interaction.deferred ? 'editReply' : 'reply';
            await interaction[replyMethod]({
                embeds: [EmbedHelper.error('Hata', error.message || 'Bir hata oluştu.')]
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// 🎨 TEMA SEÇİMİ
// ─────────────────────────────────────────────────────────────

async function handleTheme(interaction) {
    const themeOptions = Object.entries(COLOR_PRESETS).map(([key, value]) => ({
        label: value.name,
        value: key,
        description: `Gradient: ${value.background.join(' → ')}`
    }));

    // İlk 25 tema (Discord limiti)
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('theme_select')
        .setPlaceholder('🎨 Bir tema seç...')
        .addOptions(themeOptions.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setTitle('🎨 Tema Seçimi')
        .setDescription('Rank kartın için bir tema seç. Seçtikten sonra kartın otomatik güncellenecek.')
        .setColor(config.colors.primary)
        .addFields({
            name: '💡 İpucu',
            value: 'Özel renkler için `/kart renk` veya `/kart gradient` komutlarını kullanabilirsin.'
        })
        .setFooter({ text: '30 saniye içinde bir tema seç' });

    const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    try {
        const selection = await response.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 30_000,
            componentType: ComponentType.StringSelect
        });

        const selectedTheme = COLOR_PRESETS[selection.values[0]];

        // Kullanıcı verisini güncelle
        await UserLevel.findOrCreate(interaction.user.id, interaction.guild.id, {
            username: interaction.user.username,
            displayName: interaction.member.displayName,
            avatarUrl: interaction.user.displayAvatarURL({ dynamic: true })
        });

        await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, {
            backgroundColor: selectedTheme.background,
            progressBarColor: selectedTheme.progressBar,
            accentColor: selectedTheme.accent
        });

        const successEmbed = new EmbedBuilder()
            .setTitle('✅ Tema Uygulandı')
            .setDescription(`**${selectedTheme.name}** teması kartına uygulandı!`)
            .setColor(selectedTheme.progressBar)
            .addFields(
                { name: '🎨 Arka Plan', value: selectedTheme.background.join(' → '), inline: true },
                { name: '📊 İlerleme', value: selectedTheme.progressBar, inline: true },
                { name: '✨ Vurgu', value: selectedTheme.accent, inline: true }
            )
            .setFooter({ text: 'Önizleme için /kart onizleme kullan' });

        await selection.update({ embeds: [successEmbed], components: [] });

    } catch (error) {
        if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
            await interaction.editReply({
                embeds: [EmbedHelper.warning('Zaman Aşımı', 'Tema seçimi iptal edildi.')],
                components: []
            });
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 🎨 TEK RENK AYARLAMA
// ─────────────────────────────────────────────────────────────

async function handleColor(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString('tip');
    let color = interaction.options.getString('renk');

    // HEX formatını düzelt
    color = normalizeHex(color);
    
    if (!isValidHex(color)) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Geçersiz Renk', 'Lütfen geçerli bir HEX renk kodu gir (örn: #ff5733)')]
        });
    }

    // Kullanıcı verisini güncelle
    await UserLevel.findOrCreate(interaction.user.id, interaction.guild.id, {
        username: interaction.user.username,
        displayName: interaction.member.displayName,
        avatarUrl: interaction.user.displayAvatarURL({ dynamic: true })
    });

    const updateData = {};
    let typeName = '';

    switch (type) {
        case 'background':
            updateData.backgroundColor = [color, color];
            typeName = 'Arka Plan';
            break;
        case 'progressBar':
            updateData.progressBarColor = color;
            typeName = 'İlerleme Çubuğu';
            break;
        case 'accent':
            updateData.accentColor = color;
            typeName = 'Vurgu Rengi';
            break;
    }

    await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, updateData);

    const embed = new EmbedBuilder()
        .setTitle('✅ Renk Güncellendi')
        .setDescription(`**${typeName}** rengi **${color}** olarak ayarlandı.`)
        .setColor(color)
        .setFooter({ text: 'Önizleme için /kart onizleme kullan' });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 🌈 GRADIENT AYARLAMA
// ─────────────────────────────────────────────────────────────

async function handleGradient(interaction) {
    await interaction.deferReply();

    let color1 = normalizeHex(interaction.options.getString('renk1'));
    let color2 = normalizeHex(interaction.options.getString('renk2'));
    let color3 = interaction.options.getString('renk3');
    
    if (color3) color3 = normalizeHex(color3);

    // Renkleri doğrula
    if (!isValidHex(color1) || !isValidHex(color2)) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Geçersiz Renk', 'Lütfen geçerli HEX renk kodları gir (örn: #ff5733)')]
        });
    }

    if (color3 && !isValidHex(color3)) {
        return await interaction.editReply({
            embeds: [EmbedHelper.error('Geçersiz Renk', 'Üçüncü renk geçersiz. Lütfen geçerli bir HEX kodu gir.')]
        });
    }

    const gradient = color3 ? [color1, color2, color3] : [color1, color2];

    // Kullanıcı verisini güncelle
    await UserLevel.findOrCreate(interaction.user.id, interaction.guild.id, {
        username: interaction.user.username,
        displayName: interaction.member.displayName,
        avatarUrl: interaction.user.displayAvatarURL({ dynamic: true })
    });

    await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, {
        backgroundColor: gradient
    });

    const embed = new EmbedBuilder()
        .setTitle('✅ Gradient Ayarlandı')
        .setDescription(`Arka plan gradienti güncellendi!`)
        .setColor(color1)
        .addFields({
            name: '🎨 Gradient',
            value: gradient.join(' → ')
        })
        .setFooter({ text: 'Önizleme için /kart onizleme kullan' });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 🔄 SIFIRLAMA
// ─────────────────────────────────────────────────────────────

async function handleReset(interaction) {
    await interaction.deferReply();

    const userData = await UserLevel.findOne({
        discordId: interaction.user.id,
        guildId: interaction.guild.id
    });

    if (!userData) {
        return await interaction.editReply({
            embeds: [EmbedHelper.warning('Uyarı', 'Henüz bir rank kartın yok!')]
        });
    }

    await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, {
        backgroundColor: ['#667eea', '#764ba2'],
        progressBarColor: '#667eea',
        accentColor: '#ffffff'
    });

    const embed = new EmbedBuilder()
        .setTitle('🔄 Kart Sıfırlandı')
        .setDescription('Rank kart ayarların varsayılana döndürüldü.')
        .setColor(config.colors.success)
        .setFooter({ text: 'Önizleme için /kart onizleme kullan' });

    await interaction.editReply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// 👁️ ÖNİZLEME
// ─────────────────────────────────────────────────────────────

async function handlePreview(interaction) {
    await interaction.deferReply();

    let userData = await UserLevel.findOne({
        discordId: interaction.user.id,
        guildId: interaction.guild.id
    });

    if (!userData) {
        userData = await UserLevel.findOrCreate(interaction.user.id, interaction.guild.id, {
            username: interaction.user.username,
            displayName: interaction.member.displayName,
            avatarUrl: interaction.user.displayAvatarURL({ dynamic: true })
        });
    }

    // Rank hesapla
    const rank = await UserLevel.getUserRank(interaction.user.id, interaction.guild.id);

    try {
        // Rank kartı oluştur
        const cardBuffer = await RankCard.createRankCard({
            username: interaction.user.username,
            displayName: interaction.member.displayName,
            avatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
            level: userData.level,
            currentXp: userData.xp,
            requiredXp: userData.xpForNextLevel,
            totalXp: userData.totalXp,
            rank: rank,
            badges: userData.badges || [],
            cardSettings: userData.cardSettings || {}
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('card_theme')
                    .setLabel('Tema Değiştir')
                    .setEmoji('🎨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('card_reset')
                    .setLabel('Sıfırla')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.editReply({
            content: '**🖼️ Kart Önizlemen:**',
            files: [{ attachment: cardBuffer, name: 'rank_preview.png' }],
            components: [buttons]
        });

        // Buton etkileşimleri
        const collector = response.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60_000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'card_theme') {
                // Tema seçim menüsünü göster
                const themeOptions = Object.entries(COLOR_PRESETS).slice(0, 25).map(([key, value]) => ({
                    label: value.name,
                    value: key,
                    description: `Gradient: ${value.background.join(' → ')}`
                }));

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('quick_theme_select')
                    .setPlaceholder('🎨 Bir tema seç...')
                    .addOptions(themeOptions);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await i.update({ components: [row] });

            } else if (i.customId === 'card_reset') {
                await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, {
                    backgroundColor: ['#667eea', '#764ba2'],
                    progressBarColor: '#667eea',
                    accentColor: '#ffffff'
                });

                await i.update({
                    content: '✅ Kart ayarları sıfırlandı! Yeni önizleme için `/kart onizleme` kullan.',
                    components: []
                });

            } else if (i.customId === 'quick_theme_select') {
                const selectedTheme = COLOR_PRESETS[i.values[0]];

                await UserLevel.updateCardSettings(interaction.user.id, interaction.guild.id, {
                    backgroundColor: selectedTheme.background,
                    progressBarColor: selectedTheme.progressBar,
                    accentColor: selectedTheme.accent
                });

                await i.update({
                    content: `✅ **${selectedTheme.name}** teması uygulandı! Yeni önizleme için tekrar çalıştır.`,
                    components: []
                });
            }
        });

        collector.on('end', async () => {
            try {
                await response.edit({ components: [] });
            } catch (e) {}
        });

    } catch (error) {
        console.error('Kart önizleme hatası:', error);
        await interaction.editReply({
            embeds: [EmbedHelper.error('Hata', 'Kart oluşturulurken bir hata oluştu.')]
        });
    }
}

// ─────────────────────────────────────────────────────────────
// 🔧 YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────

function normalizeHex(color) {
    if (!color) return null;
    color = color.replace(/\s/g, '');
    if (!color.startsWith('#')) {
        color = '#' + color;
    }
    return color.toUpperCase();
}

function isValidHex(color) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * ═══════════════════════════════════════════════════════════════
 * ⚡ AKIRA BOT - COMMAND HANDLER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Slash komutlarını yükler ve yönetir.
 * Komutlar bot başlarken register EDİLMEZ, sadece yüklenir.
 */

const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const config = require('../config/botConfig');

/**
 * Tüm komutları yükle
 * @param {Client} client - Discord.js Client
 */
async function loadCommands(client) {
    // Komut koleksiyonu oluştur
    client.commands = new Collection();
    
    // Komut kategorileri (cooldown vs. için)
    client.commandCategories = new Map();

    const commandsPath = path.join(__dirname, '..', 'commands');
    
    // Komut klasörü yoksa oluştur
    if (!fs.existsSync(commandsPath)) {
        Logger.warn('Komut klasörü bulunamadı, oluşturuluyor...');
        fs.mkdirSync(commandsPath, { recursive: true });
        return;
    }

    // Kategori klasörlerini oku
    const categories = fs.readdirSync(commandsPath).filter(file => {
        return fs.statSync(path.join(commandsPath, file)).isDirectory();
    });

    let loadedCount = 0;

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(categoryPath, file);
                const command = require(filePath);

                // Komut validasyonu
                if (!validateCommand(command, file)) {
                    continue;
                }

                // Kategori bilgisi ekle
                command.category = category;
                command.filePath = filePath;

                // Koleksiyona ekle
                client.commands.set(command.data.name, command);
                loadedCount++;

                Logger.debug(`Komut yüklendi: ${command.data.name} [${category}]`);

            } catch (error) {
                Logger.error(`Komut yüklenemedi: ${file}`, error);
            }
        }

        // Kategori bilgisini kaydet
        client.commandCategories.set(category, {
            ...config.categories[category],
            commands: client.commands.filter(cmd => cmd.category === category).map(cmd => cmd.data.name)
        });
    }

    Logger.success(`${loadedCount} komut başarıyla yüklendi!`);
}

/**
 * Komut validasyonu
 */
function validateCommand(command, fileName) {
    const requiredProperties = ['data', 'execute'];
    const missingProperties = [];

    for (const prop of requiredProperties) {
        if (!command[prop]) {
            missingProperties.push(prop);
        }
    }

    if (missingProperties.length > 0) {
        Logger.warn(`${fileName} eksik özellikler içeriyor: ${missingProperties.join(', ')}`);
        return false;
    }

    // data.name kontrolü
    if (!command.data.name) {
        Logger.warn(`${fileName} komut adı (data.name) eksik!`);
        return false;
    }

    // data.description kontrolü
    if (!command.data.description) {
        Logger.warn(`${fileName} komut açıklaması (data.description) eksik!`);
        return false;
    }

    return true;
}

/**
 * Tek bir komutu yeniden yükle (hot reload)
 */
async function reloadCommand(client, commandName) {
    const command = client.commands.get(commandName);
    
    if (!command) {
        return { success: false, message: 'Komut bulunamadı.' };
    }

    try {
        // Cache'den sil
        delete require.cache[require.resolve(command.filePath)];
        
        // Yeniden yükle
        const newCommand = require(command.filePath);
        newCommand.category = command.category;
        newCommand.filePath = command.filePath;

        client.commands.set(commandName, newCommand);

        Logger.info(`Komut yeniden yüklendi: ${commandName}`);
        return { success: true, message: `${commandName} komutu yeniden yüklendi.` };

    } catch (error) {
        Logger.error(`Komut yeniden yüklenemedi: ${commandName}`, error);
        return { success: false, message: `Hata: ${error.message}` };
    }
}

/**
 * Tüm komutları yeniden yükle
 */
async function reloadAllCommands(client) {
    // Mevcut komutları temizle
    for (const [name, command] of client.commands) {
        try {
            delete require.cache[require.resolve(command.filePath)];
        } catch (e) {
            // Ignore cache errors
        }
    }

    client.commands.clear();
    client.commandCategories.clear();

    // Yeniden yükle
    await loadCommands(client);

    return { success: true, message: `${client.commands.size} komut yeniden yüklendi.` };
}

/**
 * Komut bilgilerini getir
 */
function getCommandInfo(client, commandName) {
    const command = client.commands.get(commandName);
    if (!command) return null;

    return {
        name: command.data.name,
        description: command.data.description,
        category: command.category,
        cooldown: command.cooldown || config.cooldown.defaultCooldown,
        developerOnly: command.developerOnly || false,
        requiredPermissions: command.requiredPermissions || []
    };
}

/**
 * Kategoriye göre komutları getir
 */
function getCommandsByCategory(client, category) {
    return client.commands.filter(cmd => cmd.category === category);
}

/**
 * Kullanıcının erişebileceği komutları getir
 */
function getAccessibleCommands(client, member, developerIds = []) {
    return client.commands.filter(cmd => {
        // Developer-only kontrol
        if (cmd.developerOnly && !developerIds.includes(member.id)) {
            return false;
        }

        // Yetki kontrolü
        if (cmd.requiredPermissions && cmd.requiredPermissions.length > 0) {
            const hasPerms = cmd.requiredPermissions.every(perm => member.permissions.has(perm));
            if (!hasPerms) return false;
        }

        return true;
    });
}

module.exports = {
    loadCommands,
    reloadCommand,
    reloadAllCommands,
    getCommandInfo,
    getCommandsByCategory,
    getAccessibleCommands
};

/**
 * ═══════════════════════════════════════════════════════════════
 * 🗄️ AKIRA BOT - DATABASE INDEX
 * ═══════════════════════════════════════════════════════════════
 * 
 * Tüm database modüllerini tek noktadan export eder
 */

const connection = require('./connection');
const User = require('./schemas/User');
const Cooldown = require('./schemas/Cooldown');
const GuildSettings = require('./schemas/GuildSettings');
const ModerationLog = require('./schemas/ModerationLog');
const UserLevel = require('./schemas/UserLevel');

module.exports = {
    connection,
    User,
    Cooldown,
    GuildSettings,
    ModerationLog,
    UserLevel
};

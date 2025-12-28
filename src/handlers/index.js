/**
 * ═══════════════════════════════════════════════════════════════
 * 🔧 AKIRA BOT - HANDLERS INDEX
 * ═══════════════════════════════════════════════════════════════
 */

const { loadCommands, reloadCommand, reloadAllCommands, getCommandInfo, getCommandsByCategory, getAccessibleCommands } = require('./commandHandler');
const { loadEvents } = require('./eventHandler');
const { setupErrorHandlers, handleCommandError, handleDatabaseError, gracefulShutdown } = require('./errorHandler');

module.exports = {
    loadCommands,
    reloadCommand,
    reloadAllCommands,
    getCommandInfo,
    getCommandsByCategory,
    getAccessibleCommands,
    loadEvents,
    setupErrorHandlers,
    handleCommandError,
    handleDatabaseError,
    gracefulShutdown
};

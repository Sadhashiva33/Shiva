/**
 * Check if a member has the required permissions
 * @param {GuildMember} member - The guild member to check
 * @param {bigint} permission - The permission flag to check
 * @returns {boolean} - Whether the member has the permission
 */
function checkPermissions(member, permission) {
    if (!member) return false;
    
    // Bot owner always has permissions
    const config = require('../config');
    if (config.ownerIds.includes(member.user.id)) {
        return true;
    }
    
    // Check if member has administrator permission
    if (member.permissions.has('Administrator')) {
        return true;
    }
    
    // Check specific permission
    return member.permissions.has(permission);
}

/**
 * Check if the bot has the required permissions in a guild
 * @param {Guild} guild - The guild to check
 * @param {bigint} permission - The permission flag to check
 * @returns {boolean} - Whether the bot has the permission
 */
function checkBotPermissions(guild, permission) {
    const botMember = guild.members.me;
    if (!botMember) return false;
    
    return botMember.permissions.has(permission);
}

/**
 * Check if a member can moderate another member
 * @param {GuildMember} moderator - The moderator member
 * @param {GuildMember} target - The target member
 * @returns {boolean} - Whether the moderator can moderate the target
 */
function canModerate(moderator, target) {
    if (!moderator || !target) return false;
    
    // Can't moderate yourself
    if (moderator.id === target.id) return false;
    
    // Can't moderate the guild owner
    if (target.id === target.guild.ownerId) return false;
    
    // Check role hierarchy
    return moderator.roles.highest.position > target.roles.highest.position;
}

module.exports = {
    checkPermissions,
    checkBotPermissions,
    canModerate
};

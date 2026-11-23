const { getTarget }                        = require('../../lib/getTarget');
const muteStore                            = require('../../lib/muteStore');
const { parseTime, humanize, schedule, cancelAll } = require('../../lib/mute-core');

module.exports = {
    name: 'unmuteuser', aliases: ['unmute'], category: 'admin', reactions: { start: '🛡️' },
    description: 'Unmute a user. .unmuteuser @user  OR  .unmuteuser @user after 1h (delayed)',
    adminOnly: true, groupOnly: true,

    async execute(bot, m, args) {
        const target = getTarget(m);
        if (!target) return m.reply(`Reply to a message or tag a user.\n${bot.prefix}unmuteuser @user [after 1h]`);

        const key    = muteStore._keyOf(target);
        const joined = args.filter(a => !a.startsWith('@')).join(' ').replace(/\bafter\b/i, '').trim();
        const ms     = joined ? parseTime(joined) : null;

        if (joined && !ms) return m.reply('⚠️ Bad duration. Use: 10m 1h 6h 1d 7d etc.');

        if (ms) {
            cancelAll({ chat: m.chat, target: key });
            schedule({ type: 'unmuteUser', chat: m.chat, target: key, expiresAt: Date.now() + ms, mutedBy: m.sender });
            return m.reply(`\`\`\`\n@${target.split('@')[0]} will exit the communication blackout in ${humanize(ms)}.\n\`\`\``, { mentions: [target] });
        }

        // Also clear an anti-system mute scoped to this group.
        let wasAntiMuted = false;
        let forms = [target];
        try { forms = await require('../../lib/banStore').resolveForms(bot, target); } catch {}
        for (const form of forms) wasAntiMuted = muteStore.clearChatMute(form, m.chat) || wasAntiMuted;
        if (!muteStore.getMute(target) && !wasAntiMuted) return m.reply(`@${target.split('@')[0]} isn't muted.`, { mentions: [target] });
        muteStore.clearMute(target);
        cancelAll({ chat: m.chat, target: key });
        await bot.sendMessage(m.chat, { text: `\`\`\`\nOrbital silence has ended for @${target.split('@')[0]}.\nThe communication channel is open again.\n\`\`\``, mentions: [target] });
    }
};

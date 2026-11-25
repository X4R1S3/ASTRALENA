const { parseTime, humanize, schedule, cancelAll } = require('../../lib/mute-core');

module.exports = {
    name: 'unmute', aliases: ['unlock', 'unlockgroup', 'groupopen'],
    category: 'admin', adminOnly: true, groupOnly: true,
    reactions: { start: '🛡️' },
    description: 'Unmute the group. .unmute / .unmute after 10m',

    async execute(bot, m, args) {
        const jid    = m.chat;
        const joined = args.join(' ').trim().replace(/\bafter\b/i, '').trim();
        const ms     = joined ? parseTime(joined) : null;

        if (joined && !ms) return m.reply('Bad duration. Try: 10m 1h 6h 1d 7d');

        // Delayed: .unmute after 10m
        if (ms) {
            cancelAll({ chat: jid });
            schedule({ type: 'unmuteGroup', chat: jid, expiresAt: Date.now() + ms, mutedBy: m.sender, source: 'delayed' });
            return m.reply(`Orbital reopening scheduled.\nThis group channel will reopen in ${humanize(ms)}.`);
        }

        try { await bot.sock.groupSettingUpdate(jid, 'not_announcement'); }
        catch (e) { return m.reply(`Failed to unmute the group: ${e.message}. The bot must be an admin.`); }

        cancelAll({ chat: jid });
        const all = [];
        try { const meta = await bot.sock.groupMetadata(jid); all.push(...meta.participants.map(p => p.id || p.jid || p.phoneNumber).filter(Boolean)); } catch {}

        // Infinite: .unmute
        await bot.sendMessage(jid, { text: 'Orbital silence has ended.\nThis group channel is open for transmissions again.', mentions: all });
    }
};

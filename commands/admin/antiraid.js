const fs = require('fs-extra');

// Enforced from lib/antiSystems.js#checkGroupJoin like akick/antifake.
// This file controls Anti-Raid state, thresholds, and optional group lockdown.
module.exports = {
    name: 'antiraid',
    aliases: ['raid'],
    category: 'admin',
    reactions: { start: '🛡️' },
    description: 'Detect mass-joins and remove the raiders',
    adminOnly: true,
    groupOnly: true,

    async execute(bot, m, args) {
        const groupId = m.chat;
        const sub     = args[0]?.toLowerCase();
        const dbPath  = './database/antiraid.json';
        let db = {};
        try { db = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch { db = {}; }
        fs.ensureDirSync('./database');
        if (!db[groupId]) db[groupId] = { enabled: false, count: 5, minutes: 10 };
        const s    = db[groupId];
        const save = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        const mc = require('../../lib/mute-core');
        const myWindows = () => mc.listRecurring(groupId)
            .filter((r) => r.type === 'sch-muteGroup' && r.mutedBy === 'anti-raid');
        const dropWindows = () => {
            let removed = 0;
            for (const r of myWindows()) { mc.cancelRecurring(groupId, r.id); removed++; }
            return removed;
        };
        const hh = (t) => String(t.hour).padStart(2, '0') + ':' + String(t.minute).padStart(2, '0');

        if (!sub || sub === 'status') return await m.reply(
`antiraid status\nStatus: ${s.enabled ? 'ON' : 'OFF'}\nTrigger: ${s.count||5} joins within ${s.minutes||10} min\n\nWhen triggered, everyone who joined inside the window is removed, and new joins are removed until the window has passed.\n${s.muteWindow ? 'Daily mute: ' + hh(s.muteWindow.from) + ' to ' + hh(s.muteWindow.to) + '\n' : ''}On raid: ${s.muteGroup ? 'MUTE GROUP ' + (s.muteGroup.ms ? '(' + require('../../lib/antiMute').fmtMs(s.muteGroup.ms) + ')' : '(until unlocked)') : 'remove only'}\n\nUsage:\n${bot.prefix}antiraid on/off\n${bot.prefix}antiraid <joins> <minutes>  (e.g. ${bot.prefix}antiraid 5 10)\n${bot.prefix}antiraid mute -g 10m  (also mute the group on a raid)\n${bot.prefix}antiraid mute -g 5am to 6am daily  (mute the group every day)\n${bot.prefix}antiraid mute -g  (mute until unlocked)`);

        // .antiraid mute -g 10m -> lock the group for 10m when a raid hits.
        // .antiraid mute -g 5am to 6am daily -> recurring daily lockdown.
        // .antiraid mute -g     -> lock it until an admin runs .unlockgc.
        if (sub === 'mute') {
            const rest = args.slice(1).map((x) => String(x).toLowerCase());
            const P = bot.prefix;
            if (rest[0] !== '-g' && rest[0] !== 'g') return await m.reply(`Usage:\n${P}antiraid mute -g 10m  (mute the group for 10m when a raid hits)\n${P}antiraid mute -g 5am to 6am daily  (mute the group every day)\n${P}antiraid mute -g  (mute until an admin unlocks it)\n${P}antiraid mute -g off`);
            const raw = rest.slice(1).join(' ').trim();

            if (raw === 'off') {
                delete s.muteGroup;
                delete s.muteWindow;
                save();
                const removed = dropWindows();
                return await m.reply(`Group mute disabled. Raiders are still removed.${removed ? '\nThe daily mute window was removed too.' : ''}`);
            }

            // A recurring Anti-Raid group mute uses the same scheduler as .sch -mute,
            // so its start and end notices stay space-themed and consistently formatted.
            const win = raw.match(/^(.+?)\s+to\s+(.+?)(?:\s+(?:daily|everyday|every\s*day))?$/i);
            if (win) {
                const from = mc.parseTimeOfDay(win[1].trim());
                const to = mc.parseTimeOfDay(win[2].trim());
                const valid = (t) => t && t.hour >= 0 && t.hour <= 23 && t.minute >= 0 && t.minute <= 59;
                if (!valid(from)) return await m.reply(`Couldn't read the start time "${win[1].trim()}". Examples: 1am, 6:30pm, 23:00`);
                if (!valid(to)) return await m.reply(`Couldn't read the end time "${win[2].trim()}". Examples: 6am, 18:30`);
                if (from.hour === to.hour && from.minute === to.minute) return await m.reply("Start and end time can't be the same.");
                dropWindows();
                mc.addRecurring({ chat: groupId, mutedBy: 'anti-raid', type: 'sch-muteGroup', timeFrom: from, timeTo: to });
                s.muteWindow = { from, to };
                delete s.muteGroup;
                save();
                return await m.reply(`Daily group mute set: orbital control will lock the group from ${hh(from)} to ${hh(to)} every day (${require('../../lib/timezone').get()} time).\nThe group will reopen automatically at ${hh(to)}.\nView with ${P}sch list, remove with ${P}antiraid mute -g off.`);
            }

            let ms = null;
            if (raw) {
                const { parseTime } = require('../../lib/mute-core');
                ms = parseTime(raw);
                if (!ms) return await m.reply(`Bad duration "${raw}". Use: 10m, 1h, 1d`);
                if (ms < 10000 || ms > 30 * 86400000) return await m.reply('Duration must be between 10s and 30d.');
            }
            delete s.muteWindow;
            dropWindows();
            s.muteGroup = { ms };
            save();
            return await m.reply(`When a raid is detected the group will be muted (only admins can send) ${ms ? 'for ' + require('../../lib/antiMute').fmtMs(ms) : 'until an admin unlocks it with ' + P + 'unlockgc'}.${s.enabled ? '' : `\nAnti-Raid is OFF, turn it on with ${P}antiraid on.`}`);
        }
        if (sub === 'on')  { s.enabled = true;  save(); return await m.reply('Anti-Raid enabled.'); }
        if (sub === 'off') { s.enabled = false; save(); return await m.reply('Anti-Raid disabled.'); }
        const a = parseInt(args[0]), b = parseInt(args[1]);
        if (a && b) {
            if (a < 2 || a > 50 || b < 1 || b > 120) return await m.reply(`Usage: ${bot.prefix}antiraid <joins 2-50> <minutes 1-120>`);
            s.count = a; s.minutes = b; save();
            return await m.reply(`Anti-Raid trigger set: ${a}+ joins within ${b} min.`);
        }
        return await m.reply(`Unknown option. Use ${bot.prefix}antiraid status`);
    }
};

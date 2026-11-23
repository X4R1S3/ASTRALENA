'use strict';

/**
 * antiMute — the "mute" action and the daily "sch" schedule for EVERY anti-system.
 *
 *   .antilink mute 10m                    anyone who sends a link has the message
 *                                         deleted and is muted in this group for 10m
 *   .antilink mute                        same, but the mute lasts until an admin
 *                                         runs .unmuteuser
 *   .antilink sch -mute 2am to 6am daily  every day between 2am and 6am, a link
 *                                         gets the sender muted until 6am
 *   .antilink sch -mute 30m 2am to 6am daily   ...muted for 30m instead
 *   .antilink sch -delete / -kick / -warn 2am to 6am daily   (other actions work too)
 *   .antilink sch list | clear | remove <n>
 *
 * How it plugs in
 *   - Every anti command calls handle() first; it answers `mute` and `sch` and
 *     returns false for everything else, so each command keeps its own on/off/
 *     delete/kick/warn code untouched.
 *   - Settings are stored in the feature's own ./database/<name>.json, per group:
 *       action: 'mute', muteMs: 600000          (the base action)
 *       schedules: [{ id, action, muteMs, from:{hour,minute}, to:{hour,minute} }]
 *   - lib/antiSystems.js runs every setting through effective(), so a schedule
 *     window that is open right now overrides the base setting (it also switches
 *     the feature on for the window), and outside the window the base settings
 *     apply again. That one hook covers all anti-systems.
 *   - Times use the bot timezone (lib/timezone.js, .setvar TIME_ZONE=...).
 */

const fs = require('fs-extra');
const tz = require('./timezone');

const MAX_MUTE_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days
const MIN_MUTE_MS = 10 * 1000;                   // 10 seconds
const MAX_WINDOWS = 6;

// ── formatting ───────────────────────────────────────────────────────────────
function fmtMs(ms) {
    if (!ms || ms <= 0) return '0s';
    let s = Math.round(ms / 1000);
    const parts = [];
    for (const [n, u] of [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']]) {
        const v = Math.floor(s / n);
        if (v > 0) { parts.push(`${v}${u}`); s -= v * n; }
    }
    return parts.slice(0, 2).join(' ');
}

const hhmm = (t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;

/** "MUTE (10m)" / "MUTE (until unmuted)" / "DELETE" ... */
function label(s, dflt = 'warn') {
    const a = String((s && s.action) || dflt).toLowerCase();
    if (a === 'mute') return `MUTE (${s.muteMs ? fmtMs(s.muteMs) : 'until unmuted'})`;
    return a.toUpperCase();
}

const _windows = (s) => (s && Array.isArray(s.schedules) ? s.schedules.filter((w) => w && w.from && w.to) : []);

function winText(w) {
    const act = String(w.action || 'mute').toLowerCase();
    const what = act === 'mute' ? `MUTE (${w.muteMs ? fmtMs(w.muteMs) : 'until window ends'})` : act.toUpperCase();
    return `${hhmm(w.from)}-${hhmm(w.to)} ${what}`;
}

/** "Schedule: 02:00-06:00 MUTE (until window ends) daily" or '' */
function schedText(s) {
    const list = _windows(s);
    return list.length ? `Schedule: ${list.map(winText).join(', ')} daily` : '';
}

/** Same, with a leading newline — appended straight after an "Action:" status line. */
function sched(s) {
    const t = schedText(s);
    return t ? `\n${t}` : '';
}

/** Compact form for the .antis panel: "mute 10m", "warn 3", "delete +1 sch". */
function shortLabel(s) {
    const a = String((s && s.action) || 'warn').toLowerCase();
    let out = a === 'warn' ? `warn ${Math.min(Math.max((s && s.maxWarns) || 3, 1), 3)}`
        : a === 'mute' ? `mute ${s.muteMs ? fmtMs(s.muteMs) : 'manual'}`
        : a;
    const n = _windows(s).length;
    if (n) out += ` +${n} sch`;
    return out;
}

/** The two lines every command adds to its usage text. */
function usage(prefix, cmd) {
    const p = prefix || '.';
    return `\n${p}${cmd} mute [time]  (mute instead: 10m, 1h, 1d)\n${p}${cmd} sch -mute 2am to 6am daily`;
}

// ── schedule evaluation (hot path: called for every message) ─────────────────
const _fmt = new Map();
function clock(now = Date.now()) {
    const zone = tz.get();
    let f = _fmt.get(zone);
    if (!f) {
        f = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        _fmt.set(zone, f);
    }
    const parts = f.formatToParts(new Date(now));
    const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
    return { minutes: (get('hour') % 24) * 60 + get('minute'), seconds: get('second') };
}

function inWindow(w, minutes) {
    const from = w.from.hour * 60 + w.from.minute;
    const to = w.to.hour * 60 + w.to.minute;
    if (from === to) return false;
    return from < to ? (minutes >= from && minutes < to) : (minutes >= from || minutes < to);   // 10pm -> 2am
}

function msUntilEnd(w, c) {
    const to = w.to.hour * 60 + w.to.minute;
    const delta = ((to - c.minutes) + 1440) % 1440;
    return Math.max(delta * 60000 - c.seconds * 1000, 1000);
}

/**
 * The settings that apply RIGHT NOW. With no schedule (or none open) this returns
 * `s` itself; inside an open window it returns a copy with the feature switched on
 * and the window's action. A mute with no duration of its own lasts until the
 * window closes.
 */
function effective(s, now = Date.now()) {
    const list = _windows(s);
    if (!list.length) return s;
    const c = clock(now);
    for (const w of list) {
        if (!inWindow(w, c.minutes)) continue;
        const out = { ...s, enabled: true, action: w.action || 'mute', _scheduled: true };
        if (w.maxWarns) out.maxWarns = w.maxWarns;
        if (out.action === 'mute') out.muteMs = w.muteMs || msUntilEnd(w, c);
        return out;
    }
    return s;
}

/** A mute length that is always inside MIN..MAX; null/0 stays "until unmuted". */
function clampMute(ms) {
    if (!ms || ms <= 0) return null;
    return Math.min(Math.max(ms, MIN_MUTE_MS), MAX_MUTE_MS);
}

// ── storage ──────────────────────────────────────────────────────────────────
const dbFile = (key) => `./database/${key}.json`;
function readDb(key) { try { return JSON.parse(fs.readFileSync(dbFile(key), 'utf8')) || {}; } catch { return {}; } }
function writeDb(key, db) { fs.ensureDirSync('./database'); fs.writeFileSync(dbFile(key), JSON.stringify(db, null, 2)); }

function timeOk(t) { return !!t && Number.isInteger(t.hour) && Number.isInteger(t.minute) && t.hour >= 0 && t.hour <= 23 && t.minute >= 0 && t.minute <= 59; }

// ── the command side ─────────────────────────────────────────────────────────
/**
 * Call at the very top of an anti command's execute(). Returns true when it
 * handled the message (`mute ...` / `sch ...`), false to let the command carry on.
 *   key       the feature's database name   ('antilink', 'antivideo', ...)
 *   name      what to call it in replies    ('Anti-Link')
 *   defaults  what a brand-new group entry starts as (antilink/antispam/antitag
 *             are ON the first time they're touched, so they pass {enabled:true})
 */
async function handle(bot, m, args, key, name, defaults = {}) {
    const list = Array.prototype.slice.call(args || []);
    const sub = String(list[0] || '').toLowerCase();
    if (sub !== 'mute' && sub !== 'sch' && sub !== 'schedule') return false;

    const P = (bot && bot.prefix) || '.';
    const cmd = key === 'antigroupmention' ? 'antigm' : key;
    // Always report "handled" once we've answered, whatever m.reply happens to return,
    // so the command never carries on and answers a second time.
    const reply = async (t) => { await m.reply(t); return true; };
    const groupId = m.chat;
    const { parseTime, parseTimeOfDay } = require('./mute-core');

    const db = readDb(key);
    if (!db[groupId]) db[groupId] = { enabled: false, action: 'warn', maxWarns: 3, ...defaults };
    const s = db[groupId];
    const state = () => (s.enabled ? 'ON' : 'OFF');

    // ── .<anti> mute [time] ─────────────────────────────────────────────
    if (sub === 'mute') {
        const raw = list.slice(1).join(' ').trim();
        let ms = null;
        if (raw) {
            ms = parseTime(raw);
            if (!ms) return reply(`Bad duration "${raw}".\nUse: ${P}${cmd} mute 10m | 1h | 1d | 1w\nOr just ${P}${cmd} mute (stays muted until ${P}unmuteuser).`);
            if (ms < MIN_MUTE_MS) return reply('The shortest mute is 10s.');
            if (ms > MAX_MUTE_MS) return reply('The longest mute is 30d. For longer, use no time and unmute by hand.');
        }
        s.action = 'mute';
        s.muteMs = ms || null;
        writeDb(key, db);
        return reply(
            `${name} action set to MUTE${ms ? ` (${fmtMs(ms)})` : ' (until unmuted)'}.\n` +
            `Whoever triggers it has the message deleted and is muted in this group${ms ? ` for ${fmtMs(ms)}` : ' until an admin runs ' + P + 'unmuteuser'}.\n` +
            `Status: ${state()}${state() === 'OFF' ? ` — turn it on with ${P}${cmd} on` : ''}`);
    }

    // ── .<anti> sch ... ─────────────────────────────────────────────────
    const wins = Array.isArray(s.schedules) ? s.schedules : (s.schedules = []);
    const help =
        `${name} schedule — change the action at set times every day (${tz.get()} time).\n\n` +
        `${P}${cmd} sch -mute 2am to 6am daily\n` +
        `${P}${cmd} sch -mute 30m 2am to 6am daily   (mute for 30m instead of until 6am)\n` +
        `${P}${cmd} sch -delete 2am to 6am daily\n` +
        `${P}${cmd} sch -kick 2am to 6am daily\n` +
        `${P}${cmd} sch -warn 2 2am to 6am daily\n` +
        `${P}${cmd} sch list\n` +
        `${P}${cmd} sch remove <number>\n` +
        `${P}${cmd} sch clear\n\n` +
        `In the window ${name} is ON with that action; outside it, your normal settings apply.`;

    const a1 = String(list[1] || '').toLowerCase();

    if (!a1) return reply(`${help}${wins.length ? '\n\nCurrent:\n' + wins.map((w, i) => `${i + 1}. ${winText(w)} daily`).join('\n') : ''}`);

    if (a1 === 'list') {
        if (!wins.length) return reply(`No ${name} schedules in this group.\n\n${P}${cmd} sch -mute 2am to 6am daily`);
        const c = clock();
        return reply(`${name} schedules (${tz.get()} time):\n\n` +
            wins.map((w, i) => `${i + 1}. ${winText(w)} daily${inWindow(w, c.minutes) ? '  ← active now' : ''}`).join('\n') +
            `\n\n${P}${cmd} sch remove <number> | ${P}${cmd} sch clear`);
    }

    if (a1 === 'clear' || a1 === 'off' || a1 === 'reset') {
        const n = wins.length;
        s.schedules = [];
        if (n) writeDb(key, db);
        return reply(n ? `Removed ${n} ${name} schedule${n > 1 ? 's' : ''}.` : `No ${name} schedules to remove.`);
    }

    if (a1 === 'remove' || a1 === 'rm') {
        const idx = parseInt(list[2], 10);
        if (!idx || idx < 1 || idx > wins.length) return reply(`Pick a number from ${P}${cmd} sch list.`);
        const [gone] = wins.splice(idx - 1, 1);
        writeDb(key, db);
        return reply(`Removed schedule ${idx}: ${winText(gone)}`);
    }

    // sch [-]<action> [time|count] <from> to <to> [daily]
    const mm = list.slice(1).join(' ').match(/^-?(mute|delete|kick|warn)\b\s*(.*)$/i);
    if (!mm) return reply(help);
    const action = mm[1].toLowerCase();
    const toks = mm[2].trim().split(/\s+/).filter(Boolean);

    let ms = null, warns = null;
    if (action === 'mute' && toks[0] && parseTime(toks[0])) {
        ms = parseTime(toks[0]);
        if (ms < MIN_MUTE_MS || ms > MAX_MUTE_MS) return reply('A scheduled mute must be between 10s and 30d.');
        toks.shift();
    }
    if (action === 'warn' && /^[1-3]$/.test(toks[0] || '')) warns = parseInt(toks.shift(), 10);

    const range = toks.join(' ').match(/^(.+?)\s+to\s+(.+?)(?:\s+(?:daily|everyday|every\s*day))?$/i);
    if (!range) return reply(`Couldn't read the time range.\nExample: ${P}${cmd} sch -${action} 2am to 6am daily`);
    const from = parseTimeOfDay(range[1].trim());
    const to = parseTimeOfDay(range[2].trim());
    if (!timeOk(from)) return reply(`Couldn't read the start time "${range[1].trim()}".\nExamples: 1am, 6:30pm, 23:00`);
    if (!timeOk(to)) return reply(`Couldn't read the end time "${range[2].trim()}".\nExamples: 6am, 18:30, 08:00`);
    if (from.hour === to.hour && from.minute === to.minute) return reply('Start and end time can\'t be the same.');
    if (wins.length >= MAX_WINDOWS) return reply(`Max ${MAX_WINDOWS} schedules per feature. Remove one with ${P}${cmd} sch remove <number>.`);

    const win = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, action, from, to, by: m.sender, at: Date.now() };
    if (ms) win.muteMs = ms;
    if (warns) win.maxWarns = warns;
    wins.push(win);
    writeDb(key, db);

    const doing = action === 'mute'
        ? `the message is deleted and the sender is muted ${ms ? `for ${fmtMs(ms)}` : `until ${hhmm(to)} (when the window ends)`}`
        : action === 'delete' ? 'the message is deleted'
        : action === 'kick' ? 'the message is deleted and the sender is removed'
        : `the sender is warned${warns ? ` (${warns} warnings before kick)` : ''} and the message is deleted`;
    return reply(
        `${name} schedule added.\n\n` +
        `${hhmm(from)} → ${hhmm(to)} daily (${tz.get()} time)\n` +
        `In this window: ${doing}.\n` +
        `Outside it ${name} uses its normal settings (now ${state()}, ${label(s).split(' ')[0]}).\n\n` +
        `${P}${cmd} sch list to view, ${P}${cmd} sch clear to remove.`);
}

module.exports = {
    handle, effective, label, sched, schedText, shortLabel, usage, fmtMs, clampMute,
    MAX_MUTE_MS, MIN_MUTE_MS,
};

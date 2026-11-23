const fs   = require('fs-extra');
const path = require('path');
// Anchored to the project root (not process.cwd()) so persistent data
// lands in the same place regardless of the directory the process was
// launched from.
// ASTRALENA_PROJECT_ROOT lets tests (and only tests) redirect persistent
// storage to a throwaway directory; production never sets it, so this
// always resolves to the real install directory there.
const PROJECT_ROOT = process.env.ASTRALENA_PROJECT_ROOT || path.join(__dirname, '..');


const DB = path.join(PROJECT_ROOT, 'database/muteusers.json');
const readDB = () => { try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch { return {}; } };
const saveDB = (d) => { fs.ensureDirSync(path.dirname(DB)); fs.writeFileSync(DB, JSON.stringify(d, null, 2)); };

/** Mirrors Permission._clean()'s normalization exactly (digits-only + @s.whatsapp.net), without needing a live bot instance. */
function _keyOf(jid) {
    if (!jid) return '';
    const digits = String(jid).replace(/:[0-9]+@/, '@').split('@')[0].replace(/[^0-9]/g, '');
    return digits ? digits + '@s.whatsapp.net' : '';
}

// An entry with an `expiresAt` in the past no longer counts as a mute. Anti-system
// mutes (.antilink mute 10m ...) set one; manual mutes never do, so they're unaffected.
const _expired = (e) => !!e && !!e.expiresAt && Date.now() >= e.expiresAt;

function getMute(target) {
    const db = readDB();
    const e = db[_keyOf(target)];
    if (!e) return null;
    if (_expired(e)) { delete db[_keyOf(target)]; saveDB(db); return null; }
    return e;
}

function setMute(target, data) {
    const db = readDB();
    db[_keyOf(target)] = data;
    saveDB(db);
}

function clearMute(target) {
    const db = readDB();
    delete db[_keyOf(target)];
    saveDB(db);
}

// ── Group-scoped mutes (set by the anti-systems: .antilink mute 10m, ...) ────
// A normal .muteuser mute is global (the person is silenced in every group the
// bot moderates). An anti-system mute must only silence the person in the group
// where they broke the rule, and one person can be muted in several groups at
// once, so these live under "<digits>@s.whatsapp.net|<groupJid>" in the same
// file. .unmuteuser clears them too (see commands/admin/unmuteuser.js).
const _chatKey = (jid, chat) => { const k = _keyOf(jid); return k && chat ? `${k}|${chat}` : ''; };

/** Reads an entry without applying expiry (used to tell "expired" from "cleared by an admin"). */
function rawChatMute(target, chat) {
    const k = _chatKey(target, chat);
    return k ? (readDB()[k] || null) : null;
}

function getChatMute(target, chat) {
    const k = _chatKey(target, chat);
    if (!k) return null;
    const db = readDB();
    const e = db[k];
    if (!e) return null;
    if (_expired(e)) { _dropEntry(db, e, k); saveDB(db); return null; }
    return e;
}

function _dropEntry(db, e, k) {
    for (const key of (e && e.keys) || [k]) delete db[key];
    delete db[k];
}

/** `targets` = every JID form (phone / @lid) known for the person, so the mute matches whichever one WhatsApp reports. */
function setChatMute(targets, chat, data) {
    const list = [].concat(targets || []);
    const keys = [...new Set(list.map((t) => _chatKey(t, chat)).filter(Boolean))];
    if (!keys.length) return false;
    const db = readDB();
    for (const k of keys) db[k] = { ...data, chat, scope: 'chat', keys };
    saveDB(db);
    return true;
}

/** Returns true when something was actually cleared. */
function clearChatMute(target, chat) {
    const k = _chatKey(target, chat);
    if (!k) return false;
    const db = readDB();
    const e = db[k];
    if (!e) return false;
    _dropEntry(db, e, k);
    saveDB(db);
    return true;
}

/**
 * The hot path (every group message): ONE read of the file, checking the global
 * mute (all of the sender's JID forms) and then the mute scoped to this group.
 * Returns the matching entry or null. Expired entries are swept on the way.
 */
function findMute(candidates, chat) {
    const list = [].concat(candidates || []).filter(Boolean);
    if (!list.length) return null;
    const db = readDB();
    let hit = null, dirty = false;
    for (const c of list) {
        const gk = _keyOf(c);
        const ge = db[gk];
        if (ge) {
            if (_expired(ge)) { delete db[gk]; dirty = true; }
            else if (!hit) hit = ge;
        }
        const ck = _chatKey(c, chat);
        const ce = ck && db[ck];
        if (ce) {
            if (_expired(ce)) { _dropEntry(db, ce, ck); dirty = true; }
            else if (!hit) hit = ce;
        }
    }
    if (dirty) saveDB(db);
    return hit;
}

module.exports = { getMute, setMute, clearMute, getChatMute, setChatMute, clearChatMute, rawChatMute, findMute, _keyOf, readDB, saveDB };

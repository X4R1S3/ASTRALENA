// Tests for the anti-system MUTE action, the daily `sch` schedule and the .jid command.
// Run with: node tests/antiMute.test.js   (no network, no WhatsApp)
'use strict';
const assert = require('assert');
const Module = require('module');
const path = require('path');
const fs = require('fs');
const os = require('os');

const realRoot = path.join(__dirname, '..');
// Run against a throwaway copy of the code so the commands' own root-relative
// ./database paths (and lib/muteStore.js) land in a temp dir, never in the repo.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'astralena-antimute-'));
fs.cpSync(path.join(realRoot, 'lib'), path.join(root, 'lib'), { recursive: true });
fs.mkdirSync(path.join(root, 'commands'));
fs.cpSync(path.join(realRoot, 'commands', 'admin'), path.join(root, 'commands', 'admin'), { recursive: true });
fs.cpSync(path.join(realRoot, 'commands', 'general'), path.join(root, 'commands', 'general'), { recursive: true });
const origResolve = Module._resolveFilename;
const cronStub = path.join(os.tmpdir(), 'astralena-node-cron-stub.js');
fs.writeFileSync(cronStub, 'module.exports = { schedule: () => ({ stop() {} }) };');
Module._resolveFilename = function (req, ...rest) {
  if (req === 'fs-extra' || req === 'chalk' || req === 'axios' || req === 'node-cron') {
    try { return origResolve.call(this, req, ...rest); }
    catch { return req === 'node-cron' ? cronStub : path.join(realRoot, 'tests', '_stubs', req + '.js'); }
  }
  return origResolve.call(this, req, ...rest);
};
process.chdir(root);
fs.mkdirSync('./database');

const Permission = require(path.join(root, 'lib', 'permission.js'));
const AntiSystems = require(path.join(root, 'lib', 'antiSystems.js'));
const antiMute = require(path.join(root, 'lib', 'antiMute.js'));
const muteStore = require(path.join(root, 'lib', 'muteStore.js'));
const tz = require(path.join(root, 'lib', 'timezone.js'));

let passed = 0;
async function check(label, fn) {
  try { await fn(); passed++; console.log(`  ok - ${label}`); }
  catch (e) { console.error(`  FAIL - ${label}\n    ${e.stack || e.message}`); process.exitCode = 1; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GROUP = '1203630@g.us';
const OTHER = '1203999@g.us';
const USER = '2348011111111@s.whatsapp.net';
const ADMIN = '2348022222222@s.whatsapp.net';
const meta = { participants: [
  { id: '19990000000@s.whatsapp.net', admin: 'admin' },
  { id: USER, admin: null },
  { id: ADMIN, admin: 'admin' },
] };
const readDb = (key) => JSON.parse(fs.readFileSync(`./database/${key}.json`, 'utf8'));
const writeDb = (key, data) => fs.writeFileSync(`./database/${key}.json`, JSON.stringify(data));

function mkBot() {
  const calls = { sent: [], deleted: 0, kicked: [] };
  const bot = {
    config: { owner: { number: '2340000000000' }, mods: [], sudo: [] },
    prefix: '.',
    sock: {
      user: { id: '19990000000:3@s.whatsapp.net', lid: '55500011122@lid' },
      ev: { on() {} },
      groupMetadata: async () => meta,
      sendMessage: async (jid, content) => { if (content.delete) calls.deleted++; else calls.sent.push(content); },
      groupParticipantsUpdate: async (g, ids, act) => { if (act === 'remove') calls.kicked.push(...ids); },
    },
  };
  bot.permission = new Permission(bot);
  bot.sendMessage = bot.sock.sendMessage;
  bot.antiSystems = new AntiSystems(bot);
  return { bot, calls };
}
const linkMsg = (extra = {}) => ({ isGroup: true, chat: GROUP, fromMe: false, key: { fromMe: false, id: 'X' },
  sender: USER, text: 'join https://spam.example.com now', type: 'conversation', mentions: [], msg: {}, message: { conversation: 'x' }, ...extra });
function cmdMsg(chat = GROUP, extra = {}) {
  const replies = [];
  return { replies, m: { isGroup: chat.endsWith('@g.us'), chat, sender: ADMIN, key: { id: 'C' }, mentions: [], msg: {}, reply: async (t) => { replies.push(t); }, ...extra } };
}
// Same shape the real handler passes: a plain array carrying extra props.
function argv(bot, m, list) {
  const a = list.slice(); a.args = a; a.reply = (t) => m.reply(t); a.prefix = bot.prefix; a.sock = bot.sock; a.bot = bot; return a;
}
// A schedule window covering "now" in the bot's timezone (and one that doesn't).
function windowAround(minutesBefore, minutesAfter) {
  const c = new Intl.DateTimeFormat('en-GB', { timeZone: tz.get(), hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const cur = (parseInt(c.find((p) => p.type === 'hour').value, 10) % 24) * 60 + parseInt(c.find((p) => p.type === 'minute').value, 10);
  const norm = (v) => ((v % 1440) + 1440) % 1440;
  const f = norm(cur - minutesBefore), t = norm(cur + minutesAfter);
  return { from: { hour: Math.floor(f / 60), minute: f % 60 }, to: { hour: Math.floor(t / 60), minute: t % 60 } };
}

(async () => {
  console.log('schedule windows (effective):');
  // Lagos = UTC+1, so 01:30 UTC is 02:30 there.
  const win = { id: 'a', action: 'mute', from: { hour: 2, minute: 0 }, to: { hour: 6, minute: 0 } };
  const base = { enabled: false, action: 'delete', maxWarns: 3, schedules: [win] };
  await check('inside the window: forced ON, action mute, mute lasts until the window ends', () => {
    assert.strictEqual(tz.get(), 'Africa/Lagos');
    const eff = antiMute.effective(base, Date.UTC(2026, 10, 23, 1, 30, 0));
    assert.strictEqual(eff.enabled, true);
    assert.strictEqual(eff.action, 'mute');
    assert.strictEqual(eff.muteMs, 3.5 * 3600 * 1000);
    assert.strictEqual(base.enabled, false, 'the stored setting is never mutated');
  });
  await check('outside the window: the normal settings apply untouched', () => {
    const eff = antiMute.effective(base, Date.UTC(2026, 10, 23, 12, 0, 0));
    assert.strictEqual(eff, base);
  });
  await check('window edges: start included, end excluded', () => {
    assert.strictEqual(antiMute.effective(base, Date.UTC(2026, 10, 23, 1, 0, 0)).action, 'mute');
    assert.strictEqual(antiMute.effective(base, Date.UTC(2026, 10, 23, 5, 0, 0)), base);
  });
  await check('overnight window (10pm to 2am) and an explicit mute length', () => {
    const night = { enabled: true, action: 'warn', schedules: [{ action: 'mute', muteMs: 600000, from: { hour: 22, minute: 0 }, to: { hour: 2, minute: 0 } }] };
    assert.strictEqual(antiMute.effective(night, Date.UTC(2026, 10, 23, 22, 30, 0)).muteMs, 600000);   // 23:30 Lagos
    assert.strictEqual(antiMute.effective(night, Date.UTC(2026, 10, 23, 0, 30, 0)).action, 'mute');    // 01:30 Lagos
    assert.strictEqual(antiMute.effective(night, Date.UTC(2026, 10, 23, 12, 0, 0)), night);
  });
  await check('a delete/kick window keeps its own action', () => {
    const s = { enabled: true, action: 'warn', schedules: [{ action: 'kick', from: { hour: 2, minute: 0 }, to: { hour: 6, minute: 0 } }] };
    assert.strictEqual(antiMute.effective(s, Date.UTC(2026, 10, 23, 1, 30, 0)).action, 'kick');
  });

  console.log('commands: .<anti> mute / sch:');
  const COMMANDS = {
    antilink: 'antilink', antispam: 'antispam', antitag: 'antitag', antigame: 'antigame', antigm: 'antigroupmention',
    antigcstatus: 'antigcstatus', antibot: 'antibot', antiword: 'antiword', antiscam: 'antiscam', antibeg: 'antibeg',
    antiforwarding: 'antiforwarding', antivideo: 'antivideo', antisticker: 'antisticker', antiviewonce: 'antivv',
    antivn: 'antivn', antiimage: 'antiimage', antiaudio: 'antiaudio', antidoc: 'antidoc', antipoll: 'antipoll',
    antievent: 'antievent', antilocation: 'antilocation', anticontact: 'anticontact', antinewcomerlinks: 'antinewcomerlinks',
    antifake: 'antifake', dnd: 'dnd',
  };
  await check('all 25 anti commands: `mute 10m` sets the action and `sch -mute` adds a window', async () => {
    for (const [file, key] of Object.entries(COMMANDS)) {
      const cmd = require(path.join(root, 'commands', 'admin', `${file}.js`));
      const { bot } = mkBot();
      const run = async (...list) => { const t = cmdMsg(); await cmd.execute(bot, t.m, argv(bot, t.m, list)); return t.replies.join('\n'); };

      let out = await run('mute', '10m');
      assert.match(out, /MUTE \(10m\)/, `${file}: mute reply -> ${out}`);
      assert.strictEqual(readDb(key)[GROUP].action, 'mute', file);
      assert.strictEqual(readDb(key)[GROUP].muteMs, 600000, file);

      out = await run('sch', '-mute', '2am', 'to', '6am', 'daily');
      assert.match(out, /schedule added/i, `${file}: sch reply -> ${out}`);
      assert.strictEqual(readDb(key)[GROUP].schedules.length, 1, file);
      assert.deepStrictEqual(readDb(key)[GROUP].schedules[0].from, { hour: 2, minute: 0 }, file);
      assert.deepStrictEqual(readDb(key)[GROUP].schedules[0].to, { hour: 6, minute: 0 }, file);

      out = await run();
      assert.match(out, /MUTE \(10m\)/, `${file}: status shows the mute action`);
      assert.match(out, /mute \[time\]/, `${file}: status lists the mute usage`);
      assert.match(out, /02:00-06:00/, `${file}: status lists the schedule`);

      // each command's own sub-commands still work after the hook
      // (antigm sets its action with `action <x>`; antifake has no delete, only kick/warn)
      const own = file === 'antigm' ? ['action', 'delete'] : file === 'antifake' ? ['kick'] : ['delete'];
      await run(...own);
      assert.strictEqual(readDb(key)[GROUP].action, own[own.length - 1], `${file}: its own .${own.join(' ')} still works`);
      assert.strictEqual(readDb(key)[GROUP].schedules.length, 1, `${file}: schedule survives the command's own save`);
    }
  });
  await check('mute: no time = until unmuted; bad / out-of-range durations are refused', async () => {
    const cmd = require(path.join(root, 'commands', 'admin', 'antilink.js'));
    const { bot } = mkBot();
    const run = async (...list) => { const t = cmdMsg(); await cmd.execute(bot, t.m, argv(bot, t.m, list)); return t.replies.join('\n'); };
    assert.match(await run('mute'), /until unmuted/);
    assert.strictEqual(readDb('antilink')[GROUP].muteMs, null);
    assert.match(await run('mute', 'banana'), /Bad duration/);
    assert.match(await run('mute', '5s'), /shortest/);
    assert.match(await run('mute', '60d'), /longest/);
    assert.strictEqual(readDb('antilink')[GROUP].muteMs, null, 'refused values change nothing');
  });
  await check('a brand-new antilink / antispam / antitag group starts ON, the others OFF (same as their own toggles)', async () => {
    for (const [file, key, want] of [['antilink', 'antilink', true], ['antispam', 'antispam', true], ['antitag', 'antitag', true], ['antivideo', 'antivideo', false]]) {
      fs.rmSync(`./database/${key}.json`, { force: true });
      const cmd = require(path.join(root, 'commands', 'admin', `${file}.js`));
      const { bot } = mkBot(); const t = cmdMsg();
      await cmd.execute(bot, t.m, argv(bot, t.m, ['mute', '1h']));
      assert.strictEqual(!!readDb(key)[GROUP].enabled, want, file);
    }
  });
  await check('sch: time forms, optional length, other actions, list / remove / clear, bad input', async () => {
    fs.rmSync('./database/antilink.json', { force: true });
    const cmd = require(path.join(root, 'commands', 'admin', 'antilink.js'));
    const { bot } = mkBot();
    const run = async (...list) => { const t = cmdMsg(); await cmd.execute(bot, t.m, argv(bot, t.m, list)); return t.replies.join('\n'); };
    assert.match(await run('sch', '-mute', '30m', '1am', 'to', '3:30am', 'daily'), /schedule added/i);
    assert.match(await run('sch', '-kick', '22:00', 'to', '23:30'), /schedule added/i);
    assert.match(await run('sch', '-warn', '2', '6pm', 'to', '9pm', 'daily'), /schedule added/i);
    assert.match(await run('sch', 'delete', '8am', 'to', '9am'), /schedule added/i);
    const w = readDb('antilink')[GROUP].schedules;
    assert.deepStrictEqual(w.map((x) => x.action), ['mute', 'kick', 'warn', 'delete']);
    assert.strictEqual(w[0].muteMs, 1800000);
    assert.deepStrictEqual(w[0].to, { hour: 3, minute: 30 });
    assert.strictEqual(w[2].maxWarns, 2);
    assert.deepStrictEqual(w[2].from, { hour: 18, minute: 0 });
    const list = await run('sch', 'list');
    assert.match(list, /1\. 01:00-03:30 MUTE \(30m\)/);
    assert.match(list, /4\. 08:00-09:00 DELETE/);
    assert.match(await run('sch', 'remove', '2'), /Removed schedule 2/);
    assert.strictEqual(readDb('antilink')[GROUP].schedules.length, 3);
    assert.match(await run('sch', 'remove', '9'), /Pick a number/);
    assert.match(await run('sch', '-mute', '2am', 'to', '2am'), /can't be the same/);
    assert.match(await run('sch', '-mute', '25:00', 'to', '6am'), /start time/);
    assert.match(await run('sch', '-mute', '2am', 'til', '6am'), /time range/);
    assert.match(await run('sch', 'nonsense'), /schedule —/);
    assert.match(await run('sch', 'clear'), /Removed 3/);
    assert.strictEqual(readDb('antilink')[GROUP].schedules.length, 0);
    for (let i = 0; i < 6; i++) await run('sch', '-mute', `${i + 1}am`, 'to', `${i + 2}am`);
    assert.match(await run('sch', '-mute', '9am', 'to', '10am'), /Max 6/);
  });
  await check('other group settings are untouched by mute / sch', async () => {
    writeDb('antilink', { [OTHER]: { enabled: true, action: 'kick', maxWarns: 2 } });
    const cmd = require(path.join(root, 'commands', 'admin', 'antilink.js'));
    const { bot } = mkBot(); const t = cmdMsg();
    await cmd.execute(bot, t.m, argv(bot, t.m, ['mute', '5m']));
    assert.deepStrictEqual(readDb('antilink')[OTHER], { enabled: true, action: 'kick', maxWarns: 2 });
  });

  console.log('engine: a link gets the sender muted:');
  await check('antilink + mute 10m: message deleted, one notice, sender muted in THIS group only', async () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'mute', muteMs: 600000, maxWarns: 3 } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    assert.strictEqual(await bot.antiSystems.checkAll(linkMsg()), true);
    assert.strictEqual(calls.deleted, 1);
    assert.strictEqual(calls.sent.length, 1);
    assert.match(calls.sent[0].text, /Muted for 10m/);
    const e = muteStore.getChatMute(USER, GROUP);
    assert.ok(e && e.expiresAt > Date.now() + 590000 && e.expiresAt <= Date.now() + 600000);
    assert.strictEqual(muteStore.getChatMute(USER, OTHER), null);
    assert.ok(muteStore.findMute([USER], GROUP));
    assert.strictEqual(muteStore.findMute([USER], OTHER), null, 'not muted in another group');
    assert.strictEqual(muteStore.getMute(USER), null, 'no global mute created');
  });
  await check('mute covers every id form WhatsApp may report (phone and @lid)', async () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'mute', muteMs: 600000 } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot } = mkBot();
    await bot.antiSystems.checkAll(linkMsg({ sender: '9990001@lid', _participantRaw: '9990001@lid', key: { fromMe: false, id: 'X', participantAlt: USER } }));
    assert.ok(muteStore.findMute(['9990001@lid'], GROUP));
    assert.ok(muteStore.findMute([USER], GROUP));
  });
  await check('mute without a time: no expiry, stays until .unmuteuser', async () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'mute', muteMs: null } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    await bot.antiSystems.checkAll(linkMsg());
    assert.match(calls.sent[0].text, /until an admin unmutes them/);
    assert.strictEqual(muteStore.getChatMute(USER, GROUP).expiresAt, null);
  });
  await check('group admins and non-links are never muted', async () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'mute', muteMs: 600000 } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    assert.strictEqual(await bot.antiSystems.checkAll(linkMsg({ sender: ADMIN })), false);
    assert.strictEqual(await bot.antiSystems.checkAll(linkMsg({ text: 'hello there' })), false);
    assert.strictEqual(calls.deleted, 0);
    assert.strictEqual(muteStore.getChatMute(ADMIN, GROUP), null);
  });
  await check('antiword + mute: banned word mutes too (a different anti-system, same action)', async () => {
    writeDb('antiword', { [GROUP]: { enabled: true, words: ['scamword'], action: 'mute', muteMs: 120000 } });
    writeDb('antilink', { [GROUP]: { enabled: false } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    await bot.antiSystems.checkAll(linkMsg({ text: 'this is a scamword' }));
    assert.strictEqual(calls.deleted, 1);
    assert.ok(muteStore.getChatMute(USER, GROUP));
  });
  await check('a mute expires on its own (expired entries stop counting and are swept)', async () => {
    muteStore.setChatMute([USER], GROUP, { mutedAt: Date.now() - 1000, expiresAt: Date.now() - 1 });
    assert.strictEqual(muteStore.findMute([USER], GROUP), null);
    assert.strictEqual(muteStore.rawChatMute(USER, GROUP), null);
  });
  await check('manual global mutes still work and never expire on their own', async () => {
    fs.rmSync('./database/muteusers.json', { force: true });
    muteStore.setMute(USER, { stickersOnly: false, mutedBy: 'x', chat: GROUP, mutedAt: 1 });
    assert.ok(muteStore.findMute([USER], OTHER), 'global mute applies in every group');
    muteStore.clearMute(USER);
    assert.strictEqual(muteStore.findMute([USER], OTHER), null);
  });

  console.log('engine: schedules:');
  await check('antilink OFF + `delete`, schedule window open now: links are muted until the window ends', async () => {
    const w = windowAround(30, 90);   // 30 min ago -> 90 min from now
    writeDb('antilink', { [GROUP]: { enabled: false, action: 'delete', schedules: [{ action: 'mute', ...w }] } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    assert.strictEqual(await bot.antiSystems.checkAll(linkMsg()), true);
    assert.strictEqual(calls.deleted, 1);
    const e = muteStore.getChatMute(USER, GROUP);
    assert.ok(e, 'muted');
    const left = e.expiresAt - Date.now();
    assert.ok(left > 85 * 60000 && left <= 90 * 60000, `mute should last ~until window end (got ${Math.round(left / 60000)}m)`);
  });
  await check('same setup, window closed: antilink stays OFF and does nothing', async () => {
    const w = windowAround(-120, 180);   // starts in 2h, ends in 3h
    writeDb('antilink', { [GROUP]: { enabled: false, action: 'delete', schedules: [{ action: 'mute', ...w }] } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    assert.strictEqual(await bot.antiSystems.checkAll(linkMsg()), false);
    assert.strictEqual(calls.deleted, 0);
    assert.strictEqual(muteStore.getChatMute(USER, GROUP), null);
  });
  await check('antilink ON + delete, window open: escalates to mute; window closed: plain delete', async () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'delete', schedules: [{ action: 'mute', muteMs: 300000, ...windowAround(10, 10) }] } });
    fs.rmSync('./database/muteusers.json', { force: true });
    let t = mkBot();
    await t.bot.antiSystems.checkAll(linkMsg());
    assert.ok(muteStore.getChatMute(USER, GROUP), 'muted inside the window');
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'delete', schedules: [{ action: 'mute', muteMs: 300000, ...windowAround(-60, 120) }] } });
    fs.rmSync('./database/muteusers.json', { force: true });
    t = mkBot();
    await t.bot.antiSystems.checkAll(linkMsg());
    assert.strictEqual(t.calls.deleted, 1);
    assert.strictEqual(muteStore.getChatMute(USER, GROUP), null, 'only deleted outside the window');
  });
  await check('the schedule works for any anti-system (antivideo window mutes video senders)', async () => {
    writeDb('antilink', { [GROUP]: { enabled: false } });
    writeDb('antivideo', { [GROUP]: { enabled: false, action: 'warn', schedules: [{ action: 'mute', muteMs: 60000, ...windowAround(5, 5) }] } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    await bot.antiSystems.checkAll(linkMsg({ type: 'videoMessage', text: '', message: { videoMessage: {} } }));
    assert.strictEqual(calls.deleted, 1);
    assert.ok(muteStore.getChatMute(USER, GROUP));
  });

  console.log('panel, status-mention and unmute:');
  await check('.antis panel shows mute length and schedules', () => {
    writeDb('antilink', { [GROUP]: { enabled: true, action: 'mute', muteMs: 600000, schedules: [{ action: 'mute', from: { hour: 2, minute: 0 }, to: { hour: 6, minute: 0 } }] } });
    writeDb('antispam', { [GROUP]: { enabled: true, action: 'mute', muteMs: null } });
    const panel = AntiSystems.buildPanel(GROUP);
    assert.match(panel, /AntiLink: ON \(mute 10m \+1 sch\)/);
    assert.match(panel, /AntiSpam: ON \(mute manual\)/);
    assert.match(panel, /AntiVideo: OFF/);
  });
  await check('antigm (group mentioned in a status) with mute action mutes the poster', async () => {
    writeDb('antigroupmention', { [GROUP]: { enabled: true, action: 'mute', muteMs: 900000 } });
    fs.rmSync('./database/muteusers.json', { force: true });
    const { bot, calls } = mkBot();
    await bot.antiSystems.checkStatusGroupMention(USER, GROUP);
    assert.ok(muteStore.getChatMute(USER, GROUP));
    assert.match(calls.sent[0].text, /Muted for 15m/);
  });
  await check('.unmuteuser lifts an anti-system mute (and says so when nothing is muted)', async () => {
    muteStore.setChatMute([USER, '9990001@lid'], GROUP, { mutedAt: Date.now(), expiresAt: Date.now() + 600000 });
    const { bot, calls } = mkBot();
    const cmd = require(path.join(root, 'commands', 'admin', 'unmuteuser.js'));
    let t = cmdMsg(GROUP, { mentions: [USER] });
    await cmd.execute(bot, t.m, argv(bot, t.m, []));
    assert.strictEqual(muteStore.getChatMute(USER, GROUP), null);
    assert.strictEqual(muteStore.getChatMute('9990001@lid', GROUP), null, 'every form was cleared together');
    assert.match(calls.sent.map((s) => s.text).join(' '), /Orbital silence has ended/);
    t = cmdMsg(GROUP, { mentions: [USER] });
    await cmd.execute(bot, t.m, argv(bot, t.m, []));
    assert.match(t.replies.join(' '), /isn't muted/);
  });
  await check('mute-core antiUnmute job posts the notice once the mute ends — and stays quiet if already unmuted', async () => {
    const muteCore = require(path.join(root, 'lib', 'mute-core.js'));
    const { bot, calls } = mkBot();
    const mutedAt = Date.now() - 5000;
    muteStore.setChatMute([USER], GROUP, { mutedAt, expiresAt: Date.now() - 1 });
    muteCore.schedule({ type: 'antiUnmute', chat: GROUP, target: USER, expiresAt: Date.now() - 1, mutedBy: 'anti-system', extra: { mutedAtStamp: mutedAt } });
    muteCore.init(bot);
    await sleep(80);
    assert.strictEqual(muteStore.rawChatMute(USER, GROUP), null);
    assert.ok(calls.sent.some((s) => /Orbital silence has ended/.test(s.text)));
    // an admin already unmuted: no notice
    const before = calls.sent.length;
    muteCore.schedule({ type: 'antiUnmute', chat: GROUP, target: USER, expiresAt: Date.now() - 1, mutedBy: 'anti-system', extra: { mutedAtStamp: mutedAt } });
    muteCore.init(bot);
    await sleep(80);
    assert.strictEqual(calls.sent.length, before);
  });

  await check('antiraid mute -g stores finite and indefinite group lockdown settings', async () => {
    const cmd = require(path.join(root, 'commands', 'admin', 'antiraid.js'));
    const { bot } = mkBot();
    let t = cmdMsg(GROUP);
    await cmd.execute(bot, t.m, argv(bot, t.m, ['mute', '-g', '10m']));
    assert.deepStrictEqual(readDb('antiraid')[GROUP].muteGroup, { ms: 600000 });
    t = cmdMsg(GROUP);
    await cmd.execute(bot, t.m, argv(bot, t.m, ['mute', '-g']));
    assert.deepStrictEqual(readDb('antiraid')[GROUP].muteGroup, { ms: null });
  });
  await check('an Anti-Raid group mute locks the group and schedules finite reopening', async () => {
    writeDb('antiraid', { [GROUP]: { enabled: true, count: 3, minutes: 10, muteGroup: { ms: 600000 } } });
    fs.rmSync('./database/muteSchedules.json', { force: true });
    const { bot, calls } = mkBot();
    const locked = [];
    bot.sock.groupSettingUpdate = async (group, setting) => locked.push([group, setting]);
    await bot.antiSystems.checkGroupJoin(GROUP, ['2341000001@s.whatsapp.net', '2341000002@s.whatsapp.net', '2341000003@s.whatsapp.net']);
    assert.deepStrictEqual(locked, [[GROUP, 'announcement']]);
    assert.match(calls.sent.at(-1).text, /The group is muted for 10m/);
    const jobs = Object.values(readDb('muteSchedules'));
    assert.ok(jobs.some((job) => job.type === 'unmuteGroup' && job.chat === GROUP));
  });
  await check('Anti-Raid daily mute creates one recurring window and replaces/removes it cleanly', async () => {
    const cmd = require(path.join(root, 'commands', 'admin', 'antiraid.js'));
    const mc = require(path.join(root, 'lib', 'mute-core.js'));
    const mine = () => mc.listRecurring(GROUP).filter((r) => r.mutedBy === 'anti-raid');
    const run = async (...list) => {
      const t = cmdMsg(GROUP);
      await cmd.execute(mkBot().bot, t.m, argv(mkBot().bot, t.m, list));
      return t.replies.join('\n');
    };
    assert.match(await run('mute', '-g', '5am', 'to', '6am', 'daily'), /05:00.*06:00/);
    assert.strictEqual(mine().length, 1);
    assert.strictEqual(mine()[0].type, 'sch-muteGroup');
    assert.match(await run(), /Daily mute: 05:00 to 06:00/);
    await run('mute', '-g', '10m');
    assert.strictEqual(mine().length, 0);
    await run('mute', '-g', '5am', 'to', '6am');
    assert.match(await run('mute', '-g', 'off'), /daily mute window was removed/);
    assert.strictEqual(mine().length, 0);
  });

  console.log(`\n${passed} anti-mute tests passed.`);
})();

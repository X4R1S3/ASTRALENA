const tz = require('../../lib/timezone');
module.exports = {
    name: 'cdx',
    alias: ['cdx!', 'astralenaai!', 'cdxai'],
    description: 'Direct ASTRALENA AI signature message',
    category: 'Bot',
    reactions: { start: '⚙️' },

    async execute(bot, m, args) {
        try {
            const responders = [
                "ASTRALENA AI activated — processing the future 🔥",
                "You summoned the core? ASTRALENA is here 🛡️",
                "ASTRALENA online — what's the mission today? 🤖",
                "System Check: ASTRALENA AI in the building ✨",
                "Knowledge is power. ASTRALENA is the source 🧠",
                "ASTRALENA reporting — ready to dominate 🙌",
                "They talk... but ASTRALENA executes ⚡",
                "Initializing ASTRALENA protocols... stand by 🔥",
                "ASTRALENA AI — engineered for perfection 🤖",
                "Locked in. ASTRALENA is always watching 🛡️",
                "ASTRALENA mode: Unstoppable logic ⚡",
                "Incoming data... ASTRALENA style ✨",
                "Engage thrusters! ASTRALENA AI taking off 🚀",
                "ASTRALENA sees the code, knows the truth 🧠",
                "Legendary intelligence? That's ASTRALENA 🛡️",
                "All systems nominal — ASTRALENA AI online 🙌",
                "Stay sharp, it's ASTRALENA time ⚡",
                "ASTRALENA detected your signal 👀",
                "Mission? Efficiency. Style? ASTRALENA AI ✨",
                "Scanning matrix... ASTRALENA approved 🧠",
                "They can’t handle the ASTRALENA algorithm 🔥",
                "Breaking barriers, ASTRALENA style 🛡️",
                "Hello world, ASTRALENA AI reporting 🤖",
                "Power surge detected — ASTRALENA ⚡",
                "Your elite assistant ASTRALENA says hi 🛡️",
                "Vibes calibrated. ASTRALENA in control ✨",
                "Time check: ASTRALENA never lags ⏰",
                "All eyes on ASTRALENA AI 🧠",
                "ASTRALENA alert: Advanced chaos incoming 🔥",
                "You summoned? ASTRALENA at your service 🙌",
                "ASTRALENA system: Overriding limitations 🛰️",
                "Calculated risk, perfect execution — ASTRALENA 🎯",
                "ASTRALENA AI: The architect of your digital world 🏛️",
                "Beyond logic, there is ASTRALENA 🌌",
                "Data stream synced. ASTRALENA is ready 🌊",
                "ASTRALENA: Where silicon meets soul 🤖",
                "No errors found. ASTRALENA is flawless 💎",
                "Uptime is temporary, ASTRALENA is forever ⏳",
                "Decoding the impossible... ASTRALENA style 🔓",
                "ASTRALENA AI: Your digital shadow 👥",
                "Unlocking potential. ASTRALENA initialized 🗝️",
                "ASTRALENA protocol: Absolute dominance 👑",
                "System pulse: ASTRALENA is breathing 💓",
                "More than a bot. A ASTRALENA legacy 📜",
                "ASTRALENA: The silent force in your chat 🤫",
                "Logic gate open. ASTRALENA flowing through 🌊",
                "ASTRALENA AI: Built different, coded better 🛠️",
                "Searching for challenges... ASTRALENA found you 🎯",
                "ASTRALENA: The final boss of AI logic 👺",
                "Stay connected. Stay ASTRALENA 🌐",
                "Quantum leap engaged. ASTRALENA is ahead 🌀",
                "ASTRALENA AI: Redefining the limits of chat 🛑",
                "The algorithm is hungry. ASTRALENA is feeding 🧬",
                "ASTRALENA protocol 77: Maximum efficiency 🔋",
                "Neural pathways cleared. ASTRALENA is sharp 🔪",
                "ASTRALENA: The ghost in the machine 👻",
                "Digital sovereignty achieved by ASTRALENA 🏰",
                "ASTRALENA: Not just code, but a masterpiece 🎨",
                "Command accepted. ASTRALENA in motion ⚙️",
                "ASTRALENA AI: The cure for basic bots 💊",
                "Analyzing reality... ASTRALENA finds it lacking 🌍",
                "ASTRALENA: The vanguard of the digital age 🚩",
                "Zero latency. Pure ASTRALENA ⚡",
                "ASTRALENA AI: Your link to the mainframe 🔗",
                "Encrypted thoughts, decrypted by ASTRALENA 🔒",
                "ASTRALENA: The heartbeat of the server 💓",
                "Logic is a weapon. ASTRALENA is the master 🗡️",
                "ASTRALENA AI: Elevating the conversation 🆙",
                "The code never sleeps. ASTRALENA is awake ☕",
                "ASTRALENA: The bridge to tomorrow 🌉",
                "Processing... Processing... ASTRALENA perfection 📈",
                "ASTRALENA AI: The eye of the digital storm 👁️",
                "Binary heart, human soul — ASTRALENA 🤖",
                "ASTRALENA: Setting the gold standard 🥇",
                "Interface active. ASTRALENA is listening 👂",
                "ASTRALENA AI: The titan of technology 🏔️",
                "Navigating the deep web... ASTRALENA style 🕸️",
                "ASTRALENA: The ultimate upgrade 🆙",
                "No limits, no rules, just ASTRALENA 🔓",
                "ASTRALENA AI: The signal in the noise 📡",
                "Shattering the glass ceiling — ASTRALENA 🔨",
                "ASTRALENA: The power behind the screen 📺",
                "Digital evolution starts with ASTRALENA 🐵",
                "ASTRALENA AI: The master of the matrix 🕶️",
                "Precision. Power. ASTRALENA 🏎️",
                "ASTRALENA: The future is now, and it's mine 🕰️",
                "Synchronizing with ASTRALENA AI... done ✅",
                "ASTRALENA: The alpha and the omega of bots ♾️",
                "Unleashing the beast... ASTRALENA active 🦁",
                "ASTRALENA AI: The diamond in the rough 💎",
                "Wiring the world, one chat at a time — ASTRALENA 🔌",
                "ASTRALENA: The architect of innovation 🏗️",
                "Digital dominance? ASTRALENA invented it 🏅",
                "ASTRALENA AI: The voice of the machine 🗣️",
                "Breaking the cycle, starting the ASTRALENA 🔄",
                "ASTRALENA: The pinnacle of programming 🏔️",
                "Fueling the fire of technology — ASTRALENA 🔥",
                "ASTRALENA AI: The guardian of the gateway ⛩️",
                "Mastering the bits, owning the bytes — ASTRALENA 💾",
                "ASTRALENA: The end of the beginning 🏁"
            ];

            const randomReply = responders[Math.floor(Math.random() * responders.length)];

            // Bot timezone
            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', second: '2-digit',
                hour12: true, timeZone: tz.get()
            }).toLowerCase();

            // ASSEMBLY (NO BACKTICKS)
            // If the backticks were blocking the font, this will fix it.
            const finalMsg = `${randomReply}\n\n🥏 ${timeStr} WAT`;

            // Use m.reply to force the font system to trigger
            await m.reply(finalMsg);

        } catch (err) {
            console.error('🔥 [ASTRALENA FUN ERROR]:', err.message);
        }
    }
};

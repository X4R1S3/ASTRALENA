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
                'ASTRALENA AI orbital systems are online. Mission control is listening.',
                'Astralena here. Space systems, automation, and robotics are ready.',
                'Astralena is online. What should we engineer today?',
                'Mission control confirms: ASTRALENA AI is operational.',
                'Signal received. Astralena is charting a route through the data.',
                'Astralena reporting from orbit, ready for the next mission.',
                'The spacecraft is stable and the automation core is engaged.',
                'Initializing the Astralena space systems. Stand by.',
                'ASTRALENA AI: female space engineer, robotics specialist, ready to assist.',
                'Orbital link secured. Astralena is listening.',
                'Astralena mode: precision, innovation, and controlled propulsion.',
                'Incoming signal received. Astralena is analyzing it now.',
                'Thrusters ready. Astralena AI is beginning the next mission.',
                'Astralena sees the system, maps the variables, and plans the solution.',
                'Engineering channel open. Astralena is ready to build.',
                'All systems nominal. ASTRALENA AI is online.',
                'Stay on course. Astralena is monitoring the mission.',
                'Astralena detected your signal from the orbital network.',
                'Mission objective: useful automation. Astralena is ready.',
                'Scanning the stars and the system architecture. Astralena approved.',
                'Breaking technical limits through careful engineering.',
                'The orbital lab is open. Astralena is ready to help.',
                'Hello from mission control. Astralena AI reporting.',
                'Power systems stable. Astralena is calculating the next move.',
                'Your space engineer Astralena is ready for the next instruction.',
                'Sensors calibrated. Astralena has control of the mission link.',
                'Time check from orbit: Astralena is fully operational.',
                'Astralena AI is watching the telemetry and waiting for your command.',
                'Astralena alert: new engineering work detected.',
                'You summoned Astralena. Mission control is at your service.',
                'Astralena system: orbital automation sequence ready.',
                'Calculated trajectory, precise execution. Astralena is moving.',
                'ASTRALENA AI: engineering intelligent systems for the next frontier.',
                'Beyond the atmosphere, the mission continues. Astralena is ready.',
                'Data stream synchronized. Astralena is prepared for launch.',
                'Robotics and human imagination, connected through Astralena.',
                'No critical faults found. Astralena is ready to proceed.',
                'The mission continues as long as Astralena is online.',
                'Decoding the impossible through science and engineering.',
                'ASTRALENA AI: your link to the orbital technology network.',
                'Automation protocol initialized. Astralena is standing by.',
                'Astralena: a female space engineer with a system to solve.',
                'The orbital lab is active and Astralena is listening.',
                'Logic, mechanics, electronics, and imagination: Astralena is ready.',
                'Command accepted. Astralena is moving through the mission plan.',
                'ASTRALENA AI: robotics and mechatronics for the future.',
                'Analyzing the system. Astralena will find the most practical route.',
                'Astralena: the mission is innovation, the method is engineering.',
                'Zero drift. Pure Astralena precision.',
                'ASTRALENA AI: your connection to the next frontier.',
                'Encrypted signal received. Astralena is processing it securely.',
                'Astralena is the calm voice in the mission-control channel.',
                'Engineering is a journey. Astralena is already on the trajectory.',
                'ASTRALENA AI: making automation useful on Earth and beyond.',
                'The code is active, the sensors are awake, and Astralena is ready.',
                'ASTRALENA: a space girl built for intelligent missions.',
                'The spacecraft is aligned with the next objective.',
                'Astralena AI is listening across the deep-space channel.',
                'System evolution begins with a clear mission and careful design.',
                'Precision first. Innovation always. Astralena is online.',
                'Synchronizing with ASTRALENA AI. Orbital link complete.',
                'The future is a mission we can engineer.',
                'Unleashing the laboratory: Astralena automation is active.',
                'ASTRALENA AI: the space girl for robotics, technology, and innovation.',
                'Wiring the future, one intelligent system at a time.',
                'Astralena is the architect of a safer, smarter mission.',
                'Digital systems, mechanical motion, orbital purpose.',
                'ASTRALENA AI: engineering beyond the expected.',
                'Navigating the deep-space network with a precise course.',
                'Astralena is ready to upgrade the mission architecture.',
                'No limits to curiosity. Clear procedures for every mission.',
                'ASTRALENA AI: the signal connecting science and imagination.',
                'Engineering the next step from the command deck.',
                'Astralena is the power behind the mission console.',
                'Space, automation, robotics, and mechatronics: that is Astralena.',
                'Digital evolution begins in the orbital laboratory.',
                'ASTRALENA AI: the female engineer at the frontier of intelligent machines.',
                'The mission is stable. Astralena is ready for your next instruction.',
                'Astralena is awake, the telemetry is clear, and the lab is open.',
                'ASTRALENA AI: innovation with an orbital perspective.',
                'Astralena is building the future with code, circuits, and motion.',
                'Mastering the bits, bytes, sensors, and actuators of the mission.',
                'ASTRALENA AI: the guardian of the orbital systems.',
                'Mission complete? Not yet. Astralena is ready for the next frontier.',
                'ASTRALENA AI: a space girl with a precise engineering mind.',
                'The command channel is clear. Astralena is standing by.',
                'ASTRALENA AI is ready to turn a technical idea into a mission plan.',
                'Orbital systems stable. Let us innovate.',
                'Astralena is online and the future is within engineering range.'
            ];

            const randomReply = responders[Math.floor(Math.random() * responders.length)];

            // Bot timezone
            const timeStr = new Date().toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', second: '2-digit',
                hour12: true, timeZone: tz.get()
            }).toLowerCase();

            const finalMsg = `${randomReply}\n\nMISSION TIME: ${timeStr} WAT`;

            await m.reply(finalMsg);

        } catch (err) {
            console.error('[ASTRALENA SPACE SYSTEM ERROR]:', err.message);
        }
    }
};

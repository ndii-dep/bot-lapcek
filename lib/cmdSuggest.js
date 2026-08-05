const fs = require('fs');
const path = require('path');

function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

function levenshteinSimilarity(a, b) {
    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

function jaroWinklerSimilarity(a, b) {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;

    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchDistance);
        const end = Math.min(i + matchDistance + 1, s2.length);

        for (let j = start; j < end; j++) {
            if (s2Matches[j]) continue;
            if (s1[i] !== s2[j]) continue;
            
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    transpositions = Math.floor(transpositions / 2);

    const jaro = (
        matches / s1.length +
        matches / s2.length +
        (matches - transpositions) / matches
    ) / 3;

    const prefixLength = 4;
    let prefix = 0;
    for (let i = 0; i < Math.min(prefixLength, s1.length, s2.length); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    const scalingFactor = 0.1;
    return jaro + prefix * scalingFactor * (1 - jaro);
}

function diceCoefficient(a, b) {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();
    
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0.0;

    const bigrams1 = new Map();
    const bigrams2 = new Map();

    for (let i = 0; i < s1.length - 1; i++) {
        const bigram = s1.substring(i, i + 2);
        bigrams1.set(bigram, (bigrams1.get(bigram) || 0) + 1);
    }

    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        bigrams2.set(bigram, (bigrams2.get(bigram) || 0) + 1);
    }

    let intersection = 0;
    for (const [bigram, count1] of bigrams1) {
        const count2 = bigrams2.get(bigram) || 0;
        intersection += Math.min(count1, count2);
    }

    const total = bigrams1.size + bigrams2.size;
    return (2.0 * intersection) / total;
}

function soundex(str) {
    const s = str.toLowerCase();
    if (s.length === 0) return '';

    const mapping = {
        'b': '1', 'f': '1', 'p': '1', 'v': '1',
        'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
        'd': '3', 't': '3',
        'l': '4',
        'm': '5', 'n': '5',
        'r': '6'
    };

    let result = s[0].toUpperCase();
    let prevCode = mapping[s[0]] || '';

    for (let i = 1; i < s.length && result.length < 4; i++) {
        const code = mapping[s[i]] || '';
        if (code && code !== prevCode) {
            result += code;
            prevCode = code;
        }
    }

    return result.padEnd(4, '0').substring(0, 4);
}

function soundexSimilarity(a, b) {
    return soundex(a) === soundex(b) ? 1.0 : 0.0;
}

function combinedSimilarity(a, b) {
    const weights = {
        jaroWinkler: 0.35,
        levenshtein: 0.25,
        dice: 0.25,
        soundex: 0.10,
        prefix: 0.05
    };

    let score = 0;

    score += jaroWinklerSimilarity(a, b) * weights.jaroWinkler;
    score += levenshteinSimilarity(a, b) * weights.levenshtein;
    score += diceCoefficient(a, b) * weights.dice;
    score += soundexSimilarity(a, b) * weights.soundex;
    
    if (a.length >= 2 && b.length >= 2 && 
        a.slice(0, 2).toLowerCase() === b.slice(0, 2).toLowerCase()) {
        score += weights.prefix;
    }

    return Math.min(1, score);
}

const COMMAND_DATABASE = [
    { cmd: 'info', alias: ['menu', 'help', '?'], category: '📋 Info', desc: 'Info bot & menu' },
    { cmd: 'owner', alias: ['pemilik', 'creator', 'dev'], category: '📋 Info', desc: 'Info owner bot' },
    { cmd: 'walas', alias: ['walikelas', 'guru', 'teacher'], category: '📋 Info', desc: 'Info wali kelas' },
    { cmd: 'mylevel', alias: ['level', 'role'], category: '📋 Info', desc: 'Cek level user' },
    
    { cmd: 'today', alias: ['hariini', 'sekarang'], category: '📅 Jadwal', desc: 'Jadwal hari ini' },
    { cmd: 'tomorrow', alias: ['besok', 'reminderbesok'], category: '📅 Jadwal', desc: 'Reminder besok' },
    { cmd: 'mapel', alias: ['pelajaran', 'matapelajaran', 'subject'], category: '📅 Jadwal', desc: 'Jadwal mapel per hari' },
    { cmd: 'piket', alias: ['clean', 'bersih', 'duty'], category: '📅 Jadwal', desc: 'Jadwal piket per hari' },
    { cmd: 'jadwal', alias: ['schedule', 'fullschedule', 'lengkap'], category: '📅 Jadwal', desc: 'Jadwal lengkap' },
    
    { cmd: 'reminder', alias: ['reminders', 'pengingat', 'notif'], category: '⏰ Reminder', desc: 'Status reminder' },
    { cmd: 'sendreminder', alias: ['kirimreminder', 'sendnotif', 'kirimnotif'], category: '⏰ Reminder', desc: 'Kirim reminder manual' },
    
    { cmd: 'alight', alias: ['alightmotion', 'am', 'alightpremium', 'premium'], category: '🎬 Alight Motion', desc: 'Generate Alight Motion premium' },
    
    { cmd: 'songfess', alias: ['sf', 'song', 'lagu', 'musicfess'], category: '🎵 SongFess', desc: 'Kirim songfess ke channel' },
    
    { cmd: 'menfess', alias: ['confess', 'confes', 'menfes', 'anon', 'rahasia'], category: '💌 Menfess', desc: 'Kirim pesan anonim' },
    
    { cmd: 'sticker', alias: ['stiker', 's', 'stick', 'stickerwa'], category: '🎨 Sticker', desc: 'Buat sticker dari foto/video' },
    
    { cmd: 'addpr', alias: ['tambahpr', 'addtugas'], category: '📚 PR/Tugas', desc: 'Tambah PR baru' },
    { cmd: 'delpr', alias: ['hapuspr', 'deletepr'], category: '📚 PR/Tugas', desc: 'Hapus PR' },
    { cmd: 'pr', alias: ['listpr', 'tugas', 'dafpus'], category: '📚 PR/Tugas', desc: 'Lihat daftar PR' },
    
    { cmd: 'addpartner', alias: [], category: '⭐ Partner', desc: 'Tambah partner' },
    { cmd: 'delpartner', alias: ['removepartner'], category: '⭐ Partner', desc: 'Hapus partner' },
    { cmd: 'listpartner', alias: ['partners'], category: '⭐ Partner', desc: 'List partner' },
    
    { cmd: 'addch', alias: ['addchannel'], category: '📢 Channel', desc: 'Tambah channel' },
    { cmd: 'delch', alias: ['removechannel'], category: '📢 Channel', desc: 'Hapus channel' },
    { cmd: 'listch', alias: ['channels'], category: '📢 Channel', desc: 'List channel' },
    { cmd: 'addgroup', alias: ['addgrup'], category: '📢 Channel', desc: 'Tambah group' },
    { cmd: 'delgroup', alias: ['removegroup'], category: '📢 Channel', desc: 'Hapus group' },
    { cmd: 'listgroup', alias: ['groups', 'grup'], category: '📢 Channel', desc: 'List group' },
    { cmd: 'broadcast', alias: ['bc'], category: '📢 Channel', desc: 'Broadcast pesan' },
    
    { cmd: 'welcome', alias: ['autowelcome'], category: '⚙️ Auto Features', desc: 'Welcome canvas on/off' },
    { cmd: 'goodbye', alias: ['autogoodbye'], category: '⚙️ Auto Features', desc: 'Goodbye canvas on/off' },
    { cmd: 'typing', alias: ['autotyping'], category: '⚙️ Auto Features', desc: 'Auto typing on/off' },
    { cmd: 'record', alias: ['autorecord'], category: '⚙️ Auto Features', desc: 'Auto record VN on/off' },
    { cmd: 'read', alias: ['autoread'], category: '⚙️ Auto Features', desc: 'Auto read on/off' },
    { cmd: 'postsw', alias: ['autopostsw'], category: '⚙️ Auto Features', desc: 'Auto post SW on/off' },
    { cmd: 'reactsw', alias: ['autoreactsw'], category: '⚙️ Auto Features', desc: 'Auto react SW on/off' },
    { cmd: 'auto', alias: ['autofeatures'], category: '⚙️ Auto Features', desc: 'Status auto features' },
    
    { cmd: 'search', alias: ['cari', 'find', 'cmd'], category: '🔍 Search', desc: 'Cari command' },
    
    { cmd: 'getid', alias: ['id', 'chatid', 'cekid', 'myid'], category: '🛠️ Utility', desc: 'Lihat ID chat' },
    { cmd: 'ping', alias: ['cek', 'test', 'status', 'botstatus'], category: '🛠️ Utility', desc: 'Cek status bot' },
];

function getAllCommands() {
    const allCommands = [];
    
    COMMAND_DATABASE.forEach(item => {
        allCommands.push({
            cmd: item.cmd,
            alias: item.alias,
            category: item.category,
            desc: item.desc
        });
    });
    
    return allCommands;
}

function suggestCommand(input, threshold = 0.3, maxResults = 5) {
    const commands = getAllCommands();
    const results = [];

    commands.forEach(cmdItem => {
        let similarity = combinedSimilarity(input, cmdItem.cmd);
        
        cmdItem.alias.forEach(alias => {
            const aliasSim = combinedSimilarity(input, alias);
            similarity = Math.max(similarity, aliasSim);
        });

        if (cmdItem.cmd.startsWith(input) || input.startsWith(cmdItem.cmd)) {
            similarity = Math.max(similarity, 0.7);
        }
        
        if (cmdItem.cmd.includes(input) || input.includes(cmdItem.cmd)) {
            similarity = Math.max(similarity, 0.6);
        }

        if (similarity >= threshold) {
            results.push({
                cmd: cmdItem.cmd,
                alias: cmdItem.alias,
                similarity: similarity,
                category: cmdItem.category,
                desc: cmdItem.desc
            });
        }
    });

    results.sort((a, b) => b.similarity - a.similarity);

    const uniqueResults = [];
    const seen = new Set();
    
    results.forEach(r => {
        if (!seen.has(r.cmd)) {
            uniqueResults.push(r);
            seen.add(r.cmd);
        }
    });

    return uniqueResults.slice(0, maxResults);
}

function getProgressBar(similarity) {
    const barLength = 8;
    const filled = Math.round(similarity * barLength);
    const empty = barLength - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatSuggestion(input, suggestions, prefix = '.') {
    if (suggestions.length === 0) {
        return null;
    }

    let text = '';
    
    const getAccuracyEmoji = (sim) => {
        if (sim >= 0.9) return '🎯';
        if (sim >= 0.7) return '👍';
        if (sim >= 0.5) return '🤔';
        return '💡';
    };

    text += `╔══════════════════════════╗\n`;
    text += `║  💡 COMMAND SUGGESTION  ║\n`;
    text += `╚══════════════════════════╝\n\n`;
    
    text += `❌ *${prefix}${input}* tidak ditemukan!\n\n`;
    
    if (suggestions.length === 1) {
        const s = suggestions[0];
        const emoji = getAccuracyEmoji(s.similarity);
        const percent = Math.round(s.similarity * 100);
        
        text += `${emoji} *Mungkin maksud kamu:*\n\n`;
        text += `┌─────────────────────────┐\n`;
        text += `│  ${s.category.padEnd(23)} │\n`;
        text += `│  📝 *${prefix}${s.cmd}*${' '.repeat(20 - s.cmd.length)} │\n`;
        text += `│  📖 ${s.desc.padEnd(23)} │\n`;
        text += `│  🎯 ${percent}% mirip${' '.repeat(17 - percent.toString().length)} │\n`;
        text += `└─────────────────────────┘\n`;
        
        if (s.alias.length > 0) {
            text += `\n🔀 *Alias:* ${s.alias.map(a => prefix + a).join(', ')}\n`;
        }
    } else {
        text += `🤔 *Mungkin maksud kamu salah satu ini:*\n\n`;
        
        suggestions.forEach((s, i) => {
            const percent = Math.round(s.similarity * 100);
            const bar = getProgressBar(s.similarity);
            const emoji = i === 0 ? '⭐' : `${i + 1}️⃣`;
            
            text += `${emoji} *${prefix}${s.cmd}*\n`;
            text += `   📂 ${s.category}\n`;
            text += `   📖 ${s.desc}\n`;
            text += `   🎯 ${bar} ${percent}%\n`;
            
            if (s.alias.length > 0) {
                text += `   🔀 ${s.alias.slice(0, 3).map(a => prefix + a).join(', ')}\n`;
            }
            text += `\n`;
        });
    }

    text += `─────────────────────────\n`;
    text += `💡 *Tips:*\n`;
    text += `Ketik *${prefix}menu* untuk lihat\n`;
    text += `semua command yang tersedia.`;
    
    text += `\n🔍 Command yang mirip akan otomatis disarankan!`;

    return text;
}

function getCommandDetails(cmd) {
    const commands = getAllCommands();
    return commands.find(c => c.cmd === cmd || c.alias.includes(cmd));
}

function getCommandsByCategory(category) {
    const commands = getAllCommands();
    return commands.filter(c => c.category === category);
}

function getAllCategories() {
    const categories = new Set();
    COMMAND_DATABASE.forEach(c => categories.add(c.category));
    return Array.from(categories);
}

module.exports = {
    suggestCommand,
    formatSuggestion,
    getCommandDetails,
    getCommandsByCategory,
    getAllCategories,
    getAllCommands,
    COMMAND_DATABASE,
    levenshteinDistance,
    levenshteinSimilarity,
    jaroWinklerSimilarity,
    diceCoefficient,
    soundexSimilarity,
    combinedSimilarity
};

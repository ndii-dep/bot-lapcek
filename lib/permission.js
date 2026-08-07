const { getUserLevel, addPartner, removePartner, getPartners, getOwner, setOwner } = require('./dbManager');

const LEVELS = { GUEST: 0, PARTNER: 1, OWNER: 2 };

const PERMISSIONS = {
    GUEST: [
        'info', 'menu', 'help', '?', 'owner', 'pemilik', 'creator', 'dev',
        'walas', 'walikelas', 'guru', 'teacher',
        'today', 'hariini', 'sekarang', 'tomorrow', 'besok', 'reminderbesok',
        'mapel', 'pelajaran', 'matapelajaran', 'subject',
        'piket', 'clean', 'bersih', 'duty',
        'jadwal', 'schedule', 'fullschedule', 'lengkap',
        'reminder', 'reminders', 'pengingat', 'notif',
        'songfess', 'sf', 'song', 'lagu', 'musicfess',
        'menfess', 'confess', 'confes', 'menfes', 'anon', 'rahasia',
        'sticker', 'stiker', 's', 'stick', 'stickerwa',
        'getid', 'id', 'chatid', 'cekid', 'myid',
        'ping', 'cek', 'test', 'status', 'botstatus',
        'search', 'cari', 'find', 'cmd',
        'pr', 'listpr', 'tugas', 'dafpus',
        'mylevel', 'level', 'role',
        'newsletter', 'nl', 'chfollow', 'chinfo',
        'chcreate', 'chupdate', 'chdelete'
    ],
    PARTNER: [
        'addpr', 'tambahpr', 'addtugas',
        'delpr', 'hapuspr', 'deletepr',
        'sendreminder', 'kirimreminder', 'sendnotif', 'kirimnotif',
        'alight', 'alightmotion', 'am', 'alightpremium', 'premium'
    ],
    OWNER: [
        'addpartner', 'delpartner', 'removepartner', 'listpartner', 'partners',
        'addch', 'addchannel', 'delch', 'removechannel', 'listch', 'channels',
        'addgroup', 'addgrup', 'delgroup', 'removegroup', 'listgroup', 'groups', 'grup',
        'welcome', 'autowelcome', 'goodbye', 'autogoodbye',
        'typing', 'autotyping', 'record', 'autorecord',
        'read', 'autoread', 'postsw', 'autopostsw',
        'reactsw', 'autoreactsw', 'auto', 'autofeatures',
        'setwelcome', 'setwelcomemsg', 'setgoodbye', 'setgoodbyemsg',
        'setreact', 'setreactemoji', 'setpostsw', 'setpostcaption',
        'setowner', 'registerowner'
    ]
};

function hasPermission(senderNumber, command, pushName = '') {
    const level = getUserLevel(senderNumber, pushName);
    if (level === LEVELS.OWNER) return true;
    if (level === LEVELS.PARTNER) {
        return [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER].includes(command);
    }
    return PERMISSIONS.GUEST.includes(command);
}

function getLevelName(level) {
    switch(level) {
        case LEVELS.OWNER: return '👑 Owner';
        case LEVELS.PARTNER: return '⭐ Partner';
        default: return '👤 Guest';
    }
}

function getPermissionList(level) {
    switch(level) {
        case LEVELS.OWNER: return [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER, ...PERMISSIONS.OWNER];
        case LEVELS.PARTNER: return [...PERMISSIONS.GUEST, ...PERMISSIONS.PARTNER];
        default: return PERMISSIONS.GUEST;
    }
}

module.exports = {
    getUserLevel, hasPermission, getLevelName,
    addPartner, removePartner, getPartners, getOwner, setOwner,
    getPermissionList, LEVELS, PERMISSIONS
};

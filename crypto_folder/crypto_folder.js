const crypto = require('crypto');

const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

export default JSON.stringify({
    key: key,
    iv: iv
})
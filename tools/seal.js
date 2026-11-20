// © 2026 SAS BELM DEVELOPPEMENT. Chiffre private/audit-pack.json avec un code, vers audit-melia.enc.json (AES-GCM, PBKDF2 300 000 itérations).
// Usage : node tools/seal.js [CODE]   (sans argument : lit private/code-audit.txt)
const fs = require("fs"), crypto = require("crypto"), path = require("path");
const root = path.join(__dirname, ".."), code = (process.argv[2] || fs.readFileSync(path.join(root, "private/code-audit.txt"), "utf8")).trim();
const norm = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.pbkdf2Sync(norm, salt, 300000, 32, "sha256");
const c = crypto.createCipheriv("aes-256-gcm", key, iv), data = fs.readFileSync(path.join(root, "private/audit-pack.json"));
const ct = Buffer.concat([c.update(data), c.final(), c.getAuthTag()]);
fs.writeFileSync(path.join(root, "audit-melia.enc.json"), JSON.stringify({ v: 1, it: 300000, salt: salt.toString("base64"), iv: iv.toString("base64"), ct: ct.toString("base64") }));
console.log("audit-melia.enc.json écrit (" + ct.length + " octets chiffrés)");

// © 2026 SAS BELM DEVELOPPEMENT. Écrit animateur.json (empreinte PBKDF2 du code animateur ; le code lui-même n'est jamais publié).
// Usage : node tools/anim.js [CODE]   (sans argument : lit private/code-animateur.txt)
const fs = require("fs"), crypto = require("crypto"), path = require("path"), root = path.join(__dirname, "..");
const code = (process.argv[2] || fs.readFileSync(path.join(root, "private/code-animateur.txt"), "utf8")).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const salt = crypto.randomBytes(16), it = 300000, h = crypto.pbkdf2Sync(code, salt, it, 32, "sha256").toString("hex");
fs.writeFileSync(path.join(root, "animateur.json"), JSON.stringify({ v: 1, it, salt: salt.toString("base64"), h }));
console.log("animateur.json écrit");

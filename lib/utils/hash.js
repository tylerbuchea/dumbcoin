const crypto = require("crypto");

const hash = (any) => {
  let anyString = typeof any == "object" ? JSON.stringify(any) : any.toString();
  let anyHash = crypto.createHash("sha256").update(anyString).digest("hex");
  return anyHash;
};

module.exports = hash;

const crypto = require("crypto");

const randomId = (size = 64) => {
  return crypto.randomBytes(Math.floor(size / 2)).toString("hex");
};

module.exports = randomId;

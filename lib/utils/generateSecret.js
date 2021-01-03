const crypto = require("crypto");

const SALT = "0ffaa74d206930aaece253f090c88dbe6685b9e66ec49ad988d84fd7dff230d1";

const generateSecret = (password) => {
  let secret = crypto
    .pbkdf2Sync(password, SALT, 10000, 512, "sha512")
    .toString("hex");
  console.debug(`Secret: \n${secret}`);
  return secret;
};

module.exports = generateSecret;

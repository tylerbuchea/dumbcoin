const elliptic = require("elliptic");

const EdDSA = elliptic.eddsa;
const ec = new EdDSA("ed25519");

const generateKeyPairFromSecret = (secret) => {
  // Create key pair from secret
  let keyPair = ec.keyFromSecret(secret); // hex string, array or Buffer
  return keyPair;
};

module.exports = generateKeyPairFromSecret;

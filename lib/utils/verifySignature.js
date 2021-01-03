const elliptic = require("elliptic");

const EdDSA = elliptic.eddsa;
const ec = new EdDSA("ed25519");

const verifySignature = (publicKey, signature, messageHash) => {
  let key = ec.keyFromPublic(publicKey, "hex");
  let verified = key.verify(messageHash, signature);
  return verified;
};

module.exports = verifySignature;

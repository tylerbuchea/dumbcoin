const signHash = (keyPair, messageHash) => {
  let signature = keyPair.sign(messageHash).toHex().toLowerCase();
  return signature;
};

module.exports = signHash;

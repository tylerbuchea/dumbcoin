const R = require("ramda");

const generateSecret = require("./utils/generateSecret");
const generateKeyPairFromSecret = require("./utils/generateKeyPairFromSecret");
const toHex = require("./utils/toHex");
const hash = require("./utils/hash");
const randomId = require("./utils/randomId");

class Wallet {
  constructor() {
    this.id = null;
    this.passwordHash = null;
    this.secret = null;
    this.keyPairs = [];
  }

  generateAddress() {
    // If secret is null means it is a brand new wallet
    if (this.secret == null) {
      this.generateSecret();
    }

    let lastKeyPair = R.last(this.keyPairs);

    // Generate next seed based on the first secret or a new secret from the last key pair.
    let seed =
      lastKeyPair == null
        ? this.secret
        : generateSecret(R.propOr(null, "secretKey", lastKeyPair));
    let keyPairRaw = generateKeyPairFromSecret(seed);
    let newKeyPair = {
      index: this.keyPairs.length + 1,
      secretKey: toHex(keyPairRaw.getSecret()),
      publicKey: toHex(keyPairRaw.getPublic()),
    };
    this.keyPairs.push(newKeyPair);
    return newKeyPair.publicKey;
  }

  generateSecret() {
    this.secret = generateSecret(this.passwordHash);
    return this.secret;
  }

  getAddressByIndex(index) {
    return R.propOr(
      null,
      "publicKey",
      R.find(R.propEq("index", index), this.keyPairs)
    );
  }

  getAddressByPublicKey(publicKey) {
    return R.propOr(
      null,
      "publicKey",
      R.find(R.propEq("publicKey", publicKey), this.keyPairs)
    );
  }

  getSecretKeyByAddress(address) {
    return R.propOr(
      null,
      "secretKey",
      R.find(R.propEq("publicKey", address), this.keyPairs)
    );
  }

  getAddresses() {
    return R.map(R.prop("publicKey"), this.keyPairs);
  }

  static fromPassword(password) {
    let wallet = new Wallet();
    wallet.id = randomId();
    wallet.passwordHash = hash(password);
    return wallet;
  }

  static fromHash(passwordHash) {
    let wallet = new Wallet();
    wallet.id = randomId();
    wallet.passwordHash = passwordHash;
    return wallet;
  }

  static fromJson(data) {
    let wallet = new Wallet();
    R.forEachObjIndexed((value, key) => {
      wallet[key] = value;
    }, data);
    return wallet;
  }
}

module.exports = Wallet;

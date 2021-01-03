const R = require("ramda");

const Transaction = require("./Transaction");
const Wallet = require("./Wallet");
const TransactionBuilder = require("./TransactionBuilder");
const Wallets = require("./Wallets");
const Db = require("./Db");
const { FEE_PER_TRANSACTION } = require("./utils/constants");

class Operator {
  constructor(dbName, blockchain) {
    this.db = new Db("data/" + dbName + "/wallets.json", new Wallets());

    // INFO: In this implementation the database is a file and every time data is saved it rewrites the file, probably it should be a more robust database for performance reasons
    this.wallets = this.db.read(Wallets);
    this.blockchain = blockchain;
  }

  addWallet(wallet) {
    this.wallets.push(wallet);
    this.db.write(this.wallets);
    return wallet;
  }

  createWalletFromPassword(password) {
    let newWallet = Wallet.fromPassword(password);
    return this.addWallet(newWallet);
  }

  checkWalletPassword(walletId, passwordHash) {
    let wallet = this.getWalletById(walletId);
    if (wallet == null)
      throw new Error(`Wallet not found with id '${walletId}'`);

    return wallet.passwordHash == passwordHash;
  }

  getWallets() {
    return this.wallets;
  }

  getWalletById(walletId) {
    return R.find((wallet) => {
      return wallet.id == walletId;
    }, this.wallets);
  }

  generateAddressForWallet(walletId) {
    let wallet = this.getWalletById(walletId);
    if (wallet == null)
      throw new Error(`Wallet not found with id '${walletId}'`);

    let address = wallet.generateAddress();
    this.db.write(this.wallets);
    return address;
  }

  getAddressesForWallet(walletId) {
    let wallet = this.getWalletById(walletId);
    if (wallet == null)
      throw new Error(`Wallet not found with id '${walletId}'`);

    let addresses = wallet.getAddresses();
    return addresses;
  }

  getBalanceForAddress(addressId) {
    let utxo = this.blockchain.getUnspentTransactionsForAddress(addressId);

    if (utxo == null || utxo.length == 0) {
      throw new Error(`No transactions found for address '${addressId}'`);
    }
    return R.sum(R.map(R.prop("amount"), utxo));
  }

  createTransaction(
    walletId,
    fromAddressId,
    toAddressId,
    amount,
    changeAddressId
  ) {
    let utxo = this.blockchain.getUnspentTransactionsForAddress(fromAddressId);
    let wallet = this.getWalletById(walletId);

    if (wallet == null)
      throw new Error(`Wallet not found with id '${walletId}'`);

    let secretKey = wallet.getSecretKeyByAddress(fromAddressId);

    if (secretKey == null)
      throw new Error(
        `Secret key not found with Wallet id '${walletId}' and address '${fromAddressId}'`
      );

    let tx = new TransactionBuilder();
    tx.from(utxo);
    tx.to(toAddressId, amount);
    tx.change(changeAddressId || fromAddressId);
    tx.fee(FEE_PER_TRANSACTION);
    tx.sign(secretKey);

    return Transaction.fromJson(tx.build());
  }
}

module.exports = Operator;

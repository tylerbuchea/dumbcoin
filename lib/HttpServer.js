const express = require("express");
const bodyParser = require("body-parser");
const R = require("ramda");

const Block = require("./Block");
const Transaction = require("./Transaction");
const hash = require("./utils/hash");

class HttpServer {
  constructor(node, blockchain, operator, miner) {
    this.app = express();

    const projectWallet = (wallet) => {
      return {
        id: wallet.id,
        addresses: R.map((keyPair) => {
          return keyPair.publicKey;
        }, wallet.keyPairs),
      };
    };

    this.app.use(bodyParser.json());

    this.app.get("/blockchain/blocks", (req, res) => {
      return res.status(200).send(blockchain.getAllBlocks());
    });

    this.app.get("/blockchain/blocks/latest", (req, res) => {
      let lastBlock = blockchain.getLastBlock();
      if (lastBlock == null) {
        return res.sendStatus(404, "Last block not found");
      }

      return res.status(200).send(lastBlock);
    });

    this.app.put("/blockchain/blocks/latest", (req, res) => {
      let requestBlock = Block.fromJson(req.body);
      let result = node.checkReceivedBlock(requestBlock);

      if (result == null) {
        return res.status(200).send("Requesting the blockchain to check.");
      } else if (result) {
        return res.status(200).send(requestBlock);
      } else {
        return res.status(409).send("Blockchain is update.");
      }
    });

    this.app.get("/blockchain/blocks/:hash([a-zA-Z0-9]{64})", (req, res) => {
      let blockFound = blockchain.getBlockByHash(req.params.hash);
      if (blockFound == null) {
        return res.sendStatus(
          404,
          `Block not found with hash '${req.params.hash}'`
        );
      }

      return res.status(200).send(blockFound);
    });

    this.app.get("/blockchain/blocks/:index", (req, res) => {
      let blockFound = blockchain.getBlockByIndex(parseInt(req.params.index));
      if (blockFound == null) {
        return res.sendStatus(
          404,
          `Block not found with index '${req.params.index}'`
        );
      }

      return res.status(200).send(blockFound);
    });

    this.app.get(
      "/blockchain/blocks/transactions/:transactionId([a-zA-Z0-9]{64})",
      (req, res) => {
        let transactionFromBlock = blockchain.getTransactionFromBlocks(
          req.params.transactionId
        );
        if (transactionFromBlock == null) {
          return res.sendStatus(
            404,
            `Transaction '${req.params.transactionId}' not found in any block`
          );
        }

        return res.status(200).send(transactionFromBlock);
      }
    );

    this.app.get("/blockchain/transactions", (req, res) => {
      return res.status(200).send(blockchain.getAllTransactions());
    });

    this.app.post("/blockchain/transactions", (req, res) => {
      let requestTransaction = Transaction.fromJson(req.body);
      let transactionFound = blockchain.getTransactionById(
        requestTransaction.id
      );

      if (transactionFound != null) {
        return res
          .status(409)
          .send(`Transaction '${requestTransaction.id}' already exists`);
      }

      try {
        let newTransaction = blockchain.addTransaction(requestTransaction);
        return res.status(201).send(newTransaction);
      } catch (ex) {
        return res.status(400).send({ message: ex.message, walletId, ex });
      }
    });

    this.app.get("/blockchain/transactions/unspent", (req, res) => {
      return res
        .status(200)
        .send(blockchain.getUnspentTransactionsForAddress(req.query.address));
    });

    this.app.get("/operator/wallets", (req, res) => {
      let wallets = operator.getWallets();
      let projectedWallets = R.map(projectWallet, wallets);
      return res.status(200).send(projectedWallets);
    });

    this.app.post("/operator/wallets", (req, res) => {
      let password = req.body.password;
      if (R.match(/\w+/g, password).length <= 4) {
        return res.status(400).send("Password must contain more than 4 words");
      }

      let newWallet = operator.createWalletFromPassword(password);
      let projectedWallet = projectWallet(newWallet);

      return res.status(201).send(projectedWallet);
    });

    this.app.get("/operator/wallets/:walletId", (req, res) => {
      let walletFound = operator.getWalletById(req.params.walletId);
      if (walletFound == null) {
        return res.sendStatus(
          404,
          `Wallet not found with id '${req.params.walletId}'`
        );
      }

      let projectedWallet = projectWallet(walletFound);

      return res.status(200).send(projectedWallet);
    });

    this.app.post("/operator/wallets/:walletId/transactions", (req, res) => {
      let walletId = req.params.walletId;
      let password = req.headers.password;

      if (password == null) {
        return res.status(401).send("Wallet's password is missing.");
      }
      let passwordHash = hash(password);

      try {
        if (!operator.checkWalletPassword(walletId, passwordHash)) {
          return res
            .status(403)
            .send(`Invalid password for wallet '${walletId}'`);
        }

        let newTransaction = operator.createTransaction(
          walletId,
          req.body.fromAddress,
          req.body.toAddress,
          req.body.amount,
          req.body["changeAddress"] || req.body.fromAddress
        );

        newTransaction.check();

        let transactionCreated = blockchain.addTransaction(
          Transaction.fromJson(newTransaction)
        );
        return res.status(201).send(transactionCreated);
      } catch (ex) {
        return res.status(400).send({ message: ex.message, walletId, ex });
      }
    });

    this.app.get("/operator/wallets/:walletId/addresses", (req, res) => {
      let walletId = req.params.walletId;
      try {
        let addresses = operator.getAddressesForWallet(walletId);
        return res.status(200).send(addresses);
      } catch (ex) {
        return res.status(400).send({ message: ex.message, walletId, ex });
      }
    });

    this.app.post("/operator/wallets/:walletId/addresses", (req, res) => {
      let walletId = req.params.walletId;
      let password = req.headers.password;

      if (password == null) {
        return res.status(401).send("Wallet's password is missing.");
      }
      let passwordHash = hash(password);

      try {
        if (!operator.checkWalletPassword(walletId, passwordHash)) {
          return res
            .status(403)
            .send(`Invalid password for wallet '${walletId}'`);
        }

        let newAddress = operator.generateAddressForWallet(walletId);
        return res.status(201).send({ address: newAddress });
      } catch (ex) {
        return res.status(400).send({ message: ex.message, walletId, ex });
      }
    });

    this.app.get("/operator/:addressId/balance", (req, res) => {
      let addressId = req.params.addressId;

      try {
        let balance = operator.getBalanceForAddress(addressId);
        return res.status(200).send({ balance: balance });
      } catch (ex) {
        return res.sendStatus(404);
      }
    });

    this.app.get("/node/peers", (req, res) => {
      return res.status(200).send(node.peers);
    });

    this.app.post("/node/peers", (req, res) => {
      let newPeer = node.connectToPeer(req.body);
      return res.status(201).send(newPeer);
    });

    this.app.get(
      "/node/transactions/:transactionId([a-zA-Z0-9]{64})/confirmations",
      (req, res) => {
        node
          .getConfirmations(req.params.transactionId)
          .then((confirmations) => {
            return res.status(200).send({ confirmations: confirmations });
          });
      }
    );

    this.app.post("/miner/mine", (req, res) => {
      miner
        .mine(
          req.body.rewardAddress,
          req.body["feeAddress"] || req.body.rewardAddress
        )
        .then((newBlock) => {
          newBlock = Block.fromJson(newBlock);
          blockchain.addBlock(newBlock);
          return res.status(201).send(newBlock);
        })
        .catch((ex) => {
          res.sendStatus(
            409,
            "A new block were added before we were able to mine one"
          );
        });
    });

    this.app.use(function (err, req, res, next) {
      // eslint-disable-line no-unused-vars
      return res
        .status(err?.status || 500)
        .send(err.message + (err.cause ? " - " + err.cause.message : ""));
    });
  }

  listen(host, port) {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, host, (err) => {
        if (err) reject(err);
        console.info(
          `Listening http on port: ${
            this.server.address().port
          }, to access the API documentation go to http://${host}:${
            this.server.address().port
          }/api-docs/`
        );
        resolve(this);
      });
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        console.info("Closing http");
        resolve(this);
      });
    });
  }
}

module.exports = HttpServer;

const R = require("ramda");

const hash = require("./utils/hash");
const verifySignature = require("./utils/verifySignature");
const { FEE_PER_TRANSACTION } = require("./utils/constants");

class Transaction {
  construct() {
    this.id = null;
    this.hash = null;
    this.type = null;
    this.data = {
      inputs: [],
      outputs: [],
    };
  }

  toHash() {
    // INFO: There are different implementations of the hash algorithm, for example: https://en.bitcoin.it/wiki/Hashcash
    return hash(this.id + this.type + JSON.stringify(this.data));
  }

  check() {
    // Check if the transaction hash is correct
    let isTransactionHashValid = this.hash == this.toHash();

    if (!isTransactionHashValid) {
      console.error(`Invalid transaction hash '${this.hash}'`);
      throw new Error(`Invalid transaction hash '${this.hash}'`, this);
    }

    // Check if the signature of all input transactions are correct (transaction data is signed by the public key of the address)
    R.map((txInput) => {
      let txInputHash = hash({
        transaction: txInput.transaction,
        index: txInput.index,
        address: txInput.address,
      });
      let isValidSignature = verifySignature(
        txInput.address,
        txInput.signature,
        txInputHash
      );

      if (!isValidSignature) {
        console.error(
          `Invalid transaction input signature '${JSON.stringify(txInput)}'`
        );
        throw new Error(
          `Invalid transaction input signature '${JSON.stringify(txInput)}'`,
          txInput
        );
      }
    }, this.data.inputs);

    if (this.type == "regular") {
      // Check if the sum of input transactions are greater than output transactions, it needs to leave some room for the transaction fee
      let sumOfInputsAmount = R.sum(R.map(R.prop("amount"), this.data.inputs));
      let sumOfOutputsAmount = R.sum(
        R.map(R.prop("amount"), this.data.outputs)
      );

      let negativeOutputsFound = 0;
      let i = 0;
      let outputsLen = this.data.outputs.length;

      // Check for negative outputs
      for (i = 0; i < outputsLen; i++) {
        if (this.data.outputs[i].amount < 0) {
          negativeOutputsFound++;
        }
      }

      let isInputsAmountGreaterOrEqualThanOutputsAmount = R.gte(
        sumOfInputsAmount,
        sumOfOutputsAmount
      );

      if (!isInputsAmountGreaterOrEqualThanOutputsAmount) {
        console.error(
          `Invalid transaction balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`
        );
        throw new Error(
          `Invalid transaction balance: inputs sum '${sumOfInputsAmount}', outputs sum '${sumOfOutputsAmount}'`,
          { sumOfInputsAmount, sumOfOutputsAmount }
        );
      }

      let isEnoughFee =
        sumOfInputsAmount - sumOfOutputsAmount >= FEE_PER_TRANSACTION; // 1 because the fee is 1 satoshi per transaction

      if (!isEnoughFee) {
        console.error(
          `Not enough fee: expected '${FEE_PER_TRANSACTION}' got '${
            sumOfInputsAmount - sumOfOutputsAmount
          }'`
        );
        throw new Error(
          `Not enough fee: expected '${FEE_PER_TRANSACTION}' got '${
            sumOfInputsAmount - sumOfOutputsAmount
          }'`,
          {
            sumOfInputsAmount,
            sumOfOutputsAmount,
            FEE_PER_TRANSACTION: FEE_PER_TRANSACTION,
          }
        );
      }
      if (negativeOutputsFound > 0) {
        console.error(
          `Transaction is either empty or negative, output(s) caught: '${negativeOutputsFound}'`
        );
        throw new Error(
          `Transaction is either empty or negative, output(s) caught: '${negativeOutputsFound}'`
        );
      }
    }

    return true;
  }

  static fromJson(data) {
    let transaction = new Transaction();
    R.forEachObjIndexed((value, key) => {
      transaction[key] = value;
    }, data);
    transaction.hash = transaction.toHash();
    return transaction;
  }
}

module.exports = Transaction;

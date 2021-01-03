const R = require("ramda");

const Transaction = require("./Transaction");

class Transactions extends Array {
  static fromJson(data) {
    let transactions = new Transactions();
    R.forEach((transaction) => {
      transactions.push(Transaction.fromJson(transaction));
    }, data);
    return transactions;
  }
}

module.exports = Transactions;

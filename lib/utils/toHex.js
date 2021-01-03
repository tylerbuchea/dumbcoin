const elliptic = require("elliptic");

const toHex = (data) => {
  return elliptic.utils.toHex(data);
};

module.exports = toHex;

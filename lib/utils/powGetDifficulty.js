const powGetDifficulty = (blocks, index) => {
  // Proof-of-work difficulty settings
  const BASE_DIFFICULTY = Number.MAX_SAFE_INTEGER;
  const EVERY_X_BLOCKS = 5;
  const POW_CURVE = 5;

  // INFO: The difficulty is the formula that dumbcoin choose to check the proof a work, this number is later converted to base 16 to represent the minimal initial hash expected value.
  // INFO: This could be a formula based on time. Eg.: Check how long it took to mine X blocks over a period of time and then decrease/increase the difficulty based on that. See https://en.bitcoin.it/wiki/Difficulty
  return Math.max(
    Math.floor(
      BASE_DIFFICULTY /
        Math.pow(
          Math.floor(((index || blocks.length) + 1) / EVERY_X_BLOCKS) + 1,
          POW_CURVE
        )
    ),
    0
  );
};

module.exports = powGetDifficulty;

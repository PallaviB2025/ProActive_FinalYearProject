// Curated EFF-inspired memorable wordlist for offline Diceware passphrases
export const DICEWARE_WORDS: readonly string[] = [
  "acorn", "amber", "anchor", "anthem", "apex", "apron", "archer", "arrow",
  "atlas", "aurora", "bacon", "badge", "baker", "bamboo", "banner", "beacon",
  "beaver", "bison", "blaze", "bloom", "bonnet", "border", "breeze", "bridge",
  "bronze", "cabin", "cactus", "canyon", "castle", "cedar", "cereal", "chalk",
  "cherry", "cipher", "circus", "cliff", "clover", "cobalt", "comet", "compass",
  "copper", "coral", "crater", "crest", "cricket", "crystal", "dagger", "dawn",
  "delta", "desert", "dolphin", "dragon", "drift", "dune", "eagle", "echo",
  "ember", "falcon", "fathom", "feather", "fern", "finch", "flame", "flint",
  "forest", "fossil", "frost", "galaxy", "garnet", "geyser", "glacier", "glade",
  "glider", "glow", "granite", "grove", "harbor", "haven", "hawk", "helium",
  "helmet", "heron", "horizon", "hound", "icicle", "iguana", "island", "ivory",
  "jaguar", "jasper", "javelin", "jungle", "jupiter", "kayak", "kelp", "kestrel",
  "kodiak", "lagoon", "lantern", "lark", "lava", "ledger", "lemur", "leopard",
  "lichen", "lighthouse", "lily", "lynx", "magnet", "magnolia", "mantle", "marble",
  "meadow", "meteor", "minnow", "mirage", "monarch", "moon", "moss", "mountain",
  "nebula", "nectar", "nest", "nickel", "nomad", "north", "nova", "oasis",
  "ocean", "olive", "onyx", "opal", "orbit", "orca", "orchid", "osprey",
  "otter", "ozone", "panther", "parrot", "pebble", "pelican", "penguin", "phoenix",
  "pilot", "pine", "pioneer", "planet", "plasma", "polar", "prairie", "prism",
  "pyramid", "quartz", "radar", "radiant", "raptor", "raven", "reef", "rhino",
  "ridge", "river", "rocket", "ruby", "saffron", "sage", "sahara", "sailor",
  "salmon", "sand", "sapphire", "saturn", "savanna", "scarlet", "scout", "sequoia",
  "shadow", "shield", "sierra", "silver", "solstice", "sparrow", "spiral", "spruce",
  "star", "stone", "summit", "sun", "sunrise", "talon", "tapestry", "temple",
  "terra", "thistle", "thunder", "tiger", "timber", "titan", "topaz", "tornado",
  "tracker", "tropic", "tulip", "tundra", "valley", "vapor", "velvet", "venture",
  "vessel", "vibrant", "violet", "viper", "volcano", "voyage", "walrus", "willow",
  "wind", "wolf", "zenith", "zephyr", "zodiac"
];

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS = /[0O1lI|`'"]/g;

export type PasswordOptions = {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
};

export type PassphraseOptions = {
  words?: number;
  separator?: string;
  capitalize?: boolean;
  includeNumber?: boolean;
};

function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  // Rejection sampling over 32-bit unsigned integers to eliminate modulo bias
  const limit = Math.floor(0x100000000 / max) * max;
  const array = new Uint32Array(1);
  while (true) {
    crypto.getRandomValues(array);
    const value = array[0]!;
    if (value < limit) {
      return value % max;
    }
  }
}

export function generatePassword(options: PasswordOptions = {}): string {
  const length = Math.max(8, Math.min(64, options.length ?? 20));
  let upper = UPPER;
  let lower = LOWER;
  let numbers = NUMBERS;
  let symbols = SYMBOLS;

  if (options.excludeAmbiguous) {
    upper = upper.replace(AMBIGUOUS, "");
    lower = lower.replace(AMBIGUOUS, "");
    numbers = numbers.replace(AMBIGUOUS, "");
    symbols = symbols.replace(AMBIGUOUS, "");
  }

  const pools: string[] = [];
  if (options.uppercase ?? true) pools.push(upper);
  if (options.lowercase ?? true) pools.push(lower);
  if (options.numbers ?? true) pools.push(numbers);
  if (options.symbols ?? true) pools.push(symbols);

  if (pools.length === 0) pools.push(lower, numbers);

  const fullPool = pools.join("");
  const result: string[] = [];

  // Guarantee at least one character from each active pool
  for (const pool of pools) {
    result.push(pool[secureRandomInt(pool.length)]!);
  }

  // Fill the remainder from the combined pool
  while (result.length < length) {
    result.push(fullPool[secureRandomInt(fullPool.length)]!);
  }

  // Cryptographically shuffle the result array (Fisher-Yates)
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }

  return result.join("");
}

export function generatePassphrase(options: PassphraseOptions = {}): string {
  const count = Math.max(3, Math.min(8, options.words ?? 4));
  const separator = options.separator ?? "-";
  const words: string[] = [];

  for (let i = 0; i < count; i++) {
    let word = DICEWARE_WORDS[secureRandomInt(DICEWARE_WORDS.length)]!;
    if (options.capitalize ?? true) {
      word = word[0]!.toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  let passphrase = words.join(separator);
  if (options.includeNumber ?? true) {
    const num = secureRandomInt(90) + 10; // 10-99
    passphrase += separator + num;
  }

  return passphrase;
}

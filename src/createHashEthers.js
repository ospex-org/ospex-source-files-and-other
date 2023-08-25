const fs = require('fs');
const { utils } = require('ethers');

// Read the source file
const source = fs.readFileSync('./contestCreation.js', 'utf8');

// Calculate the Keccak-256 hash
const hash = utils.keccak256(utils.toUtf8Bytes(source));

// Print the hash
console.log(hash);

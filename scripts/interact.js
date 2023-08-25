// scripts/interact.js
// this script can be used within a hardhat environment to interact with the ContestOracleResolved.sol contract, to create and score contests
const fs = require('fs');
const hre = require("hardhat");
const EthCrypto = require("eth-crypto");

const path = require('path');
const sourceFilePath = path.join(__dirname, '../contestCreation.js');
// const sourceFilePath = path.join(__dirname, '../contestScoring.js');

async function main() {
  const ownerPrivateKey = process.env.PRIVATE_KEY;
  const ownerWallet = new hre.ethers.Wallet(ownerPrivateKey, hre.ethers.provider);
  
  // link token address
  const linkAddress = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
  const linkAmount = hre.ethers.utils.parseUnits("0.25", 18);

  const IERC20_ABI = [
    // Only the functions we need
    "function transfer(address recipient, uint256 amount) external returns (bool)"
  ];

  const linkToken = await hre.ethers.getContractAt(IERC20_ABI, linkAddress, ownerWallet);

  const contractAddress = "0x34E3aD450CE15703B19e0BA39504C4C487287864";

  const contractABI = []; // current ABI goes here

  // Create a new contract instance
  const contract = new hre.ethers.Contract(contractAddress, contractABI, ownerWallet);

  console.log(`Transferring LINK to ${contractAddress}...`);
  const transferTx = await linkToken.transfer(contractAddress, linkAmount);
  await transferTx.wait();
  console.log("Transfer done.");

  // Read the source code from a file
  const source = fs.readFileSync(sourceFilePath, 'utf8');

  // secrets
  const secrets = EthCrypto.cipher.stringify(
    await EthCrypto.encryptWithPublicKey(
      process.env.DON_PUBLIC_KEY,
      "https://testbucket20230723v.s3.us-west-1.amazonaws.com/offchain-secrets2.json"
    ),
  );

  // args
  const args = ["4bf42e3b32225e8950f1acfcec62a54a", "296929", "9767078e-abf9-4b24-895e-a1ac3ba845e4"]; // replace these with: rundownId, sportspageId, jsonoddsId

  // my subscription id
  const subscriptionId = 1981;

  // gas limit (max)
  const gasLimit = 300000;

  const tx = await contract.createContest(args[0], args[1], args[2], source, '0x' + secrets, subscriptionId, gasLimit, {
    gasLimit: 15000000
  })

  // use this code to score a specific contest, replace the 1 below with the Id of the contest you are attempting to score
  // no args necessary for scoring a contest
  //   const tx = await contract.scoreContest(1, source, '0x' + secrets, subscriptionId, gasLimit, {
  //     gasLimit: 15000000
  //   })

  console.log("Transaction hash:", tx.hash);

  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  console.log("Transaction was mined in block", receipt.blockNumber);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

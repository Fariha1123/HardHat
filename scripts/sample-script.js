// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile 
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const T = await hre.ethers.getContractFactory("Token");
    const t = await T.deploy("TokenA", "TOKENA");

    // We get the contract to deploy
    const Tb = await hre.ethers.getContractFactory("Token");
    const tb = await Tb.deploy("TokenB", "TOKENB");

    // We get the contract to deploy
    const AMM = await hre.ethers.getContractFactory("AMM");
    const amm = await AMM.deploy(t.address, tb.address);

    await amm.deployed();

    console.log("AMM deployed to:", amm.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
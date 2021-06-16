import {ethers} from "hardhat";
import { BigNumber, Signer } from "ethers";
import { expect } from "chai";

describe("Contracts Creation", function () {
    let accounts: Signer[];
    let TOKENA:any, TOKENB:any;

    // fetch all accounts before each test
    beforeEach(async function () {
      accounts = await ethers.getSigners();
    });
  
    it("TokenA deployed successfully", async function () {
      let tokenA = await ethers.getContractFactory("Token");
      TOKENA = await tokenA.deploy("tokenA", "TOKENA");
      // await tokenA.deployed();

      expect(TOKENA.address).is.not.null;
      expect(await TOKENA.name()).is.equal("tokenA");
      expect(await TOKENA.symbol()).is.equal("TOKENA");
    });

    it("TokenB deployed successfully", async function () {
        let tokenB = await ethers.getContractFactory("Token");
        TOKENB = await tokenB.deploy("tokenB", "TOKENB");
        // await tokenA.deployed();
  
        expect(TOKENB.address).is.not.null;
        expect(TOKENB.address).is.not.equal("0x0");
        expect(await TOKENB.name()).is.equal("tokenB");
        expect(await TOKENB.symbol()).is.equal("TOKENB");
    });

    it("AMM deployed successfully", async function () {
        let amm = await ethers.getContractFactory("AMM");
        let AMM = await amm.deploy(TOKENA.address, TOKENB.address);
        
        expect(AMM.address).is.not.null;
        let tokens = await AMM.tokens(1);
        expect(tokens[0]).is.equal(TOKENA.address);
        tokens = await AMM.tokens(2);
        expect(tokens[0]).is.equal(TOKENB.address);
        expect(await AMM.owner()).is.equal(await accounts[0].getAddress());
    });
});

describe("AMM ADD LIQUIDITY function", function () {
    let accounts: Signer[];
    let TOKENA:any, TOKENB:any, AMM:any;

    // fetch all accounts before each test
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        let tokenA = await ethers.getContractFactory("Token");
        TOKENA = await tokenA.deploy("tokenA", "TOKENA");

        let tokenB = await ethers.getContractFactory("Token");
        TOKENB = await tokenB.deploy("tokenB", "TOKENB");

        let amm = await ethers.getContractFactory("AMM");
        AMM = await amm.deploy(TOKENA.address, TOKENB.address);

        // add allowance to the token A and token B
        await TOKENA.approve(AMM.address, "1000");
        await TOKENB.approve(AMM.address, "100");
    });

    it("adds liquidity with 0 allowance should fail", async function () {
        // add allowance to the token A and token B
        await TOKENA.approve(AMM.address, "0");
        await TOKENB.approve(AMM.address, "0");
        try{
            await AMM.AddLiquidity("1000","100");
        }catch(err){
            expect(err).is.not.undefined;
            expect(err).is.not.null;
        }
    });

    it("adds liquidity with insufficient allowance fails", async function () {
        try{
            await AMM.AddLiquidity("1000","10000");
        } catch(err) {
            expect(1).is.equal(1);
        }
        
    });

    it("adds liquidity by owner", async function () {
        await AMM.AddLiquidity("1000","100");
        let tokenA = await AMM.tokens(1);
        expect(tokenA.initialLiq).is.equal(1000);
        let tokenB = await AMM.tokens(2);
        expect(tokenB.initialLiq).is.equal(100);
        expect(await TOKENA.balanceOf(AMM.address)).is.equal(1000);
        expect(await TOKENB.balanceOf(AMM.address)).is.equal(100);
    });
    
    it("adding insufficient liquidity fails", async function () {
        try{
            await AMM.AddLiquidity("0","100");
        } catch(err){
            expect(1).equal(1);
        }
    });

    it("adds liquidity by owner twice fails", async function () {
        try{
            await AMM.AddLiquidity("1000","100");
            await AMM.AddLiquidity("1000","100");
        }
        catch{
            expect(1).is.equal(1);
        }
    });

    it("adds liquidity by non-owner fails", async function () {
        // add allowance to the token A and token B
        
        await TOKENA.connect(accounts[1]).approve(AMM.address, "1000");
        await TOKENB.connect(accounts[1]).approve(AMM.address, "100");
        try{
            await AMM.connect(accounts[1]).AddLiquidity("1000","100");
        } catch(err) {
            expect(1).is.equal(1);
        }
        
    });

    it("checks rate of exchange of A to B", async function () {
        await AMM.AddLiquidity("1000","100");
        let rate = (await AMM.rateAToB()).toString();
        expect(rate/1e12).is.equal(0.1);
    });

    it("checks rate of exchange of B to A", async function () {
        await AMM.AddLiquidity("1000","100");
        let rate = (await AMM.rateBToA()).toString();
        expect(rate/1e12).is.equal(10);
    });
});


describe("AMM EXCHANGE function", function () {
    
    let accounts: Signer[];
    let TOKENA:any, TOKENB:any, AMM:any;

    // fetch all accounts before each test
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        let tokenA = await ethers.getContractFactory("Token");
        TOKENA = await tokenA.deploy("tokenA", "TOKENA");

        let tokenB = await ethers.getContractFactory("Token");
        TOKENB = await tokenB.deploy("tokenB", "TOKENB");

        let amm = await ethers.getContractFactory("AMM");
        AMM = await amm.deploy(TOKENA.address, TOKENB.address);

        // add allowance to the token A and token B
        await TOKENA.approve(AMM.address, "1000");
        await TOKENB.approve(AMM.address, "100");

        // add liquidity of token A (1000) and token B (100) by owner
        await AMM.AddLiquidity(1000, 100);

        // fund account 1 with token A
        await TOKENA.transfer(accounts[1].getAddress(), 2000);
        
        // fund account 2 with token B
        await TOKENB.transfer(accounts[2].getAddress(), 2000);
    });

    it("exchange 500 token A to token B", async function () {

        // add allowance from acc1 for token A to AMM contract
        await TOKENA.connect(accounts[1]).approve(AMM.address, 1000);

        await AMM.connect(accounts[1]).Exchange(500, 1, 2);
        expect(await TOKENA.balanceOf(accounts[1].getAddress())).is.equal(1500); // out of 2000, 500 are exchanged
        expect(await TOKENB.balanceOf(accounts[1].getAddress())).is.equal(50); // acc 1 should have successfully exchanged the token A to token B
    });

    it("exchange token A to token B when token A to be exchanged is more than liquidity", async function () {

        // add allowance from acc1 for token A to AMM contract
        await TOKENA.connect(accounts[1]).approve(AMM.address, 2000);
        try{
            await AMM.connect(accounts[1]).Exchange(1500, 1, 2);
        } catch(err) {
            expect(await TOKENA.balanceOf(accounts[1].getAddress())).is.equal(2000); // no tokens are exchanged
        }
    });

    it("exchange 100 token B to token A", async function () {

        // add allowance from acc2 for token B to AMM contract
        await TOKENB.connect(accounts[2]).approve(AMM.address, 100);
        await AMM.connect(accounts[2]).Exchange(100, 2, 1);
        expect(await TOKENA.balanceOf(accounts[2].getAddress())).is.equal(1000); 
        expect(await TOKENB.balanceOf(accounts[2].getAddress())).is.equal(1900);
        
    });

    it("exchange 100 token B to token A with 0 allowance", async function () {

        // add allowance from acc2 for token B to AMM contract
        await TOKENB.connect(accounts[2]).approve(AMM.address, 0);
        try{
            await AMM.connect(accounts[2]).Exchange(100, 2, 1);
        }catch(err){
            expect(await TOKENA.balanceOf(accounts[2].getAddress())).is.equal(0); 
        }
    });
    
    it("exchange invalid pair of tokens", async function () {
        try{
            await AMM.connect(accounts[2]).Exchange(100, 3, 1);
        }catch(err){
            expect(await TOKENA.balanceOf(accounts[2].getAddress())).is.equal(0); 
        }
    });

    it("exchange invalid pair of tokens", async function () {
        try{
            await AMM.connect(accounts[1]).Exchange(100, 1, 3);
        }catch(err){
            expect(await TOKENA.balanceOf(accounts[1].getAddress())).is.equal(2000); 
        }
    });

    it("exchange of self token should fail", async function () {
        try{
            await AMM.connect(accounts[1]).Exchange(100, 1, 1);
        }catch(err){
            expect(await TOKENA.balanceOf(accounts[1].getAddress())).is.equal(2000); 
        }
    });
});

describe("AMM LIQUIDITY REMOVE function", function () {
    let accounts: Signer[];
    let TOKENA:any, TOKENB:any, AMM:any;

    // fetch all accounts before each test
    beforeEach(async function () {
        accounts = await ethers.getSigners();
        let tokenA = await ethers.getContractFactory("Token");
        TOKENA = await tokenA.deploy("tokenA", "TOKENA");

        let tokenB = await ethers.getContractFactory("Token");
        TOKENB = await tokenB.deploy("tokenB", "TOKENB");

        let amm = await ethers.getContractFactory("AMM");
        AMM = await amm.deploy(TOKENA.address, TOKENB.address);

        // add allowance to the token A and token B
        await TOKENA.approve(AMM.address, "1000");
        await TOKENB.approve(AMM.address, "100");

        // add liquidity of token A (1000) and token B (100) by owner
        await AMM.AddLiquidity(1000, 100);

        // fund account 1 with token A
        await TOKENA.transfer(accounts[1].getAddress(), 2000);
        
        // fund account 2 with token B
        await TOKENB.transfer(accounts[2].getAddress(), 2000);
    });

    it("remove liquidity by owner", async function () {
        await AMM.RemoveLiquidity();
        expect(await TOKENA.balanceOf(AMM.address)).is.equal(0); // all liquidity is removed
        expect(await TOKENB.balanceOf(AMM.address)).is.equal(0); // all liquidity is removed
    });

    it("remove liquidity by non-owner fails", async function () {
        try{
            await AMM.RemoveLiquidity();
        } catch(err){
            expect(1).is.equal(1);
        }
    });

    it("checks exchange rates are reset", async function () {
        await AMM.RemoveLiquidity();
        let A2B = await AMM.rateAToB();
        let B2A = await AMM.rateBToA();
        expect(A2B).is.equal(0);
        expect(B2A).is.equal(0);
    });

    it("exchange after removing liquidity fails", async function () {
        await AMM.RemoveLiquidity();
        await TOKENA.approve(AMM.address, 1000);
        try{
            await AMM.Exchange(1000, 1, 2);
        }
        catch(err){
            expect(1).is.equal(1);
        }
    });

});
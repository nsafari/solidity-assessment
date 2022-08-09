import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { IERC20__factory } from "../typechain-types";

describe("Assessment", function () {
  const MATIC = "0x0000000000000000000000000000000000001010";
  const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  const sushiswap = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

  async function deployAssessmentFixture() {

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Assessment = await ethers.getContractFactory("Assessment");
    const assessment = await Assessment.deploy(USDC, sushiswap);

    const USDCContract = new Contract(
      USDC,
      IERC20__factory.abi,
      otherAccount
    )
    const DAIContract = new Contract(
      DAI,
      IERC20__factory.abi,
      otherAccount
    )

    return { assessment, USDCContract, DAIContract, owner, otherAccount };
  }

  describe("Assessment", function () {
    it("Call Deposit should increase balance", async function () {
      const { assessment, USDCContract, owner, otherAccount } = await loadFixture(deployAssessmentFixture);

      // Swap MATIC to charge otherAccount USDC balance
      const amountIn = (ethers.utils).parseEther("500");
      let tx = await assessment.swap(
        otherAccount.address,
        amountIn,
        MATIC,
        USDC,
        [WMATIC, USDC],
        "1",
        (await ethers.provider.getBlock("latest")).timestamp + 1000,
        { value: amountIn, }
      )
      await tx.wait();
      const afterSwapBalance = await USDCContract.balanceOf(otherAccount.address);
      expect(afterSwapBalance).to.greaterThan("0")


      // Approve the contract to withdraw USDC from other account balaance
      tx = await USDCContract.approve(assessment.address, "70000000");
      await tx.wait();

      // Deposit USDC
      let assessmentOtherAccount = await assessment.connect(otherAccount);
      tx = await assessmentOtherAccount.deposit("60000000");
      await tx.wait();
      let deposit = await assessment.deposits(otherAccount.address)
      expect(deposit.toString()).to.equal("60000000");

      // Deposit USDC again
      tx = await assessmentOtherAccount.deposit("10000000");
      await tx.wait();
      deposit = await assessment.deposits(otherAccount.address)
      expect(deposit.toString()).to.equal("70000000");
    })

    it("Call Deposit with amount zero should be reverted", async function () {
      const { assessment, USDCContract, owner, otherAccount } = await loadFixture(deployAssessmentFixture);

      // Deposit USDC
      let assessmentOtherAccount = await assessment.connect(otherAccount);
      (await expect(assessmentOtherAccount.deposit("0"))).revertedWith("The given amount is not valid");
    });

    it("Call withdraw should decrease balance", async function () {
      const { assessment, USDCContract, owner, otherAccount } = await loadFixture(deployAssessmentFixture);

      // Swap MATIC to charge otherAccount USDC balance
      const amountIn = (ethers.utils).parseEther("500");
      let tx = await assessment.swap(
        otherAccount.address,
        amountIn,
        MATIC,
        USDC,
        [WMATIC, USDC],
        "1",
        (await ethers.provider.getBlock("latest")).timestamp + 1000,
        { value: amountIn, }
      )
      await tx.wait();
      const afterSwapBalance = await USDCContract.balanceOf(otherAccount.address);
      expect(afterSwapBalance).to.greaterThan("0")


      // Approve the contract to withdraw USDC from other account balaance
      tx = await USDCContract.approve(assessment.address, "60000000");
      await tx.wait();

      // Deposit USDC
      let assessmentOtherAccount = await assessment.connect(otherAccount);
      tx = await assessmentOtherAccount.deposit("60000000");
      await tx.wait();
      let deposit = await assessment.deposits(otherAccount.address)
      expect(deposit.toString()).to.equal("60000000");

      // withdraw USDC 
      tx = await assessmentOtherAccount.withdraw("10000000");
      await tx.wait();
      deposit = await assessment.deposits(otherAccount.address)
      expect(deposit.toString()).to.equal("50000000");

      // withdraw USDC again
      (await expect(assessmentOtherAccount.withdraw("60000000"))).revertedWith("The given amount is grater than the user's balance");
    })

    it("Call different types of swap should swap tokens", async function () {
      let { assessment, USDCContract, DAIContract, owner, otherAccount } = await loadFixture(deployAssessmentFixture);
      USDCContract = await USDCContract.connect(owner);
      DAIContract = await DAIContract.connect(owner);

      // Swap MATIC to charge otherAccount USDC balance
      let amountIn = (ethers.utils).parseEther("500");
      let tx = await assessment.swap(
        owner.address,
        amountIn,
        MATIC,
        USDC,
        [WMATIC, USDC],
        "1",
        (await ethers.provider.getBlock("latest")).timestamp + 1000,
        { value: amountIn, }
      )
      await tx.wait();
      let afterSwapBalance = await USDCContract.balanceOf(owner.address);
      expect(afterSwapBalance).to.greaterThan("0")


      // Swap USDC to DAI
      amountIn = BigNumber.from("100000000");
      tx = await USDCContract.approve(assessment.address, amountIn);
      await tx.wait();
      tx = await assessment.swap(
        owner.address,
        amountIn,
        USDC,
        DAI,
        [USDC, DAI],
        "1",
        (await ethers.provider.getBlock("latest")).timestamp + 1000,
        { value: amountIn, }
      )
      await tx.wait();
      afterSwapBalance = await DAIContract.balanceOf(owner.address);
      expect(afterSwapBalance).to.greaterThan("0")


      // Swap DAI to MATIC
      amountIn = BigNumber.from("80000000");
      tx = await DAIContract.approve(assessment.address, amountIn);
      await tx.wait();
      tx = await assessment.swap(
        owner.address,
        amountIn,
        DAI,
        MATIC,
        [DAI, WMATIC],
        "1",
        (await ethers.provider.getBlock("latest")).timestamp + 1000,
        { value: amountIn, }
      )
      await tx.wait();
      afterSwapBalance = await owner.getBalance();
      expect(afterSwapBalance).to.greaterThan(ethers.utils.parseEther("500"))
    })
  });
});

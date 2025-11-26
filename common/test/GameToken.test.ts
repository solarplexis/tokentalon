import { expect } from "chai";
import { ethers } from "hardhat";
import { GameToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GameToken", function () {
  let gameToken: GameToken;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  const INITIAL_SUPPLY = 1000000; // 1 million tokens
  const TOKEN_PRICE = ethers.parseEther("0.001"); // 0.001 ETH per token
  const MAX_SUPPLY = ethers.parseEther("10000000"); // 10 million tokens

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    const GameTokenFactory = await ethers.getContractFactory("GameToken");
    gameToken = await GameTokenFactory.deploy(INITIAL_SUPPLY, TOKEN_PRICE);
    await gameToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await gameToken.owner()).to.equal(owner.address);
    });

    it("Should assign the initial supply to the owner", async function () {
      const ownerBalance = await gameToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther(INITIAL_SUPPLY.toString()));
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await gameToken.name()).to.equal("TokenTalon Game Token");
      expect(await gameToken.symbol()).to.equal("TALON");
    });

    it("Should set the correct token price", async function () {
      expect(await gameToken.tokenPrice()).to.equal(TOKEN_PRICE);
    });

    it("Should have 18 decimals", async function () {
      expect(await gameToken.decimals()).to.equal(18);
    });
  });

  describe("Token Purchase", function () {
    it("Should allow users to buy tokens with ETH", async function () {
      const ethAmount = ethers.parseEther("1"); // 1 ETH
      const expectedTokens = ethers.parseEther("1000"); // 1000 tokens at 0.001 ETH each

      await expect(
        gameToken.connect(player1).buyTokens({ value: ethAmount })
      ).to.changeTokenBalance(gameToken, player1, expectedTokens);
    });

    it("Should emit TokensPurchased event", async function () {
      const ethAmount = ethers.parseEther("1");
      const expectedTokens = ethers.parseEther("1000");

      await expect(gameToken.connect(player1).buyTokens({ value: ethAmount }))
        .to.emit(gameToken, "TokensPurchased")
        .withArgs(player1.address, expectedTokens, ethAmount);
    });

    it("Should revert if no ETH is sent", async function () {
      await expect(
        gameToken.connect(player1).buyTokens({ value: 0 })
      ).to.be.revertedWith("Must send ETH to buy tokens");
    });

    it("Should calculate correct token amount", async function () {
      const ethAmount = ethers.parseEther("0.5");
      const expectedTokens = await gameToken.getTokenAmount(ethAmount);
      
      await gameToken.connect(player1).buyTokens({ value: ethAmount });
      expect(await gameToken.balanceOf(player1.address)).to.equal(expectedTokens);
    });

    it("Should not exceed max supply when buying", async function () {
      // Calculate how much would exceed max supply
      // Max supply is 10M, initial supply is 1M, so 9M available
      // At 0.001 ETH per token, that's 9000 ETH worth
      const availableSupply = MAX_SUPPLY - ethers.parseEther(INITIAL_SUPPLY.toString());
      const ethForAvailable = (availableSupply * TOKEN_PRICE) / ethers.parseEther("1");
      const excessEth = ethForAvailable + ethers.parseEther("1"); // 1 ETH more than available
      
      await expect(
        gameToken.connect(player1).buyTokens({ value: excessEth })
      ).to.be.revertedWith("Would exceed max supply");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        gameToken.mint(player1.address, mintAmount)
      ).to.changeTokenBalance(gameToken, player1, mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        gameToken.connect(player1).mint(player2.address, mintAmount)
      ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
    });

    it("Should not exceed max supply when minting", async function () {
      const excessAmount = MAX_SUPPLY; // Already minted initial supply
      
      await expect(
        gameToken.mint(player1.address, excessAmount)
      ).to.be.revertedWith("Would exceed max supply");
    });
  });

  describe("Token Price", function () {
    it("Should allow owner to update token price", async function () {
      const newPrice = ethers.parseEther("0.002");
      
      await expect(gameToken.setTokenPrice(newPrice))
        .to.emit(gameToken, "TokenPriceUpdated")
        .withArgs(TOKEN_PRICE, newPrice);
      
      expect(await gameToken.tokenPrice()).to.equal(newPrice);
    });

    it("Should not allow non-owner to update token price", async function () {
      const newPrice = ethers.parseEther("0.002");
      
      await expect(
        gameToken.connect(player1).setTokenPrice(newPrice)
      ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
    });

    it("Should not allow setting price to zero", async function () {
      await expect(
        gameToken.setTokenPrice(0)
      ).to.be.revertedWith("Price must be greater than 0");
    });

    it("Should calculate correct token amount with new price", async function () {
      const newPrice = ethers.parseEther("0.002");
      await gameToken.setTokenPrice(newPrice);
      
      const ethAmount = ethers.parseEther("1");
      const expectedTokens = ethers.parseEther("500"); // 500 tokens at 0.002 ETH each
      
      await gameToken.connect(player1).buyTokens({ value: ethAmount });
      expect(await gameToken.balanceOf(player1.address)).to.equal(expectedTokens);
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      // Player1 buys some tokens to add ETH to contract
      await gameToken.connect(player1).buyTokens({ 
        value: ethers.parseEther("5") 
      });
    });

    it("Should allow owner to withdraw ETH", async function () {
      const contractBalance = await ethers.provider.getBalance(
        await gameToken.getAddress()
      );
      
      await expect(gameToken.withdraw())
        .to.changeEtherBalance(owner, contractBalance);
    });

    it("Should not allow non-owner to withdraw", async function () {
      await expect(
        gameToken.connect(player1).withdraw()
      ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
    });

    it("Should revert if no ETH to withdraw", async function () {
      await gameToken.withdraw(); // Withdraw once
      
      await expect(
        gameToken.withdraw()
      ).to.be.revertedWith("No ETH to withdraw");
    });
  });

  describe("Token Transfers", function () {
    beforeEach(async function () {
      // Transfer some tokens to player1
      await gameToken.transfer(player1.address, ethers.parseEther("1000"));
    });

    it("Should allow token transfers", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        gameToken.connect(player1).transfer(player2.address, amount)
      ).to.changeTokenBalances(
        gameToken,
        [player1, player2],
        [-amount, amount]
      );
    });

    it("Should allow token approvals and transferFrom", async function () {
      const amount = ethers.parseEther("100");
      
      await gameToken.connect(player1).approve(player2.address, amount);
      
      await expect(
        gameToken.connect(player2).transferFrom(player1.address, player2.address, amount)
      ).to.changeTokenBalances(
        gameToken,
        [player1, player2],
        [-amount, amount]
      );
    });
  });

  describe("Helper Functions", function () {
    it("Should return correct token amount for ETH", async function () {
      const ethAmount = ethers.parseEther("2");
      const expectedTokens = ethers.parseEther("2000");
      
      expect(await gameToken.getTokenAmount(ethAmount)).to.equal(expectedTokens);
    });

    it("Should return 0 if token price is 0", async function () {
      // Deploy with 0 price
      const GameTokenFactory = await ethers.getContractFactory("GameToken");
      const zeroPrice = await GameTokenFactory.deploy(INITIAL_SUPPLY, 0);
      
      expect(await zeroPrice.getTokenAmount(ethers.parseEther("1"))).to.equal(0);
    });
  });
});

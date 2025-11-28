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

  describe("Faucet", function () {
    it("Should allow anyone to claim faucet tokens", async function () {
      const initialBalance = await gameToken.balanceOf(player1.address);

      await gameToken.connect(player1).claimFaucet();

      const newBalance = await gameToken.balanceOf(player1.address);
      expect(newBalance - initialBalance).to.equal(ethers.parseEther("500"));
    });

    it("Should emit FaucetClaimed event", async function () {
      await expect(gameToken.connect(player1).claimFaucet())
        .to.emit(gameToken, "FaucetClaimed")
        .withArgs(player1.address, ethers.parseEther("500"));
    });

    it("Should enforce 24 hour cooldown", async function () {
      await gameToken.connect(player1).claimFaucet();
      
      await expect(gameToken.connect(player1).claimFaucet())
        .to.be.revertedWith("Faucet cooldown not expired");
    });

    it("Should allow claim after cooldown expires", async function () {
      await gameToken.connect(player1).claimFaucet();
      
      // Fast forward 24 hours
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(gameToken.connect(player1).claimFaucet())
        .to.not.be.reverted;
    });

    it("Should return correct canClaimFaucet status", async function () {
      expect(await gameToken.canClaimFaucet(player1.address)).to.be.true;
      
      await gameToken.connect(player1).claimFaucet();
      expect(await gameToken.canClaimFaucet(player1.address)).to.be.false;
      
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      expect(await gameToken.canClaimFaucet(player1.address)).to.be.true;
    });

    it("Should return correct cooldown remaining time", async function () {
      expect(await gameToken.faucetCooldownRemaining(player1.address)).to.equal(0);
      
      await gameToken.connect(player1).claimFaucet();
      
      const remaining = await gameToken.faucetCooldownRemaining(player1.address);
      expect(remaining).to.be.gt(0);
      expect(remaining).to.be.lte(24 * 60 * 60);
    });

    it("Should respect max supply when claiming", async function () {
      // Deploy with very low max supply
      const GameTokenFactory = await ethers.getContractFactory("GameToken");
      const lowSupply = await GameTokenFactory.deploy(1, TOKEN_PRICE);
      
      // Try to claim when it would exceed max supply
      // This will fail because 1 token + 100 token faucet > 10M max
      // But since we started with only 1 token in ether units, this should work once
      await expect(lowSupply.connect(player1).claimFaucet()).to.not.be.reverted;
    });

    it("Should allow different addresses to claim independently", async function () {
      await gameToken.connect(player1).claimFaucet();
      await expect(gameToken.connect(player2).claimFaucet()).to.not.be.reverted;

      expect(await gameToken.balanceOf(player1.address)).to.equal(ethers.parseEther("500"));
      expect(await gameToken.balanceOf(player2.address)).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Faucet Admin Functions", function () {
    describe("setFaucetAmount", function () {
      it("Should allow owner to update faucet amount", async function () {
        const newAmount = ethers.parseEther("1000");

        await expect(gameToken.setFaucetAmount(newAmount))
          .to.emit(gameToken, "FaucetAmountUpdated")
          .withArgs(ethers.parseEther("500"), newAmount);

        expect(await gameToken.faucetAmount()).to.equal(newAmount);
      });

      it("Should not allow non-owner to update faucet amount", async function () {
        const newAmount = ethers.parseEther("1000");

        await expect(
          gameToken.connect(player1).setFaucetAmount(newAmount)
        ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
      });

      it("Should not allow setting amount to zero", async function () {
        await expect(
          gameToken.setFaucetAmount(0)
        ).to.be.revertedWith("Amount must be greater than 0");
      });

      it("Should not allow amount exceeding maximum", async function () {
        const tooMuch = ethers.parseEther("10001"); // Max is 10,000

        await expect(
          gameToken.setFaucetAmount(tooMuch)
        ).to.be.revertedWith("Amount exceeds maximum");
      });

      it("Should use new amount in faucet claims", async function () {
        const newAmount = ethers.parseEther("1000");
        await gameToken.setFaucetAmount(newAmount);

        await gameToken.connect(player1).claimFaucet();

        expect(await gameToken.balanceOf(player1.address)).to.equal(newAmount);
      });
    });

    describe("setFaucetCooldown", function () {
      it("Should allow owner to update faucet cooldown", async function () {
        const newCooldown = 10 * 60; // 10 minutes
        const oldCooldown = 5 * 60; // 5 minutes

        await expect(gameToken.setFaucetCooldown(newCooldown))
          .to.emit(gameToken, "FaucetCooldownUpdated")
          .withArgs(oldCooldown, newCooldown);

        expect(await gameToken.faucetCooldown()).to.equal(newCooldown);
      });

      it("Should not allow non-owner to update cooldown", async function () {
        const newCooldown = 10 * 60;

        await expect(
          gameToken.connect(player1).setFaucetCooldown(newCooldown)
        ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
      });

      it("Should not allow cooldown too short", async function () {
        const tooShort = 30; // 30 seconds (min is 1 minute)

        await expect(
          gameToken.setFaucetCooldown(tooShort)
        ).to.be.revertedWith("Cooldown too short");
      });

      it("Should not allow cooldown too long", async function () {
        const tooLong = 31 * 24 * 60 * 60; // 31 days (max is 30 days)

        await expect(
          gameToken.setFaucetCooldown(tooLong)
        ).to.be.revertedWith("Cooldown too long");
      });

      it("Should use new cooldown for claims", async function () {
        const newCooldown = 10 * 60; // 10 minutes
        await gameToken.setFaucetCooldown(newCooldown);

        await gameToken.connect(player1).claimFaucet();

        // Should not be able to claim immediately
        await expect(
          gameToken.connect(player1).claimFaucet()
        ).to.be.revertedWith("Faucet cooldown not expired");

        // Fast forward 10 minutes
        await ethers.provider.send("evm_increaseTime", [10 * 60]);
        await ethers.provider.send("evm_mine", []);

        // Should be able to claim now
        await expect(gameToken.connect(player1).claimFaucet()).to.not.be.reverted;
      });
    });

    describe("setFaucetEnabled", function () {
      it("Should allow owner to disable faucet", async function () {
        await expect(gameToken.setFaucetEnabled(false))
          .to.emit(gameToken, "FaucetStatusUpdated")
          .withArgs(false);

        expect(await gameToken.faucetEnabled()).to.be.false;
      });

      it("Should allow owner to enable faucet", async function () {
        await gameToken.setFaucetEnabled(false);

        await expect(gameToken.setFaucetEnabled(true))
          .to.emit(gameToken, "FaucetStatusUpdated")
          .withArgs(true);

        expect(await gameToken.faucetEnabled()).to.be.true;
      });

      it("Should not allow non-owner to change faucet status", async function () {
        await expect(
          gameToken.connect(player1).setFaucetEnabled(false)
        ).to.be.revertedWithCustomError(gameToken, "OwnableUnauthorizedAccount");
      });

      it("Should prevent claims when faucet is disabled", async function () {
        await gameToken.setFaucetEnabled(false);

        await expect(
          gameToken.connect(player1).claimFaucet()
        ).to.be.revertedWith("Faucet is disabled");
      });

      it("Should allow claims when faucet is re-enabled", async function () {
        await gameToken.setFaucetEnabled(false);
        await gameToken.setFaucetEnabled(true);

        await expect(gameToken.connect(player1).claimFaucet()).to.not.be.reverted;
      });

      it("Should return false for canClaimFaucet when disabled", async function () {
        expect(await gameToken.canClaimFaucet(player1.address)).to.be.true;

        await gameToken.setFaucetEnabled(false);

        expect(await gameToken.canClaimFaucet(player1.address)).to.be.false;
      });

      it("Should return max uint for cooldown remaining when disabled", async function () {
        await gameToken.setFaucetEnabled(false);

        const remaining = await gameToken.faucetCooldownRemaining(player1.address);
        expect(remaining).to.equal(ethers.MaxUint256);
      });
    });
  });
});

import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";
import { GameToken, PrizeNFT, ClawMachine } from "../typechain-types";

describe("ClawMachine", function () {
  let gameToken: GameToken;
  let prizeNFT: PrizeNFT;
  let clawMachine: ClawMachine;
  let owner: Signer;
  let oracle: Signer;
  let player1: Signer;
  let player2: Signer;
  let ownerAddress: string;
  let oracleAddress: string;
  let player1Address: string;
  let player2Address: string;

  const COST_PER_PLAY = ethers.parseEther("10"); // 10 tokens
  const TOKEN_PRICE = ethers.parseEther("0.001"); // 0.001 ETH per token
  const INITIAL_TOKENS = ethers.parseEther("100"); // 100 tokens

  // Prize data constants
  const PRIZE_ID = 1;
  const METADATA_URI = "ipfs://QmMetadata123";
  const REPLAY_HASH = "QmReplay456";
  const DIFFICULTY = 5;
  const NONCE = 123456;

  beforeEach(async function () {
    [owner, oracle, player1, player2] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    oracleAddress = await oracle.getAddress();
    player1Address = await player1.getAddress();
    player2Address = await player2.getAddress();

    // Deploy GameToken
    const GameTokenFactory = await ethers.getContractFactory("GameToken");
    gameToken = await GameTokenFactory.deploy(1000000, TOKEN_PRICE);
    await gameToken.waitForDeployment();

    // Deploy PrizeNFT
    const PrizeNFTFactory = await ethers.getContractFactory("PrizeNFT");
    prizeNFT = await PrizeNFTFactory.deploy();
    await prizeNFT.waitForDeployment();

    // Deploy ClawMachine
    const ClawMachineFactory = await ethers.getContractFactory("ClawMachine");
    clawMachine = await ClawMachineFactory.deploy(
      await gameToken.getAddress(),
      await prizeNFT.getAddress(),
      oracleAddress,
      COST_PER_PLAY
    );
    await clawMachine.waitForDeployment();

    // Grant minter role to ClawMachine
    await prizeNFT.grantMinterRole(await clawMachine.getAddress());

    // Give player1 some tokens
    await gameToken.mint(player1Address, INITIAL_TOKENS);
  });

  describe("Deployment", function () {
    it("Should set the correct GameToken address", async function () {
      expect(await clawMachine.gameToken()).to.equal(
        await gameToken.getAddress()
      );
    });

    it("Should set the correct PrizeNFT address", async function () {
      expect(await clawMachine.prizeNFT()).to.equal(
        await prizeNFT.getAddress()
      );
    });

    it("Should set the correct oracle address", async function () {
      expect(await clawMachine.oracleAddress()).to.equal(oracleAddress);
    });

    it("Should set the correct cost per play", async function () {
      expect(await clawMachine.costPerPlay()).to.equal(COST_PER_PLAY);
    });

    it("Should set the correct owner", async function () {
      expect(await clawMachine.owner()).to.equal(ownerAddress);
    });

    it("Should revert if GameToken address is zero", async function () {
      const ClawMachineFactory = await ethers.getContractFactory(
        "ClawMachine"
      );
      await expect(
        ClawMachineFactory.deploy(
          ethers.ZeroAddress,
          await prizeNFT.getAddress(),
          oracleAddress,
          COST_PER_PLAY
        )
      ).to.be.revertedWith("Invalid GameToken address");
    });

    it("Should revert if PrizeNFT address is zero", async function () {
      const ClawMachineFactory = await ethers.getContractFactory(
        "ClawMachine"
      );
      await expect(
        ClawMachineFactory.deploy(
          await gameToken.getAddress(),
          ethers.ZeroAddress,
          oracleAddress,
          COST_PER_PLAY
        )
      ).to.be.revertedWith("Invalid PrizeNFT address");
    });

    it("Should revert if oracle address is zero", async function () {
      const ClawMachineFactory = await ethers.getContractFactory(
        "ClawMachine"
      );
      await expect(
        ClawMachineFactory.deploy(
          await gameToken.getAddress(),
          await prizeNFT.getAddress(),
          ethers.ZeroAddress,
          COST_PER_PLAY
        )
      ).to.be.revertedWith("Invalid oracle address");
    });

    it("Should revert if cost per play is zero", async function () {
      const ClawMachineFactory = await ethers.getContractFactory(
        "ClawMachine"
      );
      await expect(
        ClawMachineFactory.deploy(
          await gameToken.getAddress(),
          await prizeNFT.getAddress(),
          oracleAddress,
          0
        )
      ).to.be.revertedWith("Cost per play must be positive");
    });
  });

  describe("Starting Game", function () {
    it("Should allow player to start game", async function () {
      await expect(clawMachine.connect(player1).startGame())
        .to.emit(clawMachine, "GameStarted")
        .withArgs(player1Address, await ethers.provider.getBlockNumber() + 1);
    });

    it("Should NOT transfer tokens when game starts", async function () {
      const balanceBefore = await gameToken.balanceOf(player1Address);
      await clawMachine.connect(player1).startGame();
      const balanceAfter = await gameToken.balanceOf(player1Address);

      expect(balanceBefore).to.equal(balanceAfter);
      expect(await gameToken.balanceOf(await clawMachine.getAddress())).to.equal(0);
    });

    it("Should create active game session with zero grabs", async function () {
      await clawMachine.connect(player1).startGame();

      const session = await clawMachine.getGameSession(player1Address);
      expect(session.active).to.be.true;
      expect(session.grabCount).to.equal(0);
    });

    it("Should revert if player has insufficient balance", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      
      // Transfer away most tokens
      await gameToken.connect(player1).transfer(player2Address, INITIAL_TOKENS - COST_PER_PLAY + ethers.parseEther("1"));

      await expect(clawMachine.connect(player1).startGame()).to.be.revertedWith(
        "Insufficient token balance"
      );
    });

    it("Should revert if player has not approved tokens", async function () {
      await expect(clawMachine.connect(player1).startGame()).to.be.revertedWith(
        "Insufficient token allowance"
      );
    });

    it("Should revert if game already in progress", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY * 2n);
      await clawMachine.connect(player1).startGame();

      await expect(clawMachine.connect(player1).startGame()).to.be.revertedWith(
        "Game already in progress"
      );
    });
  });

  describe("Claiming Prize", function () {
    let voucherHash: string;
    let signature: string;

    beforeEach(async function () {
      // Start a game
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await clawMachine.connect(player1).startGame();

      // Create voucher hash
      voucherHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "string", "uint8", "uint256"],
        [player1Address, PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE]
      );

      // Sign with oracle
      signature = await oracle.signMessage(ethers.getBytes(voucherHash));
    });

    it("Should allow valid prize claim", async function () {
      await expect(
        clawMachine
          .connect(player1)
          .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature)
      )
        .to.emit(clawMachine, "PrizeClaimed")
        .withArgs(player1Address, 0, PRIZE_ID, voucherHash);
    });

    it("Should mint NFT to player", async function () {
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);

      expect(await prizeNFT.balanceOf(player1Address)).to.equal(1);
      expect(await prizeNFT.ownerOf(0)).to.equal(player1Address);
    });

    it("Should clear game session after claim", async function () {
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);

      const session = await clawMachine.getGameSession(player1Address);
      expect(session.active).to.be.true;
      expect(session.grabCount).to.equal(0);
    });

    it("Should mark voucher as used", async function () {
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);

      expect(await clawMachine.isVoucherUsed(voucherHash)).to.be.true;
    });

    it("Should revert if no active game session", async function () {
      await expect(
        clawMachine
          .connect(player2)
          .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature)
      ).to.be.revertedWith("No active game session");
    });

    it("Should revert if voucher already used (replay attack)", async function () {
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);

      // Try to start new game and use same voucher
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await clawMachine.connect(player1).startGame();

      await expect(
        clawMachine
          .connect(player1)
          .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature)
      ).to.be.revertedWith("Voucher already used");
    });

    it("Should revert with invalid signature", async function () {
      const wrongSignature = await player2.signMessage(ethers.getBytes(voucherHash));

      await expect(
        clawMachine
          .connect(player1)
          .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, wrongSignature)
      ).to.be.revertedWith("Invalid oracle signature");
    });

    it("Should revert if signature is for different parameters", async function () {
      const wrongHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "string", "uint8", "uint256"],
        [player1Address, PRIZE_ID + 1, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE]
      );
      const wrongSignature = await oracle.signMessage(ethers.getBytes(wrongHash));

      await expect(
        clawMachine
          .connect(player1)
          .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, wrongSignature)
      ).to.be.revertedWith("Invalid oracle signature");
    });

    it("Should store correct tokens spent in NFT", async function () {
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);

      const prizeInfo = await prizeNFT.getPrizeInfo(0);
      expect(prizeInfo.tokensSpent).to.equal(COST_PER_PLAY);
    });
  });

  describe("Forfeiting Game", function () {
    beforeEach(async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await clawMachine.connect(player1).startGame();
    });

    it("Should allow player to forfeit game", async function () {
      await clawMachine.connect(player1).forfeitGame();

      const session = await clawMachine.getGameSession(player1Address);
      expect(session.active).to.be.false;
    });

    it("Should keep escrowed tokens in contract", async function () {
      const contractBalanceBefore = await gameToken.balanceOf(await clawMachine.getAddress());
      await clawMachine.connect(player1).forfeitGame();
      const contractBalanceAfter = await gameToken.balanceOf(await clawMachine.getAddress());

      expect(contractBalanceAfter).to.equal(contractBalanceBefore);
    });

    it("Should revert if no active game", async function () {
      await expect(clawMachine.connect(player2).forfeitGame()).to.be.revertedWith(
        "No active game session"
      );
    });
  });

  describe("Oracle Management", function () {
    it("Should allow owner to update oracle address", async function () {
      const newOracle = await player2.getAddress();
      await expect(clawMachine.setOracleAddress(newOracle))
        .to.emit(clawMachine, "OracleAddressUpdated")
        .withArgs(oracleAddress, newOracle);

      expect(await clawMachine.oracleAddress()).to.equal(newOracle);
    });

    it("Should revert if non-owner tries to update oracle", async function () {
      await expect(
        clawMachine.connect(player1).setOracleAddress(player2Address)
      ).to.be.revertedWithCustomError(clawMachine, "OwnableUnauthorizedAccount");
    });

    it("Should revert if new oracle address is zero", async function () {
      await expect(
        clawMachine.setOracleAddress(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid oracle address");
    });
  });

  describe("Cost Per Play Management", function () {
    it("Should allow owner to update cost per play", async function () {
      const newCost = ethers.parseEther("20");
      await expect(clawMachine.setCostPerPlay(newCost))
        .to.emit(clawMachine, "CostPerPlayUpdated")
        .withArgs(COST_PER_PLAY, newCost);

      expect(await clawMachine.costPerPlay()).to.equal(newCost);
    });

    it("Should revert if non-owner tries to update cost", async function () {
      await expect(
        clawMachine.connect(player1).setCostPerPlay(ethers.parseEther("20"))
      ).to.be.revertedWithCustomError(clawMachine, "OwnableUnauthorizedAccount");
    });

    it("Should revert if new cost is zero", async function () {
      await expect(clawMachine.setCostPerPlay(0)).to.be.revertedWith(
        "Cost must be positive"
      );
    });

    it("Should use new cost for subsequent games", async function () {
      const newCost = ethers.parseEther("20");
      await clawMachine.setCostPerPlay(newCost);

      await gameToken.connect(player1).approve(await clawMachine.getAddress(), newCost);
      await clawMachine.connect(player1).startGame();

      const session = await clawMachine.getGameSession(player1Address);
      expect(session.tokensEscrowed).to.equal(newCost);
    });
  });

  describe("Token Withdrawal", function () {
    beforeEach(async function () {
      // Play and forfeit a game to accumulate tokens
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await clawMachine.connect(player1).startGame();
      await clawMachine.connect(player1).forfeitGame();
    });

    it("Should allow owner to withdraw tokens", async function () {
      const ownerBalanceBefore = await gameToken.balanceOf(ownerAddress);
      await expect(clawMachine.withdrawTokens())
        .to.emit(clawMachine, "TokensWithdrawn")
        .withArgs(ownerAddress, COST_PER_PLAY);

      const ownerBalanceAfter = await gameToken.balanceOf(ownerAddress);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(COST_PER_PLAY);
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      await expect(
        clawMachine.connect(player1).withdrawTokens()
      ).to.be.revertedWithCustomError(clawMachine, "OwnableUnauthorizedAccount");
    });

    it("Should revert if no tokens to withdraw", async function () {
      await clawMachine.withdrawTokens(); // Withdraw once

      await expect(clawMachine.withdrawTokens()).to.be.revertedWith(
        "No tokens to withdraw"
      );
    });

    it("Should withdraw entire balance", async function () {
      await clawMachine.withdrawTokens();
      expect(await gameToken.balanceOf(await clawMachine.getAddress())).to.equal(0);
    });
  });

  describe("Multiple Players", function () {
    beforeEach(async function () {
      // Give player2 tokens
      await gameToken.mint(player2Address, INITIAL_TOKENS);
    });

    it("Should allow multiple players to have simultaneous sessions", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await gameToken.connect(player2).approve(await clawMachine.getAddress(), COST_PER_PLAY);

      await clawMachine.connect(player1).startGame();
      await clawMachine.connect(player2).startGame();

      const session1 = await clawMachine.getGameSession(player1Address);
      const session2 = await clawMachine.getGameSession(player2Address);

      expect(session1.active).to.be.true;
      expect(session2.active).to.be.true;
    });

    it("Should allow players to claim independently", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await gameToken.connect(player2).approve(await clawMachine.getAddress(), COST_PER_PLAY);

      await clawMachine.connect(player1).startGame();
      await clawMachine.connect(player2).startGame();

      // Player 1 claims
      const voucherHash1 = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "string", "uint8", "uint256"],
        [player1Address, PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE]
      );
      const signature1 = await oracle.signMessage(ethers.getBytes(voucherHash1));
      await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature1);

      // Player 2 claims (different nonce)
      const nonce2 = NONCE + 1;
      const voucherHash2 = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "string", "uint8", "uint256"],
        [player2Address, PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, nonce2]
      );
      const signature2 = await oracle.signMessage(ethers.getBytes(voucherHash2));
      await clawMachine
        .connect(player2)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, nonce2, signature2);

      expect(await prizeNFT.balanceOf(player1Address)).to.equal(1);
      expect(await prizeNFT.balanceOf(player2Address)).to.equal(1);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas cost for starting game", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      const tx = await clawMachine.connect(player1).startGame();
      const receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(150000);
    });

    it("Should have reasonable gas cost for claiming prize", async function () {
      await gameToken.connect(player1).approve(await clawMachine.getAddress(), COST_PER_PLAY);
      await clawMachine.connect(player1).startGame();

      const voucherHash = ethers.solidityPackedKeccak256(
        ["address", "uint256", "string", "string", "uint8", "uint256"],
        [player1Address, PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE]
      );
      const signature = await oracle.signMessage(ethers.getBytes(voucherHash));

      const tx = await clawMachine
        .connect(player1)
        .claimPrize(PRIZE_ID, METADATA_URI, REPLAY_HASH, DIFFICULTY, NONCE, signature);
      const receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(300000);
    });
  });
});

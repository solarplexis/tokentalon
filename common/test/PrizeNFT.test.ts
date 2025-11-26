import { expect } from "chai";
import { ethers } from "hardhat";
import { PrizeNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("PrizeNFT", function () {
  let prizeNFT: PrizeNFT;
  let owner: SignerWithAddress;
  let clawMachine: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;

  const METADATA_URI = "ipfs://QmTest123/metadata.json";
  const REPLAY_HASH = "QmReplay456";
  const PRIZE_ID = 1;
  const DIFFICULTY = 7;
  const TOKENS_SPENT = ethers.parseEther("15");

  beforeEach(async function () {
    [owner, clawMachine, player1, player2] = await ethers.getSigners();

    const PrizeNFTFactory = await ethers.getContractFactory("PrizeNFT");
    prizeNFT = await PrizeNFTFactory.deploy();
    await prizeNFT.waitForDeployment();

    // Grant minter role to clawMachine address (simulating the game contract)
    const MINTER_ROLE = await prizeNFT.MINTER_ROLE();
    await prizeNFT.grantRole(MINTER_ROLE, clawMachine.address);
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await prizeNFT.name()).to.equal("TokenTalon Prize");
      expect(await prizeNFT.symbol()).to.equal("PRIZE");
    });

    it("Should grant admin role to deployer", async function () {
      const adminRole = await prizeNFT.DEFAULT_ADMIN_ROLE();
      expect(await prizeNFT.hasRole(adminRole, owner.address)).to.be.true;
    });

    it("Should grant minter role to deployer", async function () {
      const minterRole = await prizeNFT.MINTER_ROLE();
      expect(await prizeNFT.hasRole(minterRole, owner.address)).to.be.true;
    });

    it("Should start with zero total supply", async function () {
      expect(await prizeNFT.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint prize NFT", async function () {
      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          player1.address,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          DIFFICULTY,
          TOKENS_SPENT
        )
      ).to.not.be.reverted;

      expect(await prizeNFT.balanceOf(player1.address)).to.equal(1);
      expect(await prizeNFT.ownerOf(0)).to.equal(player1.address);
    });

    it("Should emit PrizeMinted event", async function () {
      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          player1.address,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          DIFFICULTY,
          TOKENS_SPENT
        )
      )
        .to.emit(prizeNFT, "PrizeMinted")
        .withArgs(0, player1.address, PRIZE_ID, METADATA_URI, DIFFICULTY);
    });

    it("Should increment token IDs correctly", async function () {
      await prizeNFT.connect(clawMachine).mintPrize(
        player1.address,
        PRIZE_ID,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY,
        TOKENS_SPENT
      );

      await prizeNFT.connect(clawMachine).mintPrize(
        player2.address,
        PRIZE_ID + 1,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY,
        TOKENS_SPENT
      );

      expect(await prizeNFT.totalSupply()).to.equal(2);
      expect(await prizeNFT.ownerOf(0)).to.equal(player1.address);
      expect(await prizeNFT.ownerOf(1)).to.equal(player2.address);
    });

    it("Should not allow non-minter to mint", async function () {
      await expect(
        prizeNFT.connect(player1).mintPrize(
          player1.address,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          DIFFICULTY,
          TOKENS_SPENT
        )
      ).to.be.reverted;
    });

    it("Should not mint to zero address", async function () {
      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          ethers.ZeroAddress,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          DIFFICULTY,
          TOKENS_SPENT
        )
      ).to.be.revertedWith("Winner cannot be zero address");
    });

    it("Should require metadata URI", async function () {
      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          player1.address,
          PRIZE_ID,
          "",
          REPLAY_HASH,
          DIFFICULTY,
          TOKENS_SPENT
        )
      ).to.be.revertedWith("Metadata URI required");
    });

    it("Should validate difficulty range", async function () {
      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          player1.address,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          0,
          TOKENS_SPENT
        )
      ).to.be.revertedWith("Difficulty must be 1-10");

      await expect(
        prizeNFT.connect(clawMachine).mintPrize(
          player1.address,
          PRIZE_ID,
          METADATA_URI,
          REPLAY_HASH,
          11,
          TOKENS_SPENT
        )
      ).to.be.revertedWith("Difficulty must be 1-10");
    });
  });

  describe("Prize Metadata", function () {
    beforeEach(async function () {
      await prizeNFT.connect(clawMachine).mintPrize(
        player1.address,
        PRIZE_ID,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY,
        TOKENS_SPENT
      );
    });

    it("Should store and retrieve prize ID", async function () {
      expect(await prizeNFT.tokenToPrizeId(0)).to.equal(PRIZE_ID);
    });

    it("Should store and retrieve replay data", async function () {
      expect(await prizeNFT.tokenToReplayData(0)).to.equal(REPLAY_HASH);
    });

    it("Should store and retrieve difficulty", async function () {
      expect(await prizeNFT.tokenToDifficulty(0)).to.equal(DIFFICULTY);
    });

    it("Should store and retrieve tokens spent", async function () {
      expect(await prizeNFT.tokenToTokensSpent(0)).to.equal(TOKENS_SPENT);
    });

    it("Should store timestamp at mint time", async function () {
      const timestamp = await prizeNFT.tokenToTimestamp(0);
      expect(timestamp).to.be.gt(0);
    });

    it("Should return correct token URI", async function () {
      expect(await prizeNFT.tokenURI(0)).to.equal(METADATA_URI);
    });

    it("Should return complete prize info", async function () {
      const info = await prizeNFT.getPrizeInfo(0);
      
      expect(info.prizeId).to.equal(PRIZE_ID);
      expect(info.metadataURI).to.equal(METADATA_URI);
      expect(info.replayDataHash).to.equal(REPLAY_HASH);
      expect(info.difficulty).to.equal(DIFFICULTY);
      expect(info.timestamp).to.be.gt(0);
      expect(info.tokensSpent).to.equal(TOKENS_SPENT);
    });

    it("Should revert getPrizeInfo for non-existent token", async function () {
      await expect(
        prizeNFT.getPrizeInfo(999)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Token Enumeration", function () {
    beforeEach(async function () {
      // Mint 3 tokens to player1
      await prizeNFT.connect(clawMachine).mintPrize(
        player1.address,
        PRIZE_ID,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY,
        TOKENS_SPENT
      );

      await prizeNFT.connect(clawMachine).mintPrize(
        player1.address,
        PRIZE_ID + 1,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY + 1,
        TOKENS_SPENT
      );

      // Mint 1 token to player2
      await prizeNFT.connect(clawMachine).mintPrize(
        player2.address,
        PRIZE_ID + 2,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY + 2,
        TOKENS_SPENT
      );
    });

    it("Should return correct tokens of owner", async function () {
      const player1Tokens = await prizeNFT.tokensOfOwner(player1.address);
      expect(player1Tokens.length).to.equal(2);
      expect(player1Tokens[0]).to.equal(0);
      expect(player1Tokens[1]).to.equal(1);

      const player2Tokens = await prizeNFT.tokensOfOwner(player2.address);
      expect(player2Tokens.length).to.equal(1);
      expect(player2Tokens[0]).to.equal(2);
    });

    it("Should return empty array for address with no tokens", async function () {
      const tokens = await prizeNFT.tokensOfOwner(owner.address);
      expect(tokens.length).to.equal(0);
    });

    it("Should update tokensOfOwner after transfer", async function () {
      await prizeNFT.connect(player1).transferFrom(player1.address, player2.address, 0);

      const player1Tokens = await prizeNFT.tokensOfOwner(player1.address);
      expect(player1Tokens.length).to.equal(1);
      expect(player1Tokens[0]).to.equal(1);

      const player2Tokens = await prizeNFT.tokensOfOwner(player2.address);
      expect(player2Tokens.length).to.equal(2);
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await prizeNFT.connect(clawMachine).mintPrize(
        player1.address,
        PRIZE_ID,
        METADATA_URI,
        REPLAY_HASH,
        DIFFICULTY,
        TOKENS_SPENT
      );
    });

    it("Should allow owner to transfer NFT", async function () {
      await expect(
        prizeNFT.connect(player1).transferFrom(player1.address, player2.address, 0)
      ).to.not.be.reverted;

      expect(await prizeNFT.ownerOf(0)).to.equal(player2.address);
    });

    it("Should allow approved address to transfer", async function () {
      await prizeNFT.connect(player1).approve(player2.address, 0);
      
      await expect(
        prizeNFT.connect(player2).transferFrom(player1.address, owner.address, 0)
      ).to.not.be.reverted;

      expect(await prizeNFT.ownerOf(0)).to.equal(owner.address);
    });

    it("Should not allow unauthorized transfer", async function () {
      await expect(
        prizeNFT.connect(player2).transferFrom(player1.address, player2.address, 0)
      ).to.be.reverted;
    });

    it("Should preserve metadata after transfer", async function () {
      await prizeNFT.connect(player1).transferFrom(player1.address, player2.address, 0);

      const info = await prizeNFT.getPrizeInfo(0);
      expect(info.prizeId).to.equal(PRIZE_ID);
      expect(info.difficulty).to.equal(DIFFICULTY);
      expect(info.tokensSpent).to.equal(TOKENS_SPENT);
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant minter role", async function () {
      const minterRole = await prizeNFT.MINTER_ROLE();
      
      await expect(
        prizeNFT.grantMinterRole(player1.address)
      ).to.not.be.reverted;

      expect(await prizeNFT.hasRole(minterRole, player1.address)).to.be.true;
    });

    it("Should allow admin to revoke minter role", async function () {
      const minterRole = await prizeNFT.MINTER_ROLE();
      
      await prizeNFT.revokeMinterRole(clawMachine.address);
      
      expect(await prizeNFT.hasRole(minterRole, clawMachine.address)).to.be.false;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        prizeNFT.connect(player1).grantMinterRole(player2.address)
      ).to.be.reverted;
    });

    it("Should not allow non-admin to revoke roles", async function () {
      await expect(
        prizeNFT.connect(player1).revokeMinterRole(clawMachine.address)
      ).to.be.reverted;
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 interface", async function () {
      // ERC721 interface ID
      expect(await prizeNFT.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("Should support ERC721Metadata interface", async function () {
      // ERC721Metadata interface ID
      expect(await prizeNFT.supportsInterface("0x5b5e139f")).to.be.true;
    });

    it("Should support AccessControl interface", async function () {
      // AccessControl interface ID
      expect(await prizeNFT.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});

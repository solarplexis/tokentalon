Project Plan: "TokenTalon"
Blockchain Capstone Project

1. Executive Summary
"TokenTalon" is a browser-based, Web3-enabled claw machine game. Players connect their cryptocurrency wallets and spend tokens to operate a digital claw machine. Upon a successful "grab," the system mints a unique NFT representing the prize.

Unique Value Proposition: Unlike standard play-to-earn games, the NFT is not just a static image. It encapsulates the provenance of the victory. The metadata includes a deterministic data recording of the winning gameplay session, allowing the victory to be replayed visually.

2. Technical Architecture
Stack Strategy: "Unified JavaScript" for velocity and industry standard compliance.

Frontend: Next.js (React + TypeScript)
Handles Wallet Connection (wagmi / ethers.js).
Hosts the game canvas.
UI for NFT Gallery, Marketplace, and Leaderboards.
Game Engine: Phaser (JavaScript)
Handles 2D physics, collision detection, and game loop.
Renders the "2.5D" visual style (layered 2D images creating a 3D illusion).
Backend: Node.js (Express/Fastify + TypeScript)
Orchestrator: Manages game sessions, validates win claims, handles security.
Data Processing: Serializes replay data for IPFS storage.
Database: MongoDB or PostgreSQL (User stats, session logs).
Blockchain Layer:
Network: Polygon (for low gas fees) or Ethereum Sepolia (Testnet).
Smart Contracts: Solidity.
Storage: IPFS (Pinata or similar) for NFT image assets and replay JSON data.
3. Development Phases
Execution Strategy: Parallel workstreams prioritizing "Big Rocks" first.

Phase 1: The Core Mechanic (Weeks 1-2)
Goal: Validate that the game is fun and the physics work.

Tasks:
Set up Next.js + Phaser repo.
Implement basic claw physics (movement, drop, grab logic).
Implement "2.5D" visual layering (Cabinet background -> Prize -> Claw -> Glass foreground).
Create the "Replay System": Record input/physics data and successfully replay it deterministically.
Milestone: A playable game running locally where you can grab a placeholder box and watch a replay of the grab.
Phase 2: Blockchain Architecture (Weeks 3-4)
Goal: Build the trustless infrastructure.

Tasks:
Smart Contract Development:
GameToken.sol (ERC-20): The currency used to play.
ClawMachine.sol: Manages the "Credit" system (escrow), validates games, and authorizes minting.
PrizeNFT.sol (ERC-721): The prize contract with metadata support.
Backend Integration:
Set up Node.js API to listen for game results.
Implement logic to upload assets/metadata to IPFS.
Implement the secure "Oracle" pattern: Backend validates the win -> Backend signs a voucher -> Smart Contract verifies voucher -> Mint happens.
Milestone: A script that simulates a win and successfully mints an NFT with metadata on the Testnet.
Phase 3: Integration & Polish (Weeks 5-6)
Goal: Connect the UI to the Chain and make it look good.

Tasks:
Wiring: Connect the Phaser "Win" event to the Node.js API -> Blockchain transaction.
Asset Pipeline: Generate 10-15 base prize assets using AI (Midjourney) and integrate them into the prize pool.
Web3 UI: Build the "Connect Wallet" flow, Token Balance indicator, and "My Prizes" gallery.
Deployment: Deploy contracts to Testnet, Frontend to Vercel/Netlify.
Milestone: Full loop: Connect Wallet -> Approve Tokens -> Play Game -> Win -> View NFT in Gallery.
4. Data & Asset Strategy
Art Direction
Visual Style: Front-view 2D with depth layering.
Creation Pipeline:
Base Assets: AI Generation (Midjourney) for "Plushies" (Fox, Bear, Robot, etc.).
Customization: Programmatic overlays (color shifts, size variance) applied at runtime to create uniqueness.
NFT Data Model (Metadata)
The NFT JSON stored on IPFS will contain:

JSON
{
  "name": "Golden Fox #402",
  "description": "Won on TokenTalon. Difficulty: Hard.",
  "image": "ipfs://<image_hash>",
  "attributes": [
    { "trait_type": "Type", "value": "Fox" },
    { "trait_type": "Rarity", "value": "Legendary" },
    { "trait_type": "Tokens Spent", "value": 15 }
  ],
  "replay_data": "ipfs://<replay_json_hash>" // Points to lightweight physics recording
}
5. Smart Contract Design (High Level)
Play Function: Users approve the contract to spend X tokens. startGame() transfers tokens to the house wallet (or burns them) and emits a GameStarted event.
Mint Function: Protected function (only callable by the Owner/Backend Oracle). It receives the playerAddress, prizeData, and ipfsHash to mint the token to the winner.
6. Immediate Next Steps
Advisory Meeting: Present this plan to your course instructor to confirm it meets blockchain requirements.
Repo Setup: Initialize a monorepo with client (Next.js) and server (Node.js) folders.
Asset Generation: Spend 1 hour generating plushie prompts to build your initial library.
Prototype: Start the Phaser tutorial to get a basic box moving on a screen.
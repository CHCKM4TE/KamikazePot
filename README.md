# KamikazePot

A fully trustless, last-click-wins crypto game. The entire game state and funds live on-chain; the frontend is a static site that only interacts with the smart contract via the user's wallet.

## Project Layout

```
/frontend
  index.html
  style.css
  app.js
/contract
  KamikazePot.sol
```

## Deploying the Contract

You can deploy the Solidity contract with Remix or any preferred tool:

1. Open [Remix](https://remix.ethereum.org/), create `KamikazePot.sol` with the contents from `/contract/KamikazePot.sol`.
2. Set the compiler to Solidity `0.8.20` and compile.
3. Deploy `KamikazePot`, passing your dev wallet address to the constructor.
4. After deployment, copy the contract address.

## Wiring the Frontend

1. Open `/frontend/app.js` and set `contractAddress` to your deployed address:
   ```js
   const contractAddress = "0xYourDeployedAddress";
   ```
2. The ABI is already embedded; no other backend configuration is required.

## Running Locally

The frontend is pure static files:

```bash
cd frontend
python3 -m http.server 8080
```

Then open `http://localhost:8080` and connect your wallet (MetaMask).

## Deploying to GitHub

1. Initialize a repository if needed: `git init && git add . && git commit -m "Add KamikazePot"`.
2. Create a new GitHub repository and push:
   ```bash
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

## Deploying to Cloudflare Pages

1. In Cloudflare Pages, create a new project from your GitHub repo.
2. Set **Framework preset** to **None** (static).
3. Set the **Build command** to `none` (leave empty) and **Build output directory** to `frontend`.
4. Deploy. Pages will host the static files; all interactions remain client → wallet → contract.

## Gameplay Notes

- Credits cost **0.001 ETH** each. Every play consumes exactly one credit.
- Each play adds the credit's ETH value to the pot, records the player as `lastPlayer`, and extends the round by five minutes.
- When the round timer expires, anyone can settle the round; 90% of the pot goes to the last player and 10% to the dev wallet.
- The contract has no admin keys, upgrades, or custodial withdrawal paths.

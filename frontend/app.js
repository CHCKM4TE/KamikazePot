const contractAddress = "0xYourContractAddress"; // TODO: replace after deployment

const contractAbi = [
  "function pot() view returns (uint256)",
  "function credits(address) view returns (uint256)",
  "function lastPlayer() view returns (address)",
  "function roundEndTime() view returns (uint256)",
  "function CREDIT_PRICE_WEI() view returns (uint256)",
  "function buyCredits() payable",
  "function play()",
  "function checkRound()"
];

let provider;
let signer;
let contract;
let currentAccount;
let roundTimer;

const potValueEl = document.getElementById("potValue");
const creditsValueEl = document.getElementById("creditsValue");
const lastPlayerEl = document.getElementById("lastPlayer");
const timeLeftEl = document.getElementById("timeLeft");
const connectButton = document.getElementById("connectButton");
const buyButton = document.getElementById("buyButton");
const playButton = document.getElementById("playButton");
const buyAmountInput = document.getElementById("buyAmount");

function requireMetaMask() {
  if (!window.ethereum) {
    alert("MetaMask is required to play.");
    throw new Error("MetaMask not found");
  }
}

function formatAddress(addr) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function initProvider() {
  requireMetaMask();
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  contract = new ethers.Contract(contractAddress, contractAbi, provider);
  setupWalletListeners();
  startPolling();
}

async function connectWallet() {
  requireMetaMask();
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  currentAccount = ethers.utils.getAddress(accounts[0]);
  signer = provider.getSigner();
  contract = contract.connect(signer);
  connectButton.textContent = formatAddress(currentAccount);
  playButton.disabled = false;
  buyButton.disabled = false;
  await refreshState();
}

function setupWalletListeners() {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      currentAccount = undefined;
      connectButton.textContent = "Connect Wallet";
      playButton.disabled = true;
      buyButton.disabled = true;
      creditsValueEl.textContent = "0";
      return;
    }
    currentAccount = ethers.utils.getAddress(accounts[0]);
    signer = provider.getSigner();
    contract = contract.connect(signer);
    connectButton.textContent = formatAddress(currentAccount);
    refreshState();
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}

async function refreshState() {
  if (!contract) return;
  try {
    const [potWei, last, endTime] = await Promise.all([
      contract.pot(),
      contract.lastPlayer(),
      contract.roundEndTime()
    ]);
    potValueEl.textContent = `${ethers.utils.formatEther(potWei)} ETH`;
    lastPlayerEl.textContent = formatAddress(last);

    if (currentAccount) {
      const creditBalance = await contract.credits(currentAccount);
      creditsValueEl.textContent = creditBalance.toString();
    } else {
      creditsValueEl.textContent = "Connect to view";
    }

    updateCountdown(endTime.toNumber());
  } catch (error) {
    console.error(error);
  }
}

function updateCountdown(endTimestamp) {
  if (roundTimer) clearInterval(roundTimer);

  const tick = () => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(endTimestamp - now, 0);
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    timeLeftEl.textContent = `${minutes}:${seconds}`;
  };

  tick();
  roundTimer = setInterval(tick, 1000);
}

async function buyCredits() {
  if (!signer) return connectWallet();
  const ethAmount = buyAmountInput.value;
  if (!ethAmount || Number(ethAmount) <= 0) {
    alert("Enter an ETH amount to spend on credits.");
    return;
  }
  try {
    buyButton.disabled = true;
    const tx = await contract.buyCredits({ value: ethers.utils.parseEther(ethAmount) });
    await tx.wait();
    await refreshState();
  } catch (error) {
    console.error(error);
    alert(error?.data?.message || error.message);
  } finally {
    buyButton.disabled = false;
  }
}

async function playGame() {
  if (!signer) return connectWallet();
  try {
    playButton.disabled = true;
    const tx = await contract.play();
    await tx.wait();
    await refreshState();
  } catch (error) {
    console.error(error);
    alert(error?.data?.message || error.message);
  } finally {
    playButton.disabled = false;
  }
}

function startPolling() {
  setInterval(refreshState, 1000);
}

connectButton.addEventListener("click", connectWallet);
buyButton.addEventListener("click", buyCredits);
playButton.addEventListener("click", playGame);

initProvider().catch((err) => console.error(err));

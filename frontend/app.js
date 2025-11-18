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

function getInjectedProvider() {
  const { ethereum } = window;
  if (!ethereum) return undefined;
  if (ethereum.providers?.length) {
    return ethereum.providers.find((p) => p.isMetaMask) || ethereum.providers[0];
  }
  return ethereum;
}

function formatAddress(addr) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function initProvider() {
  const injected = getInjectedProvider();
  if (!injected) {
    alert("Please install an EVM wallet (MetaMask, Coinbase Wallet, Brave, etc.)");
    throw new Error("No EVM wallet detected");
  }
  provider = new ethers.providers.Web3Provider(injected, "any");
  contract = new ethers.Contract(contractAddress, contractAbi, provider);
  setupWalletListeners();
  startPolling();
}

async function connectWallet() {
  const injected = getInjectedProvider();
  if (!injected) return initProvider();
  const accounts = await injected.request({ method: "eth_requestAccounts" });
  currentAccount = ethers.utils.getAddress(accounts[0]);
  signer = provider.getSigner();
  contract = contract.connect(signer);
  connectButton.textContent = formatAddress(currentAccount);
  playButton.disabled = false;
  buyButton.disabled = false;
  await refreshState();
}

function setupWalletListeners() {
  const injected = getInjectedProvider();
  if (!injected) return;

  injected.on("accountsChanged", (accounts) => {
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

  injected.on("chainChanged", handleChainChanged);
}

async function handleChainChanged() {
  const injected = getInjectedProvider();
  if (!injected) return;

  try {
    provider = new ethers.providers.Web3Provider(injected, "any");
    contract = new ethers.Contract(contractAddress, contractAbi, provider);

    if (currentAccount) {
      signer = provider.getSigner();
      contract = contract.connect(signer);
      connectButton.textContent = formatAddress(currentAccount);
    } else {
      connectButton.textContent = "Connect Wallet";
      playButton.disabled = true;
      buyButton.disabled = true;
    }

    await refreshState();
  } catch (err) {
    console.error("Failed to handle chain change", err);
  }
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

const themeToggle = document.getElementById("themeToggle");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem("kamikazepot-theme", theme);
}

function initTheme() {
  const stored = localStorage.getItem("kamikazepot-theme");
  const theme = stored || (prefersDark.matches ? "dark" : "light");
  applyTheme(theme);
}

themeToggle.addEventListener("click", () => {
  const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
});

connectButton.addEventListener("click", connectWallet);
buyButton.addEventListener("click", buyCredits);
playButton.addEventListener("click", playGame);

initTheme();
initProvider().catch((err) => console.error(err));

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title KamikazePot - A trustless last-click-wins on-chain game.
contract KamikazePot {
    mapping(address => uint256) public credits;

    uint256 public pot;
    address public lastPlayer;
    uint256 public roundEndTime;

    uint256 public constant CREDIT_PRICE_WEI = 0.001 ether;
    uint256 public constant ROUND_EXTENSION = 5 minutes;

    address payable public immutable devWallet;

    bool private locked;

    event CreditsPurchased(address indexed buyer, uint256 creditsMinted, uint256 amountPaid);
    event Played(address indexed player, uint256 newPot, uint256 newRoundEndTime);
    event RoundEnded(
        address indexed winner,
        uint256 winnerPayout,
        uint256 devPayout,
        uint256 timestamp
    );

    error ReentrancyGuard();
    error InsufficientValue();
    error NoCredits();

    constructor(address payable _devWallet) {
        require(_devWallet != address(0), "dev wallet required");
        devWallet = _devWallet;
        roundEndTime = block.timestamp + ROUND_EXTENSION;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrancyGuard();
        locked = true;
        _;
        locked = false;
    }

    /// @notice Purchase credits at a fixed exchange rate.
    function buyCredits() external payable {
        if (msg.value < CREDIT_PRICE_WEI) revert InsufficientValue();

        uint256 mintedCredits = msg.value / CREDIT_PRICE_WEI;
        credits[msg.sender] += mintedCredits;

        emit CreditsPurchased(msg.sender, mintedCredits, msg.value);
    }

    /// @notice Spend a credit to become the last player and extend the round.
    function play() external nonReentrant {
        _checkRound();

        if (credits[msg.sender] < 1) revert NoCredits();

        credits[msg.sender] -= 1;
        pot += CREDIT_PRICE_WEI;

        lastPlayer = msg.sender;
        roundEndTime = block.timestamp + ROUND_EXTENSION;

        emit Played(msg.sender, pot, roundEndTime);
    }

    /// @notice Settle the round if the timer has expired.
    function checkRound() external nonReentrant {
        _checkRound();
    }

    /// @dev Internal round check to distribute the pot when the timer elapses.
    function _checkRound() internal {
        if (block.timestamp < roundEndTime) {
            return;
        }

        if (pot == 0 || lastPlayer == address(0)) {
            roundEndTime = block.timestamp + ROUND_EXTENSION;
            lastPlayer = address(0);
            return;
        }

        uint256 winnerShare = (pot * 90) / 100;
        uint256 devShare = pot - winnerShare;

        pot = 0;
        address payable winner = payable(lastPlayer);
        lastPlayer = address(0);
        roundEndTime = block.timestamp + ROUND_EXTENSION;

        _safeTransfer(winner, winnerShare);
        _safeTransfer(devWallet, devShare);

        emit RoundEnded(winner, winnerShare, devShare, block.timestamp);
    }

    function _safeTransfer(address payable to, uint256 amount) private {
        (bool success, ) = to.call{value: amount}("");
        require(success, "transfer failed");
    }

    receive() external payable {
        revert("use buyCredits");
    }
}

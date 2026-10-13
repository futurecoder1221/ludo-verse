
"use strict";

/* LUDO ROYALE - FINAL LOCAL GAME WITH SOUNDS */

const $ = id => document.getElementById(id);

/* SOUND SYSTEM */

function playGameSound(effect) {
    if (!soundEnabled) return;
    if (typeof LudoSounds === "undefined") return;

    if (typeof LudoSounds[effect] === "function") {
        LudoSounds[effect]();
    }
}

const homeScreen = $("homeScreen");
const setupScreen = $("setupScreen");
const gameScreen = $("gameScreen");
const board = $("ludoBoard");
const playersList = $("playersList");
const currentPlayerDisplay = $("currentPlayerDisplay");
const gameMessage = $("gameMessage");
const dice = $("dice");
const rollDiceBtn = $("rollDiceBtn");
const winnerModal = $("winnerModal");

const ICONS = {
    red: "🔴",
    green: "🟢",
    yellow: "🟡",
    blue: "🔵"
};

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const TURN_SECONDS = 50;
const FINISH_POSITION = 56;

let selectedMode = "multiplayer";
let selectedPlayers = 2;
let activePlayers = [];
let currentPlayerIndex = 0;

let gameStarted = false;
let soundEnabled = true;
let phase = "roll";
let rolls = [];
let consecutiveSixes = 0;
let bonusTurn = false;
let busy = false;

let gameVersion = 0;
let actionId = 0;
let timerInterval = null;
let timeLeft = TURN_SECONDS;

/* BOARD PATH */

const MAIN_PATH = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
    [0,7],[0,8],
    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
    [7,14],[8,14],
    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
    [14,7],[14,6],
    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
    [7,0],[6,0]
];

const START_INDEX = {
    red: 0,
    green: 13,
    yellow: 26,
    blue: 39
};

const HOME_POSITIONS = {
    red: [[1,1],[1,4],[4,1],[4,4]],
    green: [[1,10],[1,13],[4,10],[4,13]],
    yellow: [[10,10],[10,13],[13,10],[13,13]],
    blue: [[10,1],[10,4],[13,1],[13,4]]
};

const FINISH_LANES = {
    red: [[7,1],[7,2],[7,3],[7,4],[7,5]],
    green: [[1,7],[2,7],[3,7],[4,7],[5,7]],
    yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]],
    blue: [[13,7],[12,7],[11,7],[10,7],[9,7]]
};

const SAFE_INDICES = new Set([
    0, 8, 13, 21, 26, 34, 39, 47
]);

/* SAFE DELAY SYSTEM */

function delay(callback, milliseconds) {
    const version = gameVersion;

    setTimeout(() => {
        if (version === gameVersion && gameStarted) {
            callback();
        }
    }, milliseconds);
}

function invalidateActions() {
    gameVersion++;
    actionId++;
    stopTimer();
}

/* NAVIGATION */

function showScreen(screen) {
    document.querySelectorAll(".screen").forEach(item => {
        item.classList.remove("active");
    });

    screen.classList.add("active");
}

$("playBtn").onclick = () => showScreen(setupScreen);
$("setupBackBtn").onclick = () => showScreen(homeScreen);

$("rulesBtn").onclick = () => {
    $("rulesModal").classList.remove("hidden");
};

function closeRules() {
    $("rulesModal").classList.add("hidden");
}

$("closeRulesBtn").onclick = closeRules;
$("gotItBtn").onclick = closeRules;

$("rulesModal").onclick = event => {
    if (event.target === $("rulesModal")) closeRules();
};

/* GAME SETTINGS */

document.querySelectorAll(".mode-card").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".mode-card").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedMode = button.dataset.mode;

        $("playerSelection").style.display =
            selectedMode === "computer" ? "none" : "block";

        if (selectedMode === "computer") {
            selectedPlayers = 2;
        } else {
            const selected = document.querySelector(
                ".player-count.selected"
            );

            selectedPlayers = selected
                ? Number(selected.dataset.players)
                : 2;
        }
    };
});

document.querySelectorAll(".player-count").forEach(button => {
    button.onclick = () => {
        document.querySelectorAll(".player-count").forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedPlayers = Number(button.dataset.players);
    };
});

/* PLAYER SETUP */

function preparePlayers() {
    const colors = selectedMode === "computer"
        ? ["red", "yellow"]
        : {
            2: ["red", "yellow"],
            3: ["red", "green", "yellow"],
            4: ["red", "green", "yellow", "blue"]
        }[selectedPlayers];

    activePlayers = colors.map((color, index) => ({
        color,
        name: selectedMode === "computer"
            ? (index === 0 ? "You" : "Computer")
            : `Player ${index + 1}`,
        isComputer:
            selectedMode === "computer" && index === 1,
        tokens: [-1, -1, -1, -1]
    }));
}

function currentPlayer() {
    return activePlayers[currentPlayerIndex];
}

function renderPlayers() {
    playersList.innerHTML = "";

    activePlayers.forEach((player, index) => {
        const item = document.createElement("div");
        item.className = "player-item";

        if (index === currentPlayerIndex) {
            item.classList.add("active");
        }

        const name = document.createElement("span");
        const dot = document.createElement("span");

        dot.className = "player-dot";
        dot.style.background = `var(--${player.color})`;

        name.append(
            dot,
            document.createTextNode(" " + player.name)
        );

        const score = document.createElement("span");
        const finished = player.tokens.filter(
            position => position === FINISH_POSITION
        ).length;

        score.textContent = `${finished}/4 🏠`;

        item.append(name, score);
        playersList.appendChild(item);
    });
}

function updateTurnDisplay() {
    if (!currentPlayer()) return;

    currentPlayerDisplay.textContent =
        `${ICONS[currentPlayer().color]} ${currentPlayer().name}`;

    renderPlayers();
}

function updateDiceButton() {
    const computerTurn =
        gameStarted && currentPlayer()?.isComputer;

    rollDiceBtn.disabled =
        !gameStarted ||
        phase !== "roll" ||
        busy ||
        computerTurn;

    rollDiceBtn.textContent = computerTurn
        ? "🤖 COMPUTER PLAYING"
        : phase === "move"
            ? "SELECT A TOKEN"
            : "🎲 ROLL DICE";
}

/* TIMER */

function createTimerUI() {
    if ($("turnTimer")) return;

    const sidebar = document.querySelector(".game-sidebar");

    if (!sidebar) return;

    const card = document.createElement("div");
    card.className = "timer-card";

    card.innerHTML = `
        <div class="timer-top">
            <span>⏱️ TURN TIMER</span>
            <strong id="turnTimer">00:50</strong>
        </div>
        <div class="timer-track">
            <div id="timerFill"></div>
        </div>
        <p id="timerHint">
            Make your move before time runs out.
        </p>
    `;

    const diceCard = sidebar.querySelector(".dice-card");

    if (diceCard) {
        sidebar.insertBefore(card, diceCard);
    } else {
        sidebar.appendChild(card);
    }
}

function updateTimerUI() {
    if (!$("turnTimer") || !$("timerFill")) return;

    $("turnTimer").textContent =
        `00:${String(timeLeft).padStart(2, "0")}`;

    $("timerFill").style.width =
        `${(timeLeft / TURN_SECONDS) * 100}%`;

    $("turnTimer").classList.toggle(
        "timer-danger",
        timeLeft <= 10
    );

    $("timerFill").classList.toggle(
        "timer-danger",
        timeLeft <= 10
    );
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startTimer() {
    stopTimer();

    timeLeft = TURN_SECONDS;
    updateTimerUI();

    if (!gameStarted || currentPlayer()?.isComputer) {
        return;
    }

    const version = gameVersion;

    timerInterval = setInterval(() => {
        if (!gameStarted || version !== gameVersion) {
            stopTimer();
            return;
        }

        if (busy || phase === "waiting") return;

        timeLeft = Math.max(0, timeLeft - 1);
        updateTimerUI();

        if (timeLeft === 0) {
            stopTimer();

            gameMessage.textContent =
                "⏰ Time is up! Automatic move.";

            if (phase === "roll") {
                rollDice(true);
            } else if (phase === "move") {
                automaticMove();
            }
        }
    }, 1000);
}

/* BOARD */

function getCell(row, col) {
    return board.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
    );
}

function createBoard() {
    board.innerHTML = "";

    for (let row = 0; row < 15; row++) {
        for (let col = 0; col < 15; col++) {
            const cell = document.createElement("div");

            cell.className = "cell white";
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (row < 6 && col < 6) {
                cell.className = "cell red";
            } else if (row < 6 && col > 8) {
                cell.className = "cell green";
            } else if (row > 8 && col > 8) {
                cell.className = "cell yellow";
            } else if (row > 8 && col < 6) {
                cell.className = "cell blue";
            }

            if (
                row >= 6 && row <= 8 &&
                col >= 6 && col <= 8
            ) {
                cell.className = "cell center";
            }

            for (const [color, lane] of Object.entries(FINISH_LANES)) {
                if (lane.some(([r, c]) => r === row && c === col)) {
                    cell.className = `cell ${color}`;
                }
            }

            for (const [color, index] of Object.entries(START_INDEX)) {
                const [r, c] = MAIN_PATH[index];

                if (r === row && c === col) {
                    cell.className = `cell ${color}`;
                }
            }

            if (MAIN_PATH.some(([r, c]) =>
                r === row && c === col
            )) {
                cell.classList.add("track");
            }

            MAIN_PATH.forEach(([r, c], index) => {
                if (
                    SAFE_INDICES.has(index) &&
                    r === row && c === col
                ) {
                    cell.classList.add("safe");
                }
            });

            if (Object.values(HOME_POSITIONS).some(positions =>
                positions.some(([r, c]) =>
                    r === row && c === col
                )
            )) {
                cell.classList.add("home-spot");
            }

            board.appendChild(cell);
        }
    }

    renderTokens();
}

function tokenCoordinates(color, position, index) {
    if (position === -1) {
        return HOME_POSITIONS[color][index];
    }

    if (position === FINISH_POSITION) {
        return [7, 7];
    }

    if (position >= 51) {
        return FINISH_LANES[color][position - 51];
    }

    return MAIN_PATH[
        (START_INDEX[color] + position) % MAIN_PATH.length
    ];
}

function renderTokens() {
    board.querySelectorAll(".token").forEach(token => {
        token.remove();
    });

    activePlayers.forEach(player => {
        player.tokens.forEach((position, index) => {
            const [row, col] = tokenCoordinates(
                player.color,
                position,
                index
            );

            const cell = getCell(row, col);
            if (!cell) return;

            const token = document.createElement("div");

            token.className = `token ${player.color}`;
            token.title =
                `${player.name} - Token ${index + 1}`;

            const selectable =
                gameStarted &&
                phase === "move" &&
                !busy &&
                player === currentPlayer() &&
                !player.isComputer &&
                getValidRollsForToken(player, index).length > 0;

            if (selectable) {
                token.classList.add("selectable");
            }

            token.onclick = () => {
                selectToken(player.color, index);
            };

            cell.appendChild(token);
        });
    });
}

/* DICE ROLLING */

function rollDice(automatic = false) {
    if (!gameStarted || phase !== "roll" || busy) return;

    if (currentPlayer().isComputer && !automatic) return;

    busy = true;
    updateDiceButton();

    dice.classList.add("rolling");
    playGameSound("dice");

    const version = gameVersion;
    const action = ++actionId;
    const playerIndex = currentPlayerIndex;

    setTimeout(() => {
        if (
            !gameStarted ||
            version !== gameVersion ||
            action !== actionId ||
            playerIndex !== currentPlayerIndex
        ) {
            return;
        }

        dice.classList.remove("rolling");

        const result = Math.floor(Math.random() * 6) + 1;

        dice.textContent = DICE_FACES[result - 1];

        if (result === 6) {
            playGameSound("six");
        }

        rolls.push(result);

        consecutiveSixes =
            result === 6 ? consecutiveSixes + 1 : 0;

        busy = false;

        if (consecutiveSixes === 3) {
            rolls = [];
            phase = "waiting";

            gameMessage.textContent =
                "🎲 6, 6, 6! All rolls cancelled.";

            updateDiceButton();

            delay(nextTurn, 900);
            return;
        }

        if (result === 6) {
            gameMessage.textContent =
                `🎲 Rolled 6! Roll again. Rolls: ${rolls.join(", ")}`;

            updateDiceButton();

            if (automatic || currentPlayer().isComputer) {
                delay(() => rollDice(true), 700);
            } else {
                startTimer();
            }

            return;
        }

        phase = "move";
        beginMovement();
    }, 450);
}

rollDiceBtn.onclick = () => rollDice(false);

/* LEGAL MOVES */

function canMove(position, number) {
    if (position === FINISH_POSITION) return false;

    if (position === -1) {
        return number === 6;
    }

    return position + number <= FINISH_POSITION;
}

function getValidRollsForToken(player, index) {
    return [...new Set(rolls)].filter(number =>
        canMove(player.tokens[index], number)
    );
}

function getAllLegalMoves(player) {
    const moves = [];

    player.tokens.forEach((position, tokenIndex) => {
        getValidRollsForToken(player, tokenIndex).forEach(number => {
            moves.push({
                tokenIndex,
                number
            });
        });
    });

    return moves;
}

function hasAnyLegalMove() {
    return getAllLegalMoves(currentPlayer()).length > 0;
}

/* MOVE SELECTION */

function beginMovement() {
    if (!gameStarted) return;

    updateDiceButton();

    if (!hasAnyLegalMove()) {
        rolls = [];
        phase = "waiting";

        gameMessage.textContent =
            "No legal moves. Passing turn.";

        updateDiceButton();
        delay(finishMovement, 750);
        return;
    }

    if (currentPlayer().isComputer) {
        gameMessage.textContent =
            `🤖 Computer choosing a move: ${rolls.join(", ")}`;

        delay(automaticMove, 750);
    } else {
        gameMessage.textContent =
            `Available rolls: ${rolls.join(", ")}. Select a token.`;

        renderTokens();
        startTimer();
    }
}

function selectToken(color, index) {
    if (
        !gameStarted ||
        phase !== "move" ||
        busy ||
        currentPlayer().isComputer
    ) {
        return;
    }

    const player = currentPlayer();

    if (player.color !== color) return;

    const numbers = getValidRollsForToken(player, index);

    if (!numbers.length) return;

    let number = numbers[0];

    if (numbers.length > 1) {
        const answer = prompt(
            `Available dice: ${numbers.join(", ")}\n` +
            "Which number do you want to use?",
            String(numbers[0])
        );

        if (answer === null) return;

        number = Number(answer);

        if (!numbers.includes(number)) {
            gameMessage.textContent =
                "Please choose a valid dice number.";
            return;
        }
    }

    moveToken(player, index, number);
}

/* COMPUTER AI */

function chooseAutomaticMove(player) {
    if (
        player.isComputer &&
        typeof LudoAI !== "undefined" &&
        typeof LudoAI.chooseMove === "function"
    ) {
        const choice = LudoAI.chooseMove(player);

        if (
            choice &&
            Number.isInteger(choice.tokenIndex) &&
            getValidRollsForToken(
                player,
                choice.tokenIndex
            ).includes(choice.number)
        ) {
            return choice;
        }
    }

    const moves = getAllLegalMoves(player);

    if (!moves.length) return null;

    return moves.find(move =>
        player.tokens[move.tokenIndex] === -1 &&
        move.number === 6
    ) || moves[0];
}

function automaticMove() {
    if (
        !gameStarted ||
        phase !== "move" ||
        busy
    ) {
        return;
    }

    const player = currentPlayer();
    const choice = chooseAutomaticMove(player);

    if (!choice) {
        rolls = [];
        phase = "waiting";
        delay(finishMovement, 500);
        return;
    }

    gameMessage.textContent = player.isComputer
        ? "🤖 Computer is moving a token..."
        : "⏰ Automatic token move!";

    moveToken(
        player,
        choice.tokenIndex,
        choice.number
    );
}

/* TOKEN MOVEMENT */

function moveToken(player, index, number) {
    if (
        !gameStarted ||
        phase !== "move" ||
        player !== currentPlayer()
    ) {
        return;
    }

    const previous = player.tokens[index];

    if (!canMove(previous, number)) return;

    const next = previous === -1
        ? 0
        : previous + number;

    player.tokens[index] = next;

    const rollIndex = rolls.indexOf(number);

    if (rollIndex !== -1) {
        rolls.splice(rollIndex, 1);
    }

    let captured = false;
    const finished = next === FINISH_POSITION;

    if (next >= 0 && next <= 50) {
        const square =
            (START_INDEX[player.color] + next) %
            MAIN_PATH.length;

        if (!SAFE_INDICES.has(square)) {
            activePlayers.forEach(opponent => {
                if (opponent === player) return;

                opponent.tokens.forEach(
                    (position, opponentIndex) => {
                        if (position < 0 || position > 50) return;

                        const opponentSquare =
                            (
                                START_INDEX[opponent.color] +
                                position
                            ) % MAIN_PATH.length;

                        if (opponentSquare === square) {
                            opponent.tokens[opponentIndex] = -1;
                            captured = true;
                        }
                    }
                );
            });
        }
    }

    if (captured || finished) {
        bonusTurn = true;
    }

    if (captured) {
        playGameSound("capture");
    } else if (finished) {
        playGameSound("finish");
    } else {
        playGameSound("move");
    }

    renderTokens();
    updateTurnDisplay();

    if (player.tokens.every(
        position => position === FINISH_POSITION
    )) {
        finishGame(player);
        return;
    }

    if (rolls.length === 0 || !hasAnyLegalMove()) {
        rolls = [];
        phase = "waiting";

        gameMessage.textContent = captured
            ? "⚔️ Opponent captured! Bonus turn!"
            : finished
                ? "🏆 Token finished! Bonus turn!"
                : "Moves completed.";

        updateDiceButton();
        delay(finishMovement, 750);
        return;
    }

    gameMessage.textContent =
        `Remaining rolls: ${rolls.join(", ")}`;

    renderTokens();

    if (player.isComputer) {
        delay(automaticMove, 700);
    } else {
        startTimer();
    }
}

/* TURN MANAGEMENT */

function finishMovement() {
    if (!gameStarted) return;

    if (bonusTurn) {
        bonusTurn = false;
        phase = "roll";
        rolls = [];
        consecutiveSixes = 0;

        gameMessage.textContent =
            "🎉 Bonus turn! Roll again.";

        updateDiceButton();
        renderTokens();

        if (currentPlayer().isComputer) {
            delay(() => rollDice(true), 800);
        } else {
            startTimer();
        }
    } else {
        nextTurn();
    }
}

function nextTurn() {
    if (!gameStarted) return;

    currentPlayerIndex =
        (currentPlayerIndex + 1) % activePlayers.length;

    phase = "roll";
    rolls = [];
    consecutiveSixes = 0;
    bonusTurn = false;
    busy = false;

    dice.classList.remove("rolling");
    dice.textContent = "⚀";

    updateTurnDisplay();
    updateDiceButton();
    renderTokens();

    const player = currentPlayer();

    gameMessage.textContent =
        `${player.name}, roll the dice!`;

    if (player.isComputer) {
        stopTimer();
        delay(() => rollDice(true), 900);
    } else {
        startTimer();
    }
}

/* WINNER */

function finishGame(player) {
    playGameSound("win");

    gameStarted = false;
    phase = "finished";

    invalidateActions();

    $("winnerText").textContent =
        `${ICONS[player.color]} ${player.name} wins Ludo Royale!`;

    winnerModal.classList.remove("hidden");

    updateDiceButton();
}

/* GAME START */

function startGame() {
    invalidateActions();

    preparePlayers();

    currentPlayerIndex = 0;
    gameStarted = true;
    phase = "roll";
    rolls = [];
    consecutiveSixes = 0;
    bonusTurn = false;
    busy = false;

    createBoard();
    createTimerUI();

    dice.classList.remove("rolling");
    dice.textContent = "⚀";

    winnerModal.classList.add("hidden");

    showScreen(gameScreen);

    updateTurnDisplay();
    updateDiceButton();

    gameMessage.textContent =
        "🎲 Roll the dice to begin!";

    startTimer();
}

$("startGameBtn").onclick = startGame;
$("playAgainBtn").onclick = startGame;

$("restartBtn").onclick = () => {
    if (confirm("Restart this game?")) {
        startGame();
    }
};

$("homeBtn").onclick = () => {
    if (confirm("Leave the current game?")) {
        invalidateActions();
        gameStarted = false;
        showScreen(homeScreen);
    }
};

$("winnerHomeBtn").onclick = () => {
    invalidateActions();
    gameStarted = false;
    winnerModal.classList.add("hidden");
    showScreen(homeScreen);
};

/* SOUND ON / OFF BUTTON */

$("soundBtn").onclick = () => {
    soundEnabled = !soundEnabled;

    if (typeof LudoSounds !== "undefined") {
        LudoSounds.enabled = soundEnabled;

        if (soundEnabled) {
            playGameSound("move");
        }
    }

    $("soundBtn").textContent =
        soundEnabled ? "🔊" : "🔇";
};


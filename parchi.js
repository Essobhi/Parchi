// ============================================
// MOROCCAN PARCHÍS – EXPLICIT PATHS LINKED TO HTML
// ============================================

// ---------- EXPLICIT PATHS (as you defined) ----------
function range(start, end) {
    let arr = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
}

const paths = {
    yellow: [
        ...range(22, 68),
        ...range(1, 17),
        'Y1','Y2','Y3','Y4','Y5','Y6','Y7',
        'finish'
    ],
    blue: [
        ...range(5, 68),
        ...range(1, 4),
        'B1','B2','B3','B4','B5','B6','B7',
        'finish'
    ],
    red: [
        ...range(56, 68),
        ...range(1, 51),
        'R1','R2','R3','R4','R5','R6','R7',
        'finish'
    ],
    green: [
        ...range(39, 68),
        ...range(1, 34),
        'G1','G2','G3','G4','G5','G6','G7',
        'finish'
    ]
};


// ---------- DOM element mapping (links path steps to HTML) ----------
function getPositionElement(position, color) {
    // Finish triangle
    if (position === 'finish') {
        const map = {
            yellow: document.querySelector([value="Y8"]),
            blue:   document.querySelector([value="B8"]),
            red:    document.querySelector([value="R8"]),
            green:  document.querySelector([value="G8"])
        };
        return map[color];
    }
   
    // Normal board squares – match by 'value' attribute
    return document.querySelector(`[value="${position}"]`);
}

// ---------- Game state ----------
const playerOrder = ['blue', 'yellow', 'green', 'red'];
let gameState = {
    currentPlayer: 'blue',
    diceResult: null,
    consecutiveSixes: 0,
    waitingForMove: false,
    winner: null,
    extraTurn: false,
    firstTurnDone: { blue: false, yellow: false, green: false, red: false },
    lastMovedToken: null,
    effectiveDice: null,
    possibleMoves: [],
    waitingForBonus: false,
    bonusSpaces: 0,
    bonusOriginToken: null
};

let tokens = { blue: [], yellow: [], green: [], red: [] };

// Safe squares (black circles) – from your HTML
const safeSquares = [12, 17, 29, 34, 46, 51, 63, 68];

// ---------- Helper functions ----------
function showMessage(msg, isError = false) {
    let div = document.getElementById('game-message');
    if (!div) {
        div = document.createElement('div');
        div.id = 'game-message';
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.left = '50%';
        div.style.transform = 'translateX(-50%)';
        div.style.backgroundColor = 'rgba(0,0,0,0.8)';
        div.style.color = 'white';
        div.style.padding = '10px 20px';
        div.style.borderRadius = '20px';
        div.style.fontSize = '20px';
        div.style.zIndex = '1000';
        document.body.appendChild(div);
    }
    div.style.backgroundColor = isError ? 'rgba(200,0,0,0.8)' : 'rgba(0,0,0,0.8)';
    div.textContent = msg;
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 500);
    }, 2000);
}

function getNestContainer(color) {
    const nests = {
        yellow: '#container1 .circle.yellow',
        blue: '#container3 .circle.blue',
        red: '#container9 .circle.red',
        green: '#container7 .circle.green'
    };
    return document.querySelector(nests[color]);
}

function sendTokenToNest(color, tokenIndex) {
    const token = tokens[color][tokenIndex];
    const nest = getNestContainer(color);
    if (nest && token.element) {
        nest.appendChild(token.element);
        token.position = null;
        token.isFinished = false;
    }
}

function moveTokenElement(token, newPos, color) {
    if (!token.element) return;
    const target = getPositionElement(newPos, color);
    if (target) {
        target.appendChild(token.element);
        token.position = newPos;
        if (newPos === 'finish') token.isFinished = true;
    } else {
        console.error(`No HTML element found for position: ${newPos}, color: ${color}`);
    }
}

function getNewPosition(color, currentPos, steps) {
    if (currentPos === null) return null; // in nest
    if (currentPos === 'finish') return null;
    const path = paths[color];
    let idx = path.indexOf(currentPos);
    if (idx === -1) return null;
    let newIdx = idx + steps;
    if (newIdx >= path.length) return null; // overshoot – need exact roll to finish
    return path[newIdx];
}

function isSafeSquare(pos) {
    if (typeof pos === 'number') return safeSquares.includes(pos);
    return false;
}

function getTokenAtPosition(pos, excludeColor) {
    for (let color of playerOrder) {
        if (color === excludeColor) continue;
        for (let i = 0; i < tokens[color].length; i++) {
            const t = tokens[color][i];
            if (!t.isFinished && t.position === pos) {
                return { color, tokenIndex: i };
            }
        }
    }
    return null;
}

function applyBonus(color, bonusSpaces, originTokenIndex) {
    const active = [];
    for (let i = 0; i < tokens[color].length; i++) {
        const t = tokens[color][i];
        if (!t.isFinished && t.position !== null) active.push(i);
    }
    if (active.length === 0) return;
    if (active.length === 1) {
        executeMove(color, active[0], bonusSpaces, true);
    } else {
        showMessage(`Choose a token for +${bonusSpaces} bonus by clicking it.`);
        gameState.waitingForBonus = true;
        gameState.bonusSpaces = bonusSpaces;
        gameState.bonusOriginToken = originTokenIndex;
    }
}

function executeMove(color, tokenIndex, steps, isBonus = false) {
    const token = tokens[color][tokenIndex];
    const oldPos = token.position;
    let newPos = null;

    // Case 1: token in nest
    if (oldPos === null) {
        const isFirstTurn = !gameState.firstTurnDone[color];
        // First turn: any dice roll moves directly to start + steps
        if (isFirstTurn) {
            const start = paths[color][0]; // e.g., 22 for yellow
            // But you wanted: start + dice (e.g., blue 5+3=8)
            // However, the path after start is not linear by +1? Actually your board is linear in value.
            // For first move, we can just add the dice to the start number.
            if (typeof start === 'number') {
                let target = start + steps;
                if (target > 68) {
                    showMessage(`Cannot move that far on first turn`, true);
                    return false;
                }
                newPos = target;
                gameState.firstTurnDone[color] = true;
            } else {
                showMessage(`Start square is not a number`, true);
                return false;
            }
        } else {
            // Normal exit: need 5
            if (!isBonus && steps !== 5) {
                showMessage(`Need a 5 to exit`, true);
                return false;
            }
            newPos = paths[color][0]; // place on start square
        }
    } else {
        newPos = getNewPosition(color, oldPos, steps);
        if (newPos === null) {
            showMessage(`Invalid move (need exact roll to finish?)`, true);
            return false;
        }
    }

    // Check capture (only on numeric squares, not safe)
    let captureInfo = null;
    if (typeof newPos === 'number' && !isSafeSquare(newPos)) {
        captureInfo = getTokenAtPosition(newPos, color);
    }

    moveTokenElement(token, newPos, color);

    if (captureInfo) {
        sendTokenToNest(captureInfo.color, captureInfo.tokenIndex);
        showMessage(`${color} captured ${captureInfo.color}'s token! +20 bonus.`);
        applyBonus(color, 20, tokenIndex);
    }

    if (newPos === 'finish') {
        token.isFinished = true;
        showMessage(`${color} got a token HOME! +10 bonus.`);
        applyBonus(color, 10, tokenIndex);
        const finishedCount = tokens[color].filter(t => t.isFinished).length;
        if (finishedCount === 4) {
            gameState.winner = color;
            showMessage(`${color.toUpperCase()} WINS THE GAME! 🎉`);
            document.querySelector('.rollbtn').disabled = true;
            return true;
        }
    }

    gameState.lastMovedToken = { color, tokenIndex };
    return true;
}

// ---------- Dice and turn management ----------
async function rollDice() {
    const diceImg = document.querySelector(".dice");
    diceImg.setAttribute("src", "images/dice/dice-roll.gif");
    return new Promise(resolve => {
        setTimeout(() => {
            const result = Math.floor(Math.random() * 6) + 1;
            diceImg.setAttribute("src", `images/dice/dice${result}.svg`);
            resolve(result);
        }, 1000);
    });
}

function switchPlayer() {
    const idx = playerOrder.indexOf(gameState.currentPlayer);
    gameState.currentPlayer = playerOrder[(idx + 1) % playerOrder.length];
    gameState.consecutiveSixes = 0;
    gameState.waitingForMove = false;
    gameState.extraTurn = false;
    showMessage(`${gameState.currentPlayer.toUpperCase()}'s turn`);
}

let rollBtn = document.querySelector('.rollbtn');
function disableRoll() { rollBtn.disabled = true; rollBtn.style.opacity = '0.5'; }
function enableRoll() { rollBtn.disabled = false; rollBtn.style.opacity = '1'; }

function finalizeTurnAfterMove(color, stepsMoved) {
    if (stepsMoved === 6 || stepsMoved === 12) {
        gameState.consecutiveSixes++;
        if (gameState.consecutiveSixes === 3) {
            showMessage(`Three 6's! Last moved token sent home.`);
            if (gameState.lastMovedToken) {
                sendTokenToNest(gameState.lastMovedToken.color, gameState.lastMovedToken.tokenIndex);
            }
            gameState.consecutiveSixes = 0;
            switchPlayer();
        } else {
            showMessage(`Extra turn!`);
            gameState.extraTurn = true;
            gameState.waitingForMove = false;
            enableRoll();
            return;
        }
    } else {
        gameState.consecutiveSixes = 0;
    }
    if (!gameState.extraTurn) switchPlayer();
    gameState.extraTurn = false;
    gameState.waitingForMove = false;
    enableRoll();
}

async function handleTurn() {
    if (gameState.winner) return;
    if (gameState.waitingForMove) {
        showMessage("Move a token first!", true);
        return;
    }
    disableRoll();
    const dice = await rollDice();
    gameState.diceResult = dice;
    showMessage(`${gameState.currentPlayer} rolled a ${dice}`);

    let effective = dice;
    const allOnBoard = tokens[gameState.currentPlayer].every(t => t.position !== null && !t.isFinished);
    if (allOnBoard && dice === 6) {
        effective = 12;
        showMessage(`All tokens out! 6 becomes 12.`);
    }

    // First turn: if all tokens in nest and first turn not done
    const isFirstTurn = !gameState.firstTurnDone[gameState.currentPlayer];
    if (isFirstTurn && tokens[gameState.currentPlayer].every(t => t.position === null)) {
        // Move the first token using dice (start + dice)
        const tokenIndex = 0;
        const success = executeMove(gameState.currentPlayer, tokenIndex, dice);
        if (success) {
            finalizeTurnAfterMove(gameState.currentPlayer, dice);
        } else {
            enableRoll();
        }
        return;
    }

    // Normal turn: find possible moves
    const possible = [];
    for (let i = 0; i < tokens[gameState.currentPlayer].length; i++) {
        const t = tokens[gameState.currentPlayer][i];
        if (t.isFinished) continue;
        if (t.position === null) {
            // In nest – need 5 to exit (after first turn)
            if (effective === 5) possible.push(i);
        } else {
            const newPos = getNewPosition(gameState.currentPlayer, t.position, effective);
            if (newPos !== null) possible.push(i);
        }
    }
    if (possible.length === 0) {
        showMessage(`No possible moves. Turn passed.`);
        switchPlayer();
        enableRoll();
        return;
    }

    gameState.waitingForMove = true;
    gameState.effectiveDice = effective;
    gameState.possibleMoves = possible;
    if (possible.length === 1) {
        setTimeout(() => {
            executeMove(gameState.currentPlayer, possible[0], effective);
            finalizeTurnAfterMove(gameState.currentPlayer, effective);
        }, 500);
    } else {
        showMessage(`Click a token to move it ${effective} spaces.`);
    }
}

function onTokenClick(color, tokenIndex) {
    if (gameState.winner) return;
    if (gameState.waitingForBonus) {
        executeMove(color, tokenIndex, gameState.bonusSpaces, true);
        gameState.waitingForBonus = false;
        enableRoll();
        return;
    }
    if (color !== gameState.currentPlayer) {
        showMessage(`Not your turn`, true);
        return;
    }
    if (!gameState.waitingForMove) {
        showMessage(`Roll the dice first`, true);
        return;
    }
    if (!gameState.possibleMoves.includes(tokenIndex)) {
        showMessage(`Cannot move that token ${gameState.effectiveDice} spaces`, true);
        return;
    }
    gameState.waitingForMove = false;
    const success = executeMove(gameState.currentPlayer, tokenIndex, gameState.effectiveDice);
    if (!success) {
        gameState.waitingForMove = true;
        enableRoll();
        return;
    }
    finalizeTurnAfterMove(gameState.currentPlayer, gameState.effectiveDice);
}

// ---------- Initialization ----------
function initTokens() {
    for (const color of playerOrder) {
        tokens[color] = [];
        for (let i = 1; i <= 4; i++) {
            const el = document.getElementById(`piece-${color}-${i}`);
            if (el) {
                tokens[color].push({
                    id: `piece-${color}-${i}`,
                    element: el,
                    position: null,
                    isFinished: false
                });
                el.style.cursor = 'pointer';
                el.addEventListener('click', (function(c, idx) {
                    return () => onTokenClick(c, idx);
                })(color, i-1));
            }
        }
    }
}

function initGame() {
    initTokens();
    gameState.currentPlayer = 'yellow';
    gameState.waitingForMove = false;
    gameState.firstTurnDone = { yellow: false, blue: false, red: false, green: false };
    showMessage("Moroccan Parchís! Yellow goes first. Roll the dice.");
    rollBtn.onclick = handleTurn;
    rollBtn.disabled = false;
    rollBtn.style.opacity = '1';
}

window.addEventListener('DOMContentLoaded', initGame);
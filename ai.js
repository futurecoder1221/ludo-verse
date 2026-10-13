
"use strict";

/*
 LUDO ROYALE - COMPUTER AI
 Basic decision-making system
*/

const LudoAI = {

    // Check if a move can capture an opponent
    canCapture(player, tokenIndex, number) {
        const position = player.tokens[tokenIndex];

        if (!canMove(position, number)) return false;

        const next = position === -1 ? 0 : position + number;

        if (next < 0 || next > 50) return false;

        const square =
            (START_INDEX[player.color] + next) % MAIN_PATH.length;

        if (SAFE_INDICES.has(square)) return false;

        return activePlayers.some(opponent =>
            opponent !== player &&
            opponent.tokens.some(opponentPosition => {
                if (opponentPosition < 0 ||
                    opponentPosition > 50) return false;

                const opponentSquare =
                    (START_INDEX[opponent.color] + opponentPosition)
                    % MAIN_PATH.length;

                return opponentSquare === square;
            })
        );
    },

    // Select the best available move
    chooseMove(player) {
        const possibleMoves = [];

        player.tokens.forEach((position, tokenIndex) => {
            getValidRollsForToken(player, tokenIndex)
                .forEach(number => {
                    const next = position === -1
                        ? 0
                        : position + number;

                    let score = Math.random() * 2;

                    // Highest priority: finish a token
                    if (next === FINISH_POSITION) {
                        score += 100;
                    }

                    // Capture opponent
                    if (this.canCapture(player, tokenIndex, number)) {
                        score += 80;
                    }

                    // Bring new token onto board
                    if (position === -1 && number === 6) {
                        score += 35;
                    }

                    // Move closer to finish
                    score += next / 10;

                    possibleMoves.push({
                        tokenIndex,
                        number,
                        score
                    });
                });
        });

        possibleMoves.sort((a, b) => b.score - a.score);

        return possibleMoves[0] || null;
    }
};

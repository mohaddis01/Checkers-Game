document.addEventListener('DOMContentLoaded', () => {
    // Game state
    const gameState = {
        board: Array(8).fill().map(() => Array(8).fill(null)),
        currentPlayer: 'red',
        selectedPiece: null,
        validMoves: [],
        moveHistory: [],
        gameOver: false,
        timers: {
            red: 0,
            black: 0
        },
        timerInterval: null,
        gameMode: 'human', // 'human' or 'ai'
        aiDifficulty: 'medium' // 'easy', 'medium', 'hard'
    };

    // DOM elements
    const boardElement = document.getElementById('board');
    const redPlayerElement = document.getElementById('red-player');
    const blackPlayerElement = document.getElementById('black-player');
    const redTimerElement = document.getElementById('red-timer');
    const blackTimerElement = document.getElementById('black-timer');
    const gameStatusElement = document.getElementById('game-status');
    const historyListElement = document.getElementById('history-list');
    const newGameBtn = document.getElementById('new-game-btn');
    const undoBtn = document.getElementById('undo-btn');
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverMessage = document.getElementById('game-over-message');
    const playAgainBtn = document.getElementById('play-again-btn');
    const modeSelect = document.getElementById('mode-select');
    const difficultySelect = document.getElementById('difficulty-select');

    // Initialize the game
    function initGame() {
        // Clear the board
        gameState.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Set up pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 !== 0) {
                    if (row < 3) {
                        gameState.board[row][col] = { type: 'black', king: false };
                    } else if (row > 4) {
                        gameState.board[row][col] = { type: 'red', king: false };
                    }
                }
            }
        }
        
        // Reset game state
        gameState.currentPlayer = 'red';
        gameState.selectedPiece = null;
        gameState.validMoves = [];
        gameState.moveHistory = [];
        gameState.gameOver = false;
        gameState.timers = { red: 0, black: 0 };
        
        // Set game mode and difficulty
        gameState.gameMode = modeSelect.value;
        gameState.aiDifficulty = difficultySelect.value;
        
        // Clear timers
        clearInterval(gameState.timerInterval);
        updateTimers();
        startTimer();
        
        // Update UI
        updatePlayerTurn();
        renderBoard();
        historyListElement.innerHTML = '';
        
        // Close modal if open
        gameOverModal.style.display = 'none';
        
        // If AI is black and it's their turn, make AI move
        if (gameState.gameMode === 'ai' && gameState.currentPlayer === 'black') {
            setTimeout(makeAIMove, 500);
        }
    }

    // Render the board
    function renderBoard() {
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Highlight selected piece and valid moves
                if (gameState.selectedPiece && gameState.selectedPiece.row === row && gameState.selectedPiece.col === col) {
                    square.classList.add('highlight');
                }
                
                if (gameState.validMoves.some(move => move.row === row && move.col === col)) {
                    square.classList.add('possible-move');
                }
                
                // Add piece if exists
                const piece = gameState.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `board-piece ${piece.type} ${piece.king ? 'king' : ''}`;
                    pieceElement.dataset.row = row;
                    pieceElement.dataset.col = col;
                    
                    if (gameState.selectedPiece && gameState.selectedPiece.row === row && gameState.selectedPiece.col === col) {
                        pieceElement.classList.add('selected');
                    }
                    
                    square.appendChild(pieceElement);
                }
                
                square.addEventListener('click', () => handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }
    }

    // Handle square click
    function handleSquareClick(row, col) {
        if (gameState.gameOver || (gameState.gameMode === 'ai' && gameState.currentPlayer === 'black')) return;
        
        const piece = gameState.board[row][col];
        
        // If a piece of the current player is clicked, select it
        if (piece && piece.type === gameState.currentPlayer) {
            gameState.selectedPiece = { row, col };
            gameState.validMoves = getValidMoves(row, col);
            renderBoard();
            return;
        }
        
        // If a square is clicked with a selected piece, try to move
        if (gameState.selectedPiece) {
            const { row: fromRow, col: fromCol } = gameState.selectedPiece;
            const isValidMove = gameState.validMoves.some(move => move.row === row && move.col === col);
            
            if (isValidMove) {
                const move = gameState.validMoves.find(move => move.row === row && move.col === col);
                makeMove(fromRow, fromCol, row, col, move.captures);
                
                // If playing against AI and it's their turn, make AI move
                if (!gameState.gameOver && gameState.gameMode === 'ai' && gameState.currentPlayer === 'black') {
                    setTimeout(makeAIMove, 500);
                }
            } else {
                // Deselect if invalid move
                gameState.selectedPiece = null;
                gameState.validMoves = [];
                renderBoard();
            }
        }
    }

    // Get valid moves for a piece
    function getValidMoves(row, col) {
        const piece = gameState.board[row][col];
        if (!piece) return [];
        
        const moves = [];
        const directions = piece.king ? 
            [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }] :
            piece.type === 'red' ? 
                [{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }] : 
                [{ dr: 1, dc: -1 }, { dr: 1, dc: 1 }];
        
        // Check for captures first (mandatory capture rule)
        let hasCaptures = false;
        
        for (const dir of directions) {
            const jumpRow = row + dir.dr * 2;
            const jumpCol = col + dir.dc * 2;
            
            if (isValidPosition(jumpRow, jumpCol)) {
                const middleRow = row + dir.dr;
                const middleCol = col + dir.dc;
                const middlePiece = gameState.board[middleRow][middleCol];
                
                if (middlePiece && middlePiece.type !== piece.type && gameState.board[jumpRow][jumpCol] === null) {
                    moves.push({ 
                        row: jumpRow, 
                        col: jumpCol, 
                        captures: [{ row: middleRow, col: middleCol }]
                    });
                    hasCaptures = true;
                }
            }
        }
        
        // If there are captures, only return captures (mandatory capture rule)
        if (hasCaptures) return moves;
        
        // Regular moves
        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;
            
            if (isValidPosition(newRow, newCol) && gameState.board[newRow][newCol] === null) {
                moves.push({ row: newRow, col: newCol, captures: [] });
            }
        }
        
        return moves;
    }

    // Check if position is valid
    function isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Make a move
    function makeMove(fromRow, fromCol, toRow, toCol, captures) {
        const piece = gameState.board[fromRow][fromCol];
        
        // Move the piece
        gameState.board[toRow][toCol] = {...piece };
        gameState.board[fromRow][fromCol] = null;
        
        // Promote to king if reached the end
        if (!piece.king) {
            if ((piece.type === 'red' && toRow === 0) || (piece.type === 'black' && toRow === 7)) {
                gameState.board[toRow][toCol].king = true;
            }
        }
        
        // Capture pieces
        captures.forEach(({ row, col }) => {
            gameState.board[row][col] = null;
        });
        
        // Add to move history
        const moveNotation = `${String.fromCharCode(97 + fromCol)}${8 - fromRow}-${String.fromCharCode(97 + toCol)}${8 - toRow}`;
        gameState.moveHistory.push({
            player: gameState.currentPlayer,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captures,
            notation: moveNotation
        });
        
        updateHistory();
        
        // Check for additional captures
        if (captures.length > 0) {
            const nextCaptures = getValidMoves(toRow, toCol).filter(move => move.captures.length > 0);
            
            if (nextCaptures.length > 0) {
                gameState.selectedPiece = { row: toRow, col: toCol };
                gameState.validMoves = nextCaptures;
                renderBoard();
                return;
            }
        }
        
        // Switch player
        gameState.selectedPiece = null;
        gameState.validMoves = [];
        gameState.currentPlayer = gameState.currentPlayer === 'red' ? 'black' : 'red';
        
        // Check for game over
        checkGameOver();
        
        if (!gameState.gameOver) {
            updatePlayerTurn();
            renderBoard();
        }
    }

    // AI move logic
    function makeAIMove() {
        if (gameState.gameOver || gameState.currentPlayer !== 'black') return;
        
        const possibleMoves = getAllValidMoves('black');
        if (possibleMoves.length === 0) {
            checkGameOver();
            return;
        }
        
        let chosenMove;
        
        switch (gameState.aiDifficulty) {
            case 'easy':
                // Random move
                chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                break;
                
            case 'medium':
                // Prefer captures and prioritize kings
                const captures = possibleMoves.filter(move => move.captures.length > 0);
                if (captures.length > 0) {
                    // Among captures, prefer those with more captures or king moves
                    captures.sort((a, b) => {
                        // Prioritize moves with more captures
                        if (b.captures.length !== a.captures.length) {
                            return b.captures.length - a.captures.length;
                        }
                        // Then prioritize moves that create kings
                        const pieceA = gameState.board[a.from.row][a.from.col];
                        const pieceB = gameState.board[b.from.row][b.from.col];
                        const becomesKingA = !pieceA.king && ((pieceA.type === 'red' && a.to.row === 0) || (pieceA.type === 'black' && a.to.row === 7));
                        const becomesKingB = !pieceB.king && ((pieceB.type === 'red' && b.to.row === 0) || (pieceB.type === 'black' && b.to.row === 7));
                        return (becomesKingB ? 1 : 0) - (becomesKingA ? 1 : 0);
                    });
                    chosenMove = captures[0];
                } else {
                    // For non-captures, prefer moves that create kings or move forward
                    possibleMoves.sort((a, b) => {
                        const pieceA = gameState.board[a.from.row][a.from.col];
                        const pieceB = gameState.board[b.from.row][b.from.col];
                        const becomesKingA = !pieceA.king && ((pieceA.type === 'red' && a.to.row === 0) || (pieceA.type === 'black' && a.to.row === 7));
                        const becomesKingB = !pieceB.king && ((pieceB.type === 'red' && b.to.row === 0) || (pieceB.type === 'black' && b.to.row === 7));
                        
                        if (becomesKingA !== becomesKingB) {
                            return (becomesKingB ? 1 : 0) - (becomesKingA ? 1 : 0);
                        }
                        
                        // For black pieces, higher row numbers are forward
                        return (b.to.row - a.to.row);
                    });
                    chosenMove = possibleMoves[0];
                }
                break;
                
            case 'hard':
                // MiniMax algorithm with alpha-beta pruning
                chosenMove = findBestMove();
                break;
                
            default:
                chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        }
        
        // Execute the chosen move
        makeMove(
            chosenMove.from.row, 
            chosenMove.from.col, 
            chosenMove.to.row, 
            chosenMove.to.col, 
            chosenMove.captures
        );
    }

    // MiniMax algorithm for hard difficulty
    function findBestMove() {
        const depth = 3; // Search depth
        let bestMove = null;
        let bestValue = -Infinity;
        const possibleMoves = getAllValidMoves('black');
        
        for (const move of possibleMoves) {
            // Make the move on a copy of the board
            const boardCopy = JSON.parse(JSON.stringify(gameState.board));
            
            // Apply the move
            const piece = {...gameState.board[move.from.row][move.from.col] };
            gameState.board[move.to.row][move.to.col] = piece;
            gameState.board[move.from.row][move.from.col] = null;
            
            // Promote to king if needed
            if (!piece.king && ((piece.type === 'red' && move.to.row === 0) || (piece.type === 'black' && move.to.row === 7))) {
                piece.king = true;
                gameState.board[move.to.row][move.to.col].king = true;
            }
            
            // Remove captured pieces
            move.captures.forEach(({ row, col }) => {
                gameState.board[row][col] = null;
            });
            
            // Evaluate the move
            const moveValue = minimax(depth - 1, -Infinity, Infinity, false);
            
            // Undo the move
            gameState.board = boardCopy;
            
            // Update best move
            if (moveValue > bestValue) {
                bestValue = moveValue;
                bestMove = move;
            }
        }
        
        return bestMove || possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    // MiniMax with alpha-beta pruning
    function minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return evaluateBoard();
        }
        
        const currentPlayer = isMaximizing ? 'black' : 'red';
        const possibleMoves = getAllValidMoves(currentPlayer);
        
        if (possibleMoves.length === 0) {
            // If no moves available, it's a loss for this player
            return isMaximizing ? -1000 + depth : 1000 - depth;
        }
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            
            for (const move of possibleMoves) {
                // Make the move on a copy of the board
                const boardCopy = JSON.parse(JSON.stringify(gameState.board));
                
                // Apply the move
                const piece = {...gameState.board[move.from.row][move.from.col] };
                gameState.board[move.to.row][move.to.col] = piece;
                gameState.board[move.from.row][move.from.col] = null;
                
                // Promote to king if needed
                if (!piece.king && ((piece.type === 'red' && move.to.row === 0) || (piece.type === 'black' && move.to.row === 7))) {
                    piece.king = true;
                    gameState.board[move.to.row][move.to.col].king = true;
                }
                
                // Remove captured pieces
                move.captures.forEach(({ row, col }) => {
                    gameState.board[row][col] = null;
                });
                
                // Recursive evaluation
                const eval = minimax(depth - 1, alpha, beta, false);
                
                // Undo the move
                gameState.board = boardCopy;
                
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            
            for (const move of possibleMoves) {
                // Make the move on a copy of the board
                const boardCopy = JSON.parse(JSON.stringify(gameState.board));
                
                // Apply the move
                const piece = {...gameState.board[move.from.row][move.from.col] };
                gameState.board[move.to.row][move.to.col] = piece;
                gameState.board[move.from.row][move.from.col] = null;
                
                // Promote to king if needed
                if (!piece.king && ((piece.type === 'red' && move.to.row === 0) || (piece.type === 'black' && move.to.row === 7))) {
                    piece.king = true;
                    gameState.board[move.to.row][move.to.col].king = true;
                }
                
                // Remove captured pieces
                move.captures.forEach(({ row, col }) => {
                    gameState.board[row][col] = null;
                });
                
                // Recursive evaluation
                const eval = minimax(depth - 1, alpha, beta, true);
                
                // Undo the move
                gameState.board = boardCopy;
                
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            
            return minEval;
        }
    }

    // Evaluate the board for AI
    function evaluateBoard() {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (!piece) continue;
                
                // Piece values
                if (piece.type === 'black') {
                    // AI's pieces are positive
                    score += piece.king ? 10 : 5;
                    
                    // Position bonuses - prefer center and king row
                    if (!piece.king) {
                        // Encourage advancing toward king row
                        score += (7 - row) * 0.1;
                    } else {
                        // Kings are more valuable in center
                        const centerDist = Math.abs(3.5 - col) + Math.abs(3.5 - row);
                        score += (8 - centerDist) * 0.2;
                    }
                } else {
                    // Player's pieces are negative
                    score -= piece.king ? 10 : 5;
                    
                    if (!piece.king) {
                        // Penalize player for advancing
                        score += row * 0.1;
                    } else {
                        // Kings are more valuable in center
                        const centerDist = Math.abs(3.5 - col) + Math.abs(3.5 - row);
                        score -= (8 - centerDist) * 0.2;
                    }
                }
            }
        }
        
        return score;
    }

    // Get all valid moves for a player
    function getAllValidMoves(player) {
        const moves = [];
        let hasCaptures = false;
        
        // First check if there are any captures (mandatory capture rule)
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.type === player) {
                    const pieceMoves = getValidMoves(row, col);
                    const captures = pieceMoves.filter(move => move.captures.length > 0);
                    
                    if (captures.length > 0) {
                        hasCaptures = true;
                        captures.forEach(move => {
                            moves.push({
                                from: { row, col },
                                to: { row: move.row, col: move.col },
                                captures: move.captures
                            });
                        });
                    }
                }
            }
        }
        
        if (hasCaptures) return moves;
        
        // If no captures, get all regular moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.type === player) {
                    const pieceMoves = getValidMoves(row, col);
                    pieceMoves.forEach(move => {
                        moves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            captures: move.captures
                        });
                    });
                }
            }
        }
        
        return moves;
    }

    // Check if game is over
    function checkGameOver() {
        const redPieces = [];
        const blackPieces = [];
        let redHasMoves = false;
        let blackHasMoves = false;
        
        // Count pieces and check for valid moves
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (!piece) continue;
                
                if (piece.type === 'red') {
                    redPieces.push({ row, col });
                    if (!redHasMoves && getValidMoves(row, col).length > 0) {
                        redHasMoves = true;
                    }
                } else {
                    blackPieces.push({ row, col });
                    if (!blackHasMoves && getValidMoves(row, col).length > 0) {
                        blackHasMoves = true;
                    }
                }
            }
        }
        
        // Check for win conditions
        if (redPieces.length === 0 || (gameState.currentPlayer === 'red' && !redHasMoves)) {
            endGame('black');
        } else if (blackPieces.length === 0 || (gameState.currentPlayer === 'black' && !blackHasMoves)) {
            endGame('red');
        }
    }

    // End the game
    function endGame(winner) {
        gameState.gameOver = true;
        clearInterval(gameState.timerInterval);
        
        gameOverMessage.textContent = winner === 'red' ? 'Red Player Wins!' : 'Black Player Wins!';
        gameOverModal.style.display = 'flex';
    }

    // Update player turn display
    function updatePlayerTurn() {
        redPlayerElement.classList.toggle('active', gameState.currentPlayer === 'red');
        blackPlayerElement.classList.toggle('active', gameState.currentPlayer === 'black');
        
        gameStatusElement.textContent = `${gameState.currentPlayer === 'red' ? 'Red' : 'Black'}'s Turn`;
        gameStatusElement.style.backgroundColor = gameState.currentPlayer === 'red' ? 'rgba(221, 17, 17, 0.1)' : 'rgba(34, 34, 34, 0.1)';
        gameStatusElement.style.color = gameState.currentPlayer === 'red' ? 'var(--red-piece)' : 'var(--black-piece)';
    }

    // Update move history
    function updateHistory() {
        const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
        const moveElement = document.createElement('div');
        moveElement.className = 'history-move';
        moveElement.textContent = `${lastMove.player === 'red' ? 'Red' : 'Black'}: ${lastMove.notation}`;
        
        if (lastMove.captures.length > 0) {
            moveElement.textContent += ` (x${lastMove.captures.length})`;
            moveElement.style.fontWeight = 'bold';
        }
        
        historyListElement.appendChild(moveElement);
        historyListElement.scrollTop = historyListElement.scrollHeight;
    }

    // Timer functions
    function startTimer() {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(() => {
            gameState.timers[gameState.currentPlayer]++;
            updateTimers();
        }, 1000);
    }

    function updateTimers() {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            return `${mins}:${secs}`;
        };
        
        redTimerElement.textContent = formatTime(gameState.timers.red);
        blackTimerElement.textContent = formatTime(gameState.timers.black);
    }

    // Undo last move
    function undoMove() {
        if (gameState.moveHistory.length === 0 || gameState.gameOver) return;
        
        const lastMove = gameState.moveHistory.pop();
        
        // Restore the moved piece
        const piece = gameState.board[lastMove.to.row][lastMove.to.col];
        gameState.board[lastMove.from.row][lastMove.from.col] = piece;
        gameState.board[lastMove.to.row][lastMove.to.col] = null;
        
        // Restore captured pieces
        lastMove.captures.forEach(({ row, col }) => {
            gameState.board[row][col] = { 
                type: lastMove.player === 'red' ? 'black' : 'red', 
                king: false // Simplified - in a full implementation you'd need to track if captured pieces were kings
            };
        });
        
        // Switch back to the previous player
        gameState.currentPlayer = lastMove.player;
        
        // Update UI
        gameState.selectedPiece = null;
        gameState.validMoves = [];
        updatePlayerTurn();
        renderBoard();
        updateHistory();
        
        // Remove the last history entry
        if (historyListElement.lastChild) {
            historyListElement.removeChild(historyListElement.lastChild);
        }
    }

    // Event listeners
    newGameBtn.addEventListener('click', initGame);
    undoBtn.addEventListener('click', undoMove);
    playAgainBtn.addEventListener('click', () => {
        gameOverModal.style.display = 'none';
        initGame();
    });
    modeSelect.addEventListener('change', initGame);
    difficultySelect.addEventListener('change', initGame);

    // Initialize the game
    initGame();
});
const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

// Initialize Octokit
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Constants
const ROWS = 8;
const COLS = 8;
const MINES = 10;

// Load game state or initialize a new one
let gameState;

try {
  gameState = JSON.parse(fs.readFileSync('./game-state.json', 'utf8'));
} catch (error) {
  // Initialize a new game
  gameState = initializeGame();
  fs.writeFileSync('./game-state.json', JSON.stringify(gameState, null, 2));
}

// Process the comment
async function processComment() {
  const commentBody = process.env.COMMENT_BODY.trim().toLowerCase();
  const issueNumber = process.env.ISSUE_NUMBER;
  const commentId = process.env.COMMENT_ID;
  
  // Parse the command
  if (commentBody === 'new game') {
    gameState = initializeGame();
    await replyToComment('New game started!');
  } else if (commentBody.startsWith('click ')) {
    const coords = commentBody.substring(6).trim().toUpperCase();
    processMoveClick(coords);
  } else if (commentBody.startsWith('flag ')) {
    const coords = commentBody.substring(5).trim().toUpperCase();
    processMoveFlag(coords);
  }
  
  // Save the game state
  fs.writeFileSync('./game-state.json', JSON.stringify(gameState, null, 2));
}

// Initialize a new game
function initializeGame() {
  // Create an empty board
  const board = Array(ROWS).fill().map(() => Array(COLS).fill({
    revealed: false,
    hasMine: false,
    flagged: false,
    adjacentMines: 0
  }));
  
  // Place mines randomly
  let minesPlaced = 0;
  while (minesPlaced < MINES) {
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);
    
    if (!board[row][col].hasMine) {
      board[row][col].hasMine = true;
      minesPlaced++;
      
      // Increment adjacent mine count for surrounding cells
      for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
          if (r !== row || c !== col) {
            board[r][c].adjacentMines++;
          }
        }
      }
    }
  }
  
  return {
    board,
    gameOver: false,
    win: false
  };
}

// Process a click move
function processMoveClick(coords) {
  if (gameState.gameOver) return;
  
  const { row, col } = parseCoordinates(coords);
  if (row === -1 || col === -1) return;
  
  const cell = gameState.board[row][col];
  
  if (cell.revealed || cell.flagged) return;
  
  if (cell.hasMine) {
    // Game over - hit a mine
    revealAllMines();
    gameState.gameOver = true;
    return;
  }
  
  // Reveal the cell
  revealCell(row, col);
  
  // Check for win
  checkForWin();
}

// Process a flag move
function processMoveFlag(coords) {
  if (gameState.gameOver) return;
  
  const { row, col } = parseCoordinates(coords);
  if (row === -1 || col === -1) return;
  
  const cell = gameState.board[row][col];
  
  if (cell.revealed) return;
  
  // Toggle flag
  cell.flagged = !cell.flagged;
  
  // Check for win
  checkForWin();
}

// Parse coordinates like A5 to row,col
function parseCoordinates(coords) {
  if (coords.length < 2 || coords.length > 3) return { row: -1, col: -1 };
  
  const colChar = coords.charAt(0);
  const rowNum = parseInt(coords.substring(1), 10);
  
  if (colChar < 'A' || colChar > 'H' || isNaN(rowNum) || rowNum < 1 || rowNum > 8) {
    return { row: -1, col: -1 };
  }
  
  return {
    row: rowNum - 1,
    col: colChar.charCodeAt(0) - 'A'.charCodeAt(0)
  };
}

// Reveal a cell and its neighbors if it's empty
function revealCell(row, col) {
  const cell = gameState.board[row][col];
  
  if (cell.revealed || cell.flagged) return;
  
  cell.revealed = true;
  
  // If it's a 0, reveal neighbors recursively
  if (cell.adjacentMines === 0) {
    for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
        if (r !== row || c !== col) {
          revealCell(r, c);
        }
      }
    }
  }
}

// Reveal all mines when game is over
function revealAllMines() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (gameState.board[row][col].hasMine) {
        gameState.board[row][col].revealed = true;
      }
    }
  }
}

// Check if the player has won
function checkForWin() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = gameState.board[row][col];
      // If a non-mine cell is not revealed, the game is not won yet
      if (!cell.hasMine && !cell.revealed) {
        return false;
      }
    }
  }
  
  // All non-mine cells are revealed, so the player has won
  gameState.gameOver = true;
  gameState.win = true;
  return true;
}

// Reply to a comment
async function replyToComment(message) {
  try {
    await octokit.issues.createComment({
      owner: process.env.GITHUB_REPOSITORY.split('/')[0],
      repo: process.env.GITHUB_REPOSITORY.split('/')[1],
      issue_number: process.env.ISSUE_NUMBER,
      body: message
    });
  } catch (error) {
    console.error('Error replying to comment:', error);
  }
}

// Run the main function
processComment().catch(console.error);
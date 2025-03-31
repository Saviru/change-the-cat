const fs = require('fs');
const path = require('path');

// Load the game state
const gameState = JSON.parse(fs.readFileSync('./game-state.json', 'utf8'));

// Generate the board markdown
function generateBoardMarkdown() {
  const { board, gameOver, win } = gameState;
  
  let markdown = '';
  
  // Add game status
  if (gameOver) {
    markdown += win ? '## 🎉 You Win! 🎉\n\n' : '## 💥 Game Over 💥\n\n';
    markdown += 'Comment `new game` to start a new game.\n\n';
  } else {
    markdown += '## Game in Progress\n\n';
  }
  
  // Add column headers
  markdown += '|   | A | B | C | D | E | F | G | H |\n';
  markdown += '|---|---|---|---|---|---|---|---|---|\n';
  
  // Generate rows
  for (let row = 0; row < 8; row++) {
    markdown += `| ${row + 1} |`;
    
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      
      if (cell.flagged && !cell.revealed) {
        markdown += ' 🚩 |';
      } else if (!cell.revealed) {
        markdown += ` <a href="javascript:void(0)" title="Click ${String.fromCharCode(65 + col)}${row + 1}">⬜</a> |`;
      } else if (cell.hasMine) {
        markdown += ' 💣 |';
      } else if (cell.adjacentMines === 0) {
        markdown += '   |';
      } else {
        // Use different colors for different numbers
        const colors = ['blue', 'green', 'red', 'purple', 'maroon', 'turquoise', 'black', 'gray'];
        markdown += ` <span style="color:${colors[cell.adjacentMines - 1]}">${cell.adjacentMines}</span> |`;
      }
    }
    
    markdown += '\n';
  }
  
  // Add instructions
  markdown += '\n### How to Play\n';
  markdown += '- Comment `click A1` to reveal a tile\n';
  markdown += '- Comment `flag B4` to flag a tile as a mine\n';
  markdown += '- Comment `new game` to start a new game\n';
  
  return markdown;
}

// Update the README.md file
function updateReadme() {
  const readmePath = './README.md';
  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Replace the board section
  const boardMarkdown = generateBoardMarkdown();
  readmeContent = readmeContent.replace(
    /<!-- MINESWEEPER-BOARD -->[\s\S]*?(?=<!--|$)/,
    `<!-- MINESWEEPER-BOARD -->\n${boardMarkdown}\n`
  );
  
  fs.writeFileSync(readmePath, readmeContent);
}

// Run the update
updateReadme();
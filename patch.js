const fs = require('fs');
const path = 'c:\\NIGERIA Coin\\src\\pages\\Dashboard.jsx';
const content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// 0-indexed: Line 406 is index 405, Line 544 is index 543
// Remove 139 lines starting at index 405
lines.splice(405, 139);

fs.writeFileSync(path, lines.join('\n'));
console.log('Removed AI recommendation section.');

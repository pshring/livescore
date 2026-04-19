import fs from 'fs';

const filePath = '/app/applet/src/App.tsx';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Line 2924 is actually index 2923
if (lines[2923].includes('</div>') && lines[2923].length < 20) {
  console.log('Found problematic line:', lines[2923]);
  lines.splice(2923, 1);
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('Fixed file.');
} else {
  console.log('Could not find problematic line at expected index. Line at 2923 is:', lines[2923]);
}

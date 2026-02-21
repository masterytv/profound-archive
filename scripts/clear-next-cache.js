const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), '.next');

// Next.js sometimes aggressively holds locks or prevents deletion of .next
// You can workaround it by restarting the Next.js server with a new name
try {
  if (fs.existsSync(dir)) {
    console.log(`Renaming .next to .next.old.${Date.now()}`);
    fs.renameSync(dir, path.join(process.cwd(), `.next.old.${Date.now()}`));
    console.log('Successfully renamed .next folder. Next.js will rebuild it on next start.');
  }
} catch (e) {
  console.error('Could not rename .next folder:', e);
}

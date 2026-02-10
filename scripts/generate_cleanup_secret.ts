
import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('hex');
console.log(`\n\n=== NEW CRON SECRET ===\n${secret}\n=======================\n`);
console.log('Instructions:');
console.log('1. Copy the string above (between the lines).');
console.log('2. Update Google Secret Manager (CRON_SECRET) with this value.');
console.log('3. Update GitHub Secrets (CRON_SECRET) with this EXACT same value.');

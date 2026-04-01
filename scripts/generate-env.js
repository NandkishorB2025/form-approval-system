const fs = require('fs');
const path = require('path');

const values = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  SUBMISSIONS_TABLE: process.env.SUBMISSIONS_TABLE || 'applications'
};

const content = `window.__APP_CONFIG__ = ${JSON.stringify(values, null, 2)};\n`;
const outputPath = path.join(__dirname, '..', 'public', 'env.js');

fs.writeFileSync(outputPath, content, 'utf8');
console.log(`Generated ${outputPath}`);

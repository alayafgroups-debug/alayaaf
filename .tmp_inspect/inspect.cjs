const fs = require('fs');
const c = fs.readFileSync('/root/app/code/client/pages/HRAttendanceReport.tsx', 'utf8');
const lines = c.split('\n');
console.log(lines[89]);

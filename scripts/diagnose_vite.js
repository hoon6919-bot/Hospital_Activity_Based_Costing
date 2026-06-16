import { exec } from 'child_process';

console.log("Running vite build...");
exec('npx vite build', (error, stdout, stderr) => {
    console.log("--- STDOUT ---");
    console.log(stdout);
    console.log("--- STDERR ---");
    console.log(stderr);
    if (error) {
        console.log("--- ERROR ---");
        console.error(error);
    }
});

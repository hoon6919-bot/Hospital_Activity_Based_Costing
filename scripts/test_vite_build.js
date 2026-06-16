import { execSync } from 'child_process';

try {
    console.log("Starting build process...");
    execSync('npx vite build', { stdio: 'inherit' });
    console.log("Build completed successfully!");
} catch (error) {
    console.error("Build failed with error:", error.message);
    if (error.stdout) console.log("STDOUT:", error.stdout.toString());
    if (error.stderr) console.log("STDERR:", error.stderr.toString());
}

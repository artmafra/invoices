import fs from "fs";
import path from "path";

const cwd = process.cwd();

// Recursively copy directory
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);

  files.forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy both directories needed for standalone
copyDir(path.join(cwd, ".next/static"), path.join(cwd, ".next/standalone/.next/static"));
console.log("✓ .next/static copied to standalone build");

copyDir(path.join(cwd, "public"), path.join(cwd, ".next/standalone/public"));
console.log("✓ public folder copied to standalone build");

const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace role names
    content = content.replace(/'Super Admin'/g, "'SUPER_ADMIN'");
    content = content.replace(/'Admin'/g, "'ADMIN'");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            replaceInFile(fullPath);
        }
    }
}

const apiDir = path.join(__dirname, 'app', 'api');
console.log(`Starting mass replacement in ${apiDir}...`);
traverse(apiDir);
console.log('Done!');

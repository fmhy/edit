
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, '../docs');

// Non-recursive scan of DOCS_DIR
function getDocsFiles(dir) {
    const files = fs.readdirSync(dir);
    const mdFiles = [];
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (!stat.isDirectory() && file.endsWith('.md')) {
            mdFiles.push(filePath);
        }
    });
    return mdFiles;
}

const files = getDocsFiles(DOCS_DIR);
let hasErrors = false;

console.log('🔍 Scanning markdown files for formatting issues...\n');

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), file);

    lines.forEach((line, index) => {
        const lineNum = index + 1;
        let errors = [];

        // Check 1: Starred links must be bolded
        // Pattern: * ⭐ [Link] -> Bad
        // Pattern: * ⭐ **[Link] -> Good
        // Only applies to list items starting with * or -
        if (/^\s*[*+-]\s+⭐/.test(line)) {
            // It's a starred list item. 
            // Check if the text immediately following "⭐ " starts with "**"
            // We look for the star, then optional spaces, then ensure "**" follows.
            if (!/⭐\s*\*\*/.test(line)) {
                errors.push('Starred item not bolded (expected * ⭐ **Link**)');
            }
        }

        // Check 2: Space between ] (
        if (/\]\s+\(http/.test(line)) {
            errors.push('Space between bracket and parenthesis in link');
        }

        // Check 3: Missing closing bracket ]
        // Pattern: [Text(http... 
        // We look for [ followed by (http without ] in between.
        if (/\[[^\]]*\(http/.test(line)) {
            errors.push('Possible missing closing bracket "]"');
        }

        // Check 4: Missing closing parenthesis )
        // Pattern: [Text](http...  where it ends without )
        // We look for "](http..." followed by space or end of line, but NOT ending with )
        // regex: \]\(http[^)]*($|\s) matches "](http://url" at EOL or "](http://url "
        const missingParenMatch = line.match(/\]\((http[^)]+?)($|\s)/);
        if (missingParenMatch) {
            errors.push(`Possible broken link (missing closing parenthesis or trailing space): ${missingParenMatch[1]}`);
        }

        // Check 5: Double parenthesis in link
        // specific pattern: ](url)) 
        // This is often valid if inside parenthesis: (See [Link](url))
        // We only flag if parentheses are UNBALANCED in the line.
        if (/\]\([^)]+\)\)/.test(line)) {
            const openParens = (line.match(/\(/g) || []).length;
            const closeParens = (line.match(/\)/g) || []).length;
            if (closeParens > openParens) {
                errors.push('Double closing parenthesis in link (Unbalanced)');
            }
        }

        // Check 6: Double spaces
        // We want to avoid double spaces in the text, but ignore leading indentation.
        // We trim start of line to ignore indentation, then check for "  ".
        const trimmedLine = line.trimStart();
        if (trimmedLine.includes('  ')) {
            errors.push('Double space detected');
        }

        // Check 7: Broken Bold Syntax
        // Pattern: ** Text**, **Text **, or ** Text **
        // We temporarily replace inline code to avoid false positives
        const boldLine = line.replace(/`[^`]+`/g, 'PLACEHOLDER');
        if (boldLine.includes('**')) {
            const parts = boldLine.split('**');
            // Check odd segments (inside the stars)
            for (let i = 1; i < parts.length; i += 2) {
                // Ensure we have a closing pair on this line
                if (i + 1 < parts.length) {
                    const text = parts[i];
                    if (text.length > 0 && (/^\s/.test(text) || /\s$/.test(text))) {
                        errors.push(`Broken bold syntax (leading/trailing space) in "**${text}**"`);
                    }
                }
            }
        }
        // Check 8: Asymmetric spaces around slash
        // We must exclude URLs (http://...)
        const lineWithoutLinks = line.replace(/https?:\/\/[^\s)]+/g, 'LINK_PLACEHOLDER');

        // Ignore VitePress sidebar links (e.g. "link: /foo")
        if (!/^\s*link:/i.test(line)) {
            // A. Missing space after slash: " /Word"
            // Exception: /> (HTML close tag)
            // Exception: /Word/ (Path/Board e.g. /co/)
            const missingSpaceAfter = lineWithoutLinks.matchAll(/\s\/([^\s]+)/g);
            for (const match of missingSpaceAfter) {
                const wordAfter = match[1];
                if (wordAfter.startsWith('>')) continue; // Ignore />
                // Ignore paths (e.g. /bin), subreddits (/r/foo), or compound words (Word/Word)
                if (wordAfter.includes('/')) continue;

                errors.push(`Missing space after slash (e.g. "Word /Word"): "${match[0]}"`);
                break;
            }

            // B. Missing space before slash: "Word/ "
            // Exceptions: w/ (with), r/ (reddit), u/ (user), c/ (community)
            // Exception: /Word/ (Path/Board e.g. /b/)
            const missingSpaceBefore = lineWithoutLinks.matchAll(/([^\s]+)\/\s/g);
            for (const match of missingSpaceBefore) {
                const wordBefore = match[1];
                // Allow common abbreviations: w/, r/, u/, c/
                if (/^(w|r|u|c)$/i.test(wordBefore)) continue;
                // Allow paths ending in slash or containing slash: /b/ or [/int
                if (wordBefore.includes('/')) continue;

                errors.push(`Missing space before slash (e.g. "Word/ Word"): "${match[0]}"`);
                break;
            }
        }

        if (errors.length > 0) {
            hasErrors = true;
            errors.forEach(err => {
                // file:line - Error (in red/cyan)
                console.log(`\x1b[36m${relativePath}:${lineNum}\x1b[0m - \x1b[31m${err}\x1b[0m`);
                // Source line (dimmed)
                console.log(`  \x1b[90m${line.trim()}\x1b[0m`);
            });
        }
    });
});

if (!hasErrors) {
    console.log('✅ No formatting issues found.');
} else {
    // console.log('\n❌ Issues found. Please review.');
    process.exit(1);
}

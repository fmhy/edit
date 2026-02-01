
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

// Load typos from CSV
const typosMap = new Map();
try {
    const typosPath = path.resolve(__dirname, 'typos.csv');
    if (fs.existsSync(typosPath)) {
        const typosContent = fs.readFileSync(typosPath, 'utf-8');
        const typoLines = typosContent.split('\n');
        typoLines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const typo = parts[0].trim().toLowerCase();
                const correction = parts[1].trim();
                if (typo && correction) {
                    typosMap.set(typo, correction);
                }
            }
        });
        console.log(`✅ Loaded ${typosMap.size} typos from dictionary.`);
    } else {
        console.warn('⚠️ scripts/typos.csv not found, using fallback list.');
    }
} catch (e) {
    console.warn(`⚠️ Failed to load typos: ${e.message}`);
}

console.log('🔍 Scanning markdown files for formatting issues...\n');

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), file);

    // Files to complete ignore from all checks
    const FILES_TO_IGNORE = [
        'docs/feedback.md',
        'docs/index.md'
    ];

    if (FILES_TO_IGNORE.some(fileToIgnore => relativePath === fileToIgnore)) return;

    // Files to ignore for english-specific checks (Typos, A/An, Repeated Words)
    const FILES_TO_IGNORE_ENGLISH_CHECKS = [
        'docs/non-english.md'
    ];
    const isSeparatedEnglishCheck = FILES_TO_IGNORE_ENGLISH_CHECKS.some(f => relativePath === f);


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

            // C. Double slash separated by spaces: "/ /"
            if (/\/\s+\//.test(lineWithoutLinks)) {
                errors.push('Double slash with spaces detected (e.g. "/ /")');
            }
        }



        // Check 9: Adjacent links without separator (e.g. "Text [Link]" instead of "Text / [Link]")
        const FILES_TO_IGNORE_LINK_SEPARATOR_CHECK = [
            'docs/beginners-guide.md',
            'docs/unsafe.md'
        ];

        if (!FILES_TO_IGNORE_LINK_SEPARATOR_CHECK.some(ignoredFile => file.endsWith(ignoredFile))) {
            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
            let match;
            while ((match = linkRegex.exec(line)) !== null) {
                const index = match.index;
                if (index === 0) continue;

                const preceding = line.slice(0, index);

                // Ignore if line starts with valid list marker followed immediately by this link
                // e.g. "* [Link]" or "- [Link]" or "1. [Link]"
                if (/^\s*([*+-]|\d+\.)\s*$/.test(preceding)) continue;
                // Ignore if Starred item "* ⭐ [Link]"
                if (/^\s*[*+-]\s+⭐\s*$/.test(preceding)) continue;
                // Ignore if link is preceded by bold/italic markers only (start of line)
                if (/^\s*[*+-]\s+[*_]+\s*$/.test(preceding)) continue;

                const trimmedPreceding = preceding.trimEnd();
                if (trimmedPreceding.length === 0) continue;

                // Check last character
                const lastChar = trimmedPreceding.slice(-1);
                // Allowed: separators, openers, end of sentences
                // ! for images (![Alt]), * for bold, ( for parens, etc.
                const allowedChars = ['/', '-', ',', '(', '&', '>', ':', '|', '*', '!', '.', '?', ';', '_', '⭐', '+', '#', '►', '▷'];
                if (allowedChars.includes(lastChar)) continue;

                // Check for allowed functional words (prepositions, conjunctions, determiners, etc.)
                // to avoid flagging sentences like "Try a [VPN]" or "Use [Adblock]"
                const allowedWords = [
                    'or', 'and',
                    'a', 'an', 'the',
                    'use', 'using', 'via', 'with',
                    'in', 'on', 'at', 'by',
                    'to', 'for', 'from',
                    'check', 'see', 'try',
                    'requires', 'including', 'includes',
                    'that', 'your', 'our',
                    'of', 'about', 'their', 'join', 'getting', 'most',
                    'like', 'every', 'being', 'mostly', 'highly', 'up', 'we', 'optionally'
                ];
                const wordRegex = new RegExp(`(^|[^a-zA-Z0-9])(${allowedWords.join('|')})$`, 'i');
                if (wordRegex.test(trimmedPreceding)) continue;

                errors.push(`Missing separator before link (expected "/", "or", ",", etc): "...${preceding.slice(-10)}[${match[1]}]..."`);
            }
        }

        // Check 10, 11, 12: English-specific checks (Repeated words, Typos, Grammar)
        if (!isSeparatedEnglishCheck) {
            // Prepare clean line for text-based checks (remove URLs and Markdown links)
            // Remove entire link block: [Text](Url) -> " "
            const lineCleaned = line.replace(/https?:\/\/[^\s)]+/g, '')
                .replace(/\[[^\]]+\]\([^)]*\)/g, ' ');

            // Check 10: Repeated words (e.g. "the the")
            const repeatedWordMatch = lineCleaned.match(/\b([a-zA-Z]+)\s+\1\b/i);
            if (repeatedWordMatch) {
                errors.push(`Repeated word detected: "${repeatedWordMatch[0]}"`);
            }

            // Check 11: Common Typos
            // Check 11: Common Typos from CSV
            // We load this once usually, but here for simplicity we assume 'commonTyposMap' is prepared.
            // Actually, let's just stick to the hardcoded list for now as a fallback,
            // but if the CSV loading logic was added, we would use it.
            // Since we are inside the line loop, we shouldn't load the file here.
            // The loading should happen outside. We will assume 'typosMap' exists.

            if (typeof typosMap !== 'undefined' && typosMap.size > 0) {
                // Unicode-aware split to avoid breaking words like "Română" or "Slovenčina"
                const words = lineCleaned.split(/[^\p{L}0-9']+/u);
                const ALLOWED_TYPOS = [
                    'hong', 'hls', 'troy', 'fami', 'rentry', 'typesafe', 'spritesheet', 'ba',
                    'puyo', 'moo', 'ne', 'nes', 'rg', 'rgshop', 'rgshows',
                    're', 'revanced', 'skipper', 'ste', 'sneedacity', 'rom', 'ide', 'luks', 'cse', 'gameboy',
                    'lan', 'pokemon', 'sa', 'cah', 'rin', 'tx', 'mame'
                ];
                for (const word of words) {
                    const lowerWord = word.toLowerCase();
                    if (typosMap.has(lowerWord) && !ALLOWED_TYPOS.includes(lowerWord)) {
                        errors.push(`Possible typo: "${word}" (should be "${typosMap.get(lowerWord)}")`);
                    }
                }
            } else {
                // Fallback to small list if CSV not loaded
                const commonTypos = {
                    'teh': 'the', 'adn': 'and', 'thier': 'their', 'dont': "don't", 'cant': "can't",
                    'wont': "won't", 'occured': 'occurred', 'seperate': 'separate',
                    'independant': 'independent', 'reccomend': 'recommend', 'recieve': 'receive',
                    'adress': 'address', 'neccessary': 'necessary', 'tring': 'trying', 'availalbe': 'available'
                };
                for (const [typo, correction] of Object.entries(commonTypos)) {
                    const typoRegex = new RegExp(`\\b${typo}\\b`, 'i');
                    if (typoRegex.test(line)) {
                        if (!/http/.test(line)) {
                            errors.push(`Possible typo: "${typo}" (should be "${correction}")`);
                        }
                    }
                }
            }

            // Check 12: Basic A/An Grammar
            const aAnMatch = line.match(/\b(a)\s+([aeio]\w+)/i);
            if (aAnMatch) {
                const word = aAnMatch[2].toLowerCase();
                if (word !== 'one') {
                    errors.push(`Incorrect article "a" usage: "${aAnMatch[0]}" (should be "an")`);
                }
            }

            const anAMatch = line.match(/\b(an)\s+([bcdfVkLmMnNpPqQrRsStTvVwWxXyYzZ]\w+)/i);
            if (anAMatch) {
                const word = anAMatch[2];
                const isAcronym = /^[A-Z0-9]+$/.test(word);
                if (!isAcronym) {
                    errors.push(`Incorrect article "an" usage: "${anAMatch[0]}" (should be "a")`);
                }
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

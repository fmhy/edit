import type { MarkdownRenderer } from 'vitepress'
import { getTooltip } from './tooltips'

export function configureMarkdown(md: MarkdownRenderer) {
  // We use a "core" rule that runs after the inline parsing is finished.
  // This allows us to inspect actual link tokens rather than raw text.
  md.core.ruler.after('inline', 'url-tooltip', (state) => {
    // Iterate through all top-level tokens
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children) continue;

      const children = token.children;

      // Iterate through the inline children (text, links, em, etc.)
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        // 1. Look for the opening of a link
        if (child.type === 'link_open') {
          const href = child.attrGet('href') || '';
          
          // 2. Check if the URL matches your notes path
          // This regex handles various path formats (.md, no extension, etc.)
          const match = href.match(/\.vitepress\/notes\/([\w-]+)(?:\.md)?$/);
          
          if (match) {
            const filename = match[1];
            const item = getTooltip(filename);

            if (item) {
              // 3. Find where the link ends (the link_close token)
              let j = i + 1;
              while (j < children.length && children[j].type !== 'link_close') {
                j++;
              }

              // 4. Generate the replacement HTML
              const icon = item.frontmatter.icon ? `icon="${item.frontmatter.icon}"` : '';
              const title = item.frontmatter.title 
                ? `title="${item.frontmatter.title}"` 
                : `title="${item.id}"`;
              
              const props = `${icon} ${title}`.trim();
              
              // We render the tooltip content here. 
              // Note: md.render is recursive, so it handles markdown inside your note.
              const renderedContent = md.render(item.content);

              // 5. Create a new HTML token to replace the entire link sequence
              const tooltipToken = new state.Token('html_inline', '', 0);
              tooltipToken.content = `<Tooltip ${props}>${renderedContent}</Tooltip>`;

              // Replace the range [link_open, ...text..., link_close] with our new token
              children.splice(i, j - i + 1, tooltipToken);
              
              // Adjust index because we reduced multiple tokens into one
              i = i; 
            }
          }
        }
      }
    }
  });
}
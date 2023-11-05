import { type MarkdownRenderer } from "vitepress";

// FIXME: tasky: possibly write less horror jank?
export function copyableCodePlugin(md: MarkdownRenderer) {
  const decode = (str: string): string => Buffer.from(str, "base64").toString("binary");
  // Save the original rule for backticks
  const defaultRender =
    md.renderer.rules.code_inline ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
    // @ts-expect-error shut the fuck up already I HATE THIS
    if (!env.frontmatter.title || (env.frontmatter.title && !env.frontmatter.title === "base64")) {
      return defaultRender(tokens, idx, options, env, self);
    }
    const token = tokens[idx];
    const content = token.content;
    const buttonHTML = `<button class='base64' onclick="navigator.clipboard.writeText('${decode(
      content,
    )}')"><code>${content}</code></button>`;

    return buttonHTML;
  };
}

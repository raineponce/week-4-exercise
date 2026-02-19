# my-mcp-server

This is a Model Context Protocol (MCP) server that provides three text-formatting tools for Claude Code. Simplify content conversion workflows with automatic HTML generation, URL-friendly slug creation for file titles, and bidirectional HTML-Markdown conversion.

## Installation

1. Clone or download this repository
2. Run `npm install` to install dependencies (`@modelcontextprotocol/sdk`, `zod`)
3. Configure Claude Code to use this server in your `.claude/claude.md`

## Usage Examples

**Convert text to HTML:**
Transforms plain text into valid HTML with escaped characters, markdown heading detection, and paragraph wrapping.

**Create URL slugs:**
Converts "My Blog Post!" → "my-blog-post" automatically handling punctuation, spaces, and accents.

**Convert HTML to Markdown:**
Transforms HTML content to Markdown and saves as a `.md` file with auto-generated filenames.

## Known Limitations

- Nested lists and complex HTML structures may not convert perfectly
- Limited CSS/styling support in HTML-to-Markdown conversion
- File paths use current working directory only

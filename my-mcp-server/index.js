// ─────────────────────────────────────────────────────────────────────────────
// index.js — My First MCP Server
//
// This file creates an MCP (Model Context Protocol) server that Claude Code
// can connect to. It exposes three text-formatting tools that Claude can call
// during a conversation.
//
// HOW IT WORKS:
//   1. Claude Code launches this file as a subprocess via `node index.js`
//   2. The server communicates with Claude over stdin/stdout (StdioServerTransport)
//   3. Claude discovers the available tools and can call them when needed
// ─────────────────────────────────────────────────────────────────────────────

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Create the MCP server
// The name and version show up when Claude lists available MCP servers.
// ─────────────────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "text-formatting-server",
  version: "1.0.0",
});


// ═════════════════════════════════════════════════════════════════════════════
// TOOL 1: format_for_html
//
// Takes plain text and produces valid HTML.
// - Escapes special characters (&, <, >, ", ') so they render correctly
// - Detects markdown-style headings (# H1, ## H2, etc.) and converts them
// - Wraps everything else in <p> tags with <br> between lines
// ═════════════════════════════════════════════════════════════════════════════
server.tool(
  // Tool name — what Claude calls it
  "format_for_html",

  // Description — helps Claude understand when to use this tool
  "Takes plain text and formats it to HTML with escaped special characters and proper HTML elements (headings, paragraphs, line breaks).",

  // Input schema — defines what arguments this tool accepts, using Zod for validation
  {
    text: z.string().describe("The plain text to convert into HTML"),
  },

  // Handler — the function that runs when Claude calls this tool
  async ({ text }) => {

    // Escape characters that have special meaning in HTML.
    // Without escaping, characters like < or & would break the HTML.
    function escapeHtml(str) {
      return str
        .replace(/&/g, "&amp;")   // & must come first to avoid double-escaping
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const lines = text.split("\n");
    const output = [];
    let inParagraph = false; // track whether we're inside an open <p> tag

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Check for markdown-style headings: # H1, ## H2, up to ###### H6
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Close any open paragraph before inserting a heading
        if (inParagraph) {
          output.push("</p>");
          inParagraph = false;
        }
        const level = headingMatch[1].length;           // number of # symbols
        const headingText = escapeHtml(headingMatch[2]);
        output.push(`<h${level}>${headingText}</h${level}>`);

      } else if (line === "") {
        // Blank line = end of a paragraph
        if (inParagraph) {
          output.push("</p>");
          inParagraph = false;
        }

      } else {
        // Regular text line
        if (!inParagraph) {
          // Start a new paragraph
          output.push("<p>");
          inParagraph = true;
        } else {
          // We're already in a paragraph — add a line break between lines
          output.push("<br>");
        }
        output.push(escapeHtml(line));
      }
    }

    // If the text ended without a blank line, close the last paragraph
    if (inParagraph) {
      output.push("</p>");
    }

    const html = output.join("\n");

    // Return the result — MCP tools always return a `content` array
    return {
      content: [{ type: "text", text: html }],
    };
  }
);


// ═════════════════════════════════════════════════════════════════════════════
// TOOL 2: slugify_title
//
// Converts a human-readable title into a URL-friendly "slug".
// Example: "Hello, World! (2024)" → "hello-world-2024"
//
// Steps:
//   1. Lowercase everything
//   2. Normalize accented characters (é → e)
//   3. Remove punctuation and symbols
//   4. Replace spaces and underscores with dashes
//   5. Collapse multiple dashes into one
// ═════════════════════════════════════════════════════════════════════════════
server.tool(
  "slugify_title",

  "Takes a title string and returns a URL-friendly slug: lowercase, no punctuation, words joined by dashes. Example: 'My Blog Post!' → 'my-blog-post'",

  {
    title: z.string().describe("The title to convert into a URL-friendly slug"),
  },

  async ({ title }) => {
    const slug = title
      .toLowerCase()                     // "Hello World" → "hello world"
      .normalize("NFD")                  // decompose accented letters: é → e + accent mark
      .replace(/[\u0300-\u036f]/g, "")   // remove the detached accent marks
      .replace(/[^a-z0-9\s-]/g, "")     // delete anything that isn't a letter, digit, space, or dash
      .trim()                            // remove leading/trailing whitespace
      .replace(/[\s_]+/g, "-")           // spaces and underscores become dashes
      .replace(/-+/g, "-");              // collapse "---" into "-"

    return {
      content: [{ type: "text", text: slug }],
    };
  }
);


// ═════════════════════════════════════════════════════════════════════════════
// TOOL 3: html_to_markdown
//
// Converts an HTML string to Markdown and saves it as a .md file.
// The filename is derived from the provided title (slugified automatically).
// The file is saved in whatever directory Claude Code is currently running in.
//
// Supported HTML elements:
//   Headings (h1–h6), paragraphs, bold, italic, inline code, code blocks,
//   links, images, unordered lists, ordered lists, blockquotes, hr, br
// ═════════════════════════════════════════════════════════════════════════════
server.tool(
  "html_to_markdown",

  "Converts an HTML string to Markdown and saves it as a .md file in the current working directory. The filename is based on the provided title.",

  {
    html:  z.string().describe("The HTML content to convert to Markdown"),
    title: z.string().describe("Title for the output file — used to generate the filename"),
  },

  async ({ html, title }) => {
    let md = html;

    // ── Block-level elements ───────────────────────────────────────────────

    // Headings: <h1>Text</h1> → # Text
    for (let i = 1; i <= 6; i++) {
      const hashes = "#".repeat(i);
      md = md.replace(
        new RegExp(`<h${i}[^>]*>([\\s\\S]*?)<\\/h${i}>`, "gi"),
        (_, content) => `${hashes} ${stripTags(content).trim()}\n`
      );
    }

    // Paragraphs: <p>Text</p> → Text\n\n
    md = md.replace(
      /<p[^>]*>([\s\S]*?)<\/p>/gi,
      (_, content) => `${stripTags(content).trim()}\n\n`
    );

    // Blockquotes: <blockquote>Text</blockquote> → > Text
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
      return stripTags(content).trim().split("\n").map(l => `> ${l}`).join("\n") + "\n\n";
    });

    // Code blocks: <pre><code>...</code></pre> → ``` ... ```
    md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, content) => {
      return "```\n" + unescapeHtml(content).trim() + "\n```\n\n";
    });

    // Unordered lists: <ul><li>Item</li></ul> → - Item
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi,
        (_, item) => `- ${stripTags(item).trim()}\n`
      );
    });

    // Ordered lists: <ol><li>Item</li></ol> → 1. Item
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
      let counter = 0;
      return content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, item) => {
        counter++;
        return `${counter}. ${stripTags(item).trim()}\n`;
      });
    });

    // Horizontal rule: <hr> → ---
    md = md.replace(/<hr[^>]*\/?>/gi, "---\n\n");

    // Line breaks: <br> → newline
    md = md.replace(/<br[^>]*\/?>/gi, "\n");

    // ── Inline elements ────────────────────────────────────────────────────

    // Bold: <strong> or <b> → **text**
    md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi,
      (_, _tag, content) => `**${stripTags(content)}**`
    );

    // Italic: <em> or <i> → *text*
    md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi,
      (_, _tag, content) => `*${stripTags(content)}*`
    );

    // Inline code: <code>text</code> → `text`
    md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi,
      (_, content) => "`" + unescapeHtml(content) + "`"
    );

    // Links: <a href="url">text</a> → [text](url)
    md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_, href, content) => `[${stripTags(content)}](${href})`
    );

    // Images: <img src="url" alt="text"> → ![text](url)
    // Handle both attribute orders
    md = md.replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi,
      (_, src, alt) => `![${alt}](${src})`
    );
    md = md.replace(/<img[^>]+alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi,
      (_, alt, src) => `![${alt}](${src})`
    );

    // ── Cleanup ────────────────────────────────────────────────────────────

    // Strip any remaining HTML tags we didn't handle
    md = md.replace(/<[^>]+>/g, "");

    // Convert HTML entities back to readable characters
    md = unescapeHtml(md);

    // Trim the result and collapse 3+ blank lines down to 2
    md = md.replace(/\n{3,}/g, "\n\n").trim();

    // ── Save the file ──────────────────────────────────────────────────────

    // Build a slug from the title to use as the filename
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-");

    const filename = `${slug}.md`;

    // process.cwd() returns the directory where Claude Code was launched —
    // this is the folder where the .md file will be created
    const filePath = path.join(process.cwd(), filename);

    fs.writeFileSync(filePath, md, "utf8");

    return {
      content: [
        {
          type: "text",
          text: `File saved successfully!\n\nFilename : ${filename}\nLocation : ${filePath}\n\n${"─".repeat(40)}\n${md}`,
        },
      ],
    };
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Helper functions (used by html_to_markdown)
// ─────────────────────────────────────────────────────────────────────────────

// Remove all HTML tags from a string, leaving only the inner text
function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
}

// Convert common HTML entities back to their plain-text characters
function unescapeHtml(str) {
  return str
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, " ");
}


// ─────────────────────────────────────────────────────────────────────────────
// Connect the server to Claude Code via standard input/output
//
// StdioServerTransport lets Claude Code launch this file as a subprocess and
// communicate with it over stdin/stdout — no network or ports needed.
// ─────────────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

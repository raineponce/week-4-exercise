// test.js — MCP Server Test Script
//
// Spawns the MCP server as a subprocess and uses the MCP Client SDK
// to call each of the three tools and print the results.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["index.js"],
});

const client = new Client({ name: "test-client", version: "1.0.0" });

await client.connect(transport);

// ── List available tools ───────────────────────────────────────────────────
const { tools } = await client.listTools();
console.log("=== Available Tools ===");
for (const tool of tools) {
  console.log(`  • ${tool.name}: ${tool.description}`);
}
console.log();

// ── Tool 1: format_for_html ────────────────────────────────────────────────
console.log("=== Test 1: format_for_html ===");
const htmlResult = await client.callTool({
  name: "format_for_html",
  arguments: {
    text: "# Welcome\n\nHello, <World>! This is a test.\nSecond line.\n\n## Section\n\nText with & ampersand.",
  },
});
console.log("Input:\n  # Welcome\n  \n  Hello, <World>! This is a test.\n  Second line.\n  \n  ## Section\n  \n  Text with & ampersand.");
console.log("\nOutput:");
console.log(htmlResult.content[0].text);
console.log();

// ── Tool 2: slugify_title ──────────────────────────────────────────────────
console.log("=== Test 2: slugify_title ===");
const cases = [
  "Hello, World! (2024)",
  "My Blog Post!",
  "Café au Lait -- A Recipe",
  "   Multiple   Spaces   Here   ",
];
for (const title of cases) {
  const slugResult = await client.callTool({
    name: "slugify_title",
    arguments: { title },
  });
  console.log(`  "${title}" → "${slugResult.content[0].text}"`);
}
console.log();

// ── Tool 3: html_to_markdown ───────────────────────────────────────────────
console.log("=== Test 3: html_to_markdown ===");
const sampleHtml = `<h1>My Test Post</h1>
<p>This is a <strong>bold</strong> statement with some <em>italic</em> text.</p>
<p>Here is a <a href="https://example.com">link</a> and some <code>inline code</code>.</p>
<ul>
  <li>Item one</li>
  <li>Item two</li>
  <li>Item three</li>
</ul>
<blockquote>This is a blockquote.</blockquote>`;

const mdResult = await client.callTool({
  name: "html_to_markdown",
  arguments: {
    html: sampleHtml,
    title: "My Test Post",
  },
});
console.log(mdResult.content[0].text);

await client.close();

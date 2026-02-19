# Process Documentation

## What I Built

I created a simple MCP server that provides three text-formatting tools: `format_for_html`, `slugify_title`, and `html_to_markdown`. The server enables Claude Code to manipulate text across different formats, converting plain text to HTML, creating URL-friendly slugs, and converting between HTML and Markdown.

I designed these tools around text manipulation tasks I've needed to do multiple times when working between regular text and code. Rather than building something overly complex, I focused on practical conversions that come up in real-world workflows: preparing text for web content, generating clean filenames, and converting between markup formats.

## How Claude Code Helped

Effective prompts:
- "claude mcp remove my-mcp-server && claude mcp add my-mcp-server node
      'C:\Users\Raine\Desktop\school\2026 Spring\DIG4503 - low no code
      dev\week-4-exercise\my-mcp-server\index.js"
  - Helped the MCP server get properly configured, offering to look into different files when 'claude mcp list' was producing no output, which helped me see the incorrect file path.
- ""format_for_html" - Takes provided plain text (string) and formats it to HTML-friendly format (string) with escaped special characters and properly formatted elements (headings, paragraphs, etc.)."
  - Despite my prompt lacking specificity and only outlining desired input and output, Claude Code did well with creating necessary functions and adding additional functionality to account for edge cases.

## Debugging Journey

The main bug I encountered involved getting the MCP server to get properly registered in Claude Code. My main mistake involved not writing out the full absolute path to index.js and simply writing index.js. Claude Code helped facilitate debugging by quickly identifying that there was no MCP server configured, and I would need to run 'claude mcp add' which was a crucial step I had skipped. Even after that, the MCP server was not showing, and iterating with Claude helped me realize my file path error.

## How MCP Works

The Model Context Protocol allows Claude Code to use custom tools defined in a separate server. My server provides three functions that Claude can call. The `format_for_html` tool takes plain text and converts it into proper HTML, handling special characters and formatting. The `slugify_title` tool transforms titles into clean URL-friendly versions by removing punctuation and converting spaces to dashes. The `html_to_markdown` tool does the reverse, taking HTML and converting it to Markdown, then saves the file automatically. When Claude encounters a task that needs one of these conversions, it sends a request to the server, the appropriate function runs, and the result gets sent back. This happens seamlessly during conversation, making it feel like Claude has these text-manipulation abilities built in.

## What I'd Do Differently

I would start earlier in the week to give myself more time to delve into creating more specific functions within a given tool. Reading through the Model Context Protocol documentation and examining more example servers before building my own would have saved debugging time. I also spent considerable time adjusting the CodeTour to fully understand each step, which was valuable but something I would allocate more deliberate time for in a future project. Starting with a clearer understanding of the underlying architecture would have made the implementation smoother.

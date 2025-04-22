# Linear MCP Server

This project provides an MCP server for interacting with the Linear API, enabling integration with MCP clients like Cline, IDE extensions, and other AI tools. It provides tools for managing Linear issues, projects, and teams via the Model Context Protocol.

This package is available on npm: [linear-mcp-integration](https://www.npmjs.com/package/linear-mcp-integration)

**Current Status:**
*   Personal Access Token (PAT) authentication is implemented and tested.
*   Core functionality for managing issues, projects, teams, and users via PAT has been tested.
*   OAuth 2.0 flow exists in the code but is **untested and likely non-functional**.

## Setup Guide

### 1. Authentication (Required)

This server **requires** a **Linear Personal Access Token (PAT)**.

1.  Go to your Linear workspace settings: **Account > Security & access**.
2.  Under the **Personal API keys** section, click **New API key**.
3.  Give the key a descriptive label (e.g., "MCP Server Key").
4.  Copy the generated key immediately (it won't be shown again).
5.  You will need to provide this key to the server using the `LINEAR_ACCESS_TOKEN` environment variable when running it (see Step 2).

### 2. Running the Server

You can run the server directly using `npx` without cloning the repository, or install it globally.

**Option A: Using `npx` (Recommended)**

This method runs the server directly from the npm registry without global installation. Configure your MCP client (like Cline, Cursor, Claude, etc) to run the server using `npx` and pass the PAT via environment variables:

```json
// Example MCP Client Configuration (e.g., Cline, Cursor, Claude)
{
  "mcpServers": {
    "linear": {
      "command": "npx", 
      "args": ["linear-mcp-integration"], 
      "env": {
        "LINEAR_ACCESS_TOKEN": "lin_api_your_personal_access_token"
      }
    }
  }
}
```

**Option B: Global Installation (Less Common)**

If you prefer, you can install the package globally:

```bash
npm install -g linear-mcp-integration
```

Then, you can run it directly from your terminal (you still need to provide the environment variable):

```bash
LINEAR_ACCESS_TOKEN=lin_api_your_token linear-mcp-integration
```

*(Note: Global installation is generally less preferred for server processes unless you have a specific need.)*

### 3. Authentication Methods Details

*   **Personal Access Token (PAT) - Required & Tested:** This is the primary and tested authentication method. Follow the steps in Section 1.
*   **OAuth Flow (Untested / Non-Functional):** The code includes handlers for OAuth (`linear_auth`, `linear_auth_callback`), but this flow has **not been tested** and requires further development to be considered functional. Contributions welcome!

## Available Tools

The server currently supports the following tools (tested with PAT authentication unless noted):

*   **Authentication (OAuth - Untested):**
    *   `linear_auth`: Initiate OAuth flow (Untested)
    *   `linear_auth_callback`: Handle OAuth callback (Untested)
*   **Issues:**
    *   `linear_create_issue`: Create a single issue.
    *   `linear_create_issues`: Create multiple issues in bulk.
    *   `linear_search_issues`: Search issues (filter by title currently).
    *   `linear_delete_issue`: Delete a single issue.
*   **Projects:**
    *   `linear_create_project_with_issues`: Create a project and associated issues.
    *   `linear_get_project`: Get project details by ID.
    *   `linear_search_projects`: Search projects by *exact* name match.
*   **Teams:**
    *   `linear_get_teams`: Get details for all teams.
*   **Users:**
    *   `linear_get_user`: Get information about the authenticated user.

*(Note: Bulk delete and bulk update functionality has been removed.)*

## Development (For Contributors)

If you want to contribute to the server development:

```bash
# Clone the repository
# git clone https://github.com/touchlab/linear-mcp-integration.git
# cd linear-mcp-integration

# Install dependencies
npm install

# Build the server
npm run build

# Start the server (requires LINEAR_ACCESS_TOKEN in .env or environment)
npm start

# Tests are not currently configured
# npm test 
# npm run test:integration 
```

## Contributing

This fork of [Cline's version](https://github.com/cline/linear-mcp) is maintained by [Touchlab](https://github.com/touchlab).

**Contributions are welcome, especially for improving or fully implementing the OAuth 2.0 flow.** Please feel free to open issues or pull requests on the [touchlab/linear-mcp-integration](https://github.com/touchlab/linear-mcp-integration) repository.

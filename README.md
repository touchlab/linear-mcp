# Linear MCP Server (Fork)

This project is a **fork** of the original Linear MCP server implementation from [cline/linear-mcp](https://github.com/cline/linear-mcp). It is currently under **active refactoring, development, and testing**.

This server provides a set of tools for managing Linear issues, projects, and teams via the Model Context Protocol.

**Current Status:**
*   Personal Access Token (PAT) authentication is implemented and tested.
*   Core functionality for managing issues, projects, teams, and users via PAT has been tested.
*   OAuth 2.0 flow exists in the code but is **untested and likely non-functional**.

## Setup Guide

### 1. Environment Setup

1.  Clone this repository (`touchlab/linear-mcp-integration`).
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env` (optional, for local environment variable management):
    ```bash
    cp .env.example .env
    ```

### 2. Authentication

This server **requires** a **Personal Access Token (PAT)** for authentication.

#### Personal Access Token (PAT) - Required & Tested

1.  Go to your Linear workspace settings: **Settings > API**.
2.  Under the **Personal API keys** section, click **Create key**.
3.  Give the key a descriptive label (e.g., "MCP Server Key").
4.  Copy the generated key immediately (it won't be shown again).
5.  Provide this key to the server using the `LINEAR_ACCESS_TOKEN` environment variable:
    *   **Option A: Using `.env` file (for local development)**
        Add the following line to your `.env` file in the project root:
        ```
        LINEAR_ACCESS_TOKEN=lin_api_your_personal_access_token
        ```
    *   **Option B: Using MCP Client Configuration (Recommended)**
        Set the environment variable directly in your MCP client's configuration for this server (see Cline example below).

#### OAuth Flow (Untested / Non-Functional)

The code includes handlers for OAuth (`linear_auth`, `linear_auth_callback`), but this flow has **not been tested** and requires further development to be considered functional. If you wish to experiment or contribute to implementing OAuth:

1.  You would need to create an OAuth application in Linear.
2.  Configure the necessary environment variables (`LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`, `LINEAR_REDIRECT_URI`).
3.  Potentially disable PAT authentication.
4.  Test and likely debug the existing OAuth handlers and the `@linear/sdk` token exchange process.

### 3. Running the Server

1.  Build the server:
    ```bash
    npm run build
    ```
2.  Start the server (ensure `LINEAR_ACCESS_TOKEN` is available in the environment):
    ```bash
    npm start 
    # Or: LINEAR_ACCESS_TOKEN=your_token npm start
    # Or rely on .env file or client configuration
    ```

### 4. Cline Integration Example

1.  Open your MCP settings file.
2.  Add or update the Linear MCP server configuration:
    ```json
    {
      "mcpServers": {
        "linear": {
          "command": "node",
          "args": ["/path/to/your/linear-mcp-integration/build/index.js"], // Update path!
          "env": {
            "LINEAR_ACCESS_TOKEN": "lin_api_your_personal_access_token"
          },
          "disabled": false,
          "autoApprove": [] // Configure as needed
        }
      }
    }
    ```

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

## Development

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Start the server (requires LINEAR_ACCESS_TOKEN)
npm start

# Tests are not currently configured
# npm test 
# npm run test:integration 
```

## Contributing

This fork is currently maintained by [Touchlab](https://github.com/touchlab).

**Contributions are welcome, especially for improving or fully implementing the OAuth 2.0 flow.** Please feel free to open issues or pull requests on the [touchlab/linear-mcp-integration](https://github.com/touchlab/linear-mcp-integration) repository.

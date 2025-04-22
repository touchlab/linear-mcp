# Linear MCP Server (Fork)

A fork of an MCP server for interacting with Linear's API. This server provides a set of tools for managing Linear issues, projects, and teams via the Model Context Protocol.

## Setup Guide

### 1. Environment Setup

1.  Clone this repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy `.env.example` to `.env` (optional, for local environment variable management):
    ```bash
    cp .env.example .env
    ```

### 2. Authentication

This server **requires** a **Personal Access Token (PAT)** for authentication. OAuth 2.0 flow is present in the code but is untested and likely non-functional.

#### Personal Access Token (PAT) - Required & Recommended

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
    *   **Option B: Using MCP Client Configuration (Recommended for tools like Cline)**
        Set the environment variable directly in your MCP client's configuration for this server (see Cline example below).

#### OAuth Flow (Untested / Non-Functional)

The code includes handlers for OAuth, but this flow has not been tested and may not work correctly. If you wish to experiment, you would need to:

1.  Create an OAuth application at https://linear.app/settings/api/applications
2.  Configure OAuth environment variables (e.g., in `.env` or client config):
    ```
    LINEAR_CLIENT_ID=your_oauth_client_id
    LINEAR_CLIENT_SECRET=your_oauth_client_secret
    LINEAR_REDIRECT_URI=http://localhost:3000/callback # Or your configured URI
    ```
3.  Potentially remove the `LINEAR_ACCESS_TOKEN` variable to prevent PAT default.
4.  Invoke the `linear_auth` and `linear_auth_callback` tools.

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

1.  Open your Cline MCP settings file (paths vary by OS, check Cline docs).
2.  Add or update the Linear MCP server configuration, ensuring the `LINEAR_ACCESS_TOKEN` is provided in the `env` section:
    ```json
    {
      "mcpServers": {
        "linear": {
          "command": "node",
          "args": ["/path/to/your/linear-mcp/build/index.js"], // Update path!
          "env": {
            "LINEAR_ACCESS_TOKEN": "lin_api_your_personal_access_token"
          },
          "disabled": false,
          "autoApprove": []
        }
      }
    }
    ```

## Available Tools

The server currently supports the following tools:

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

# Run tests (if configured)
# npm test 
# npm run test:integration 
```

## Contributing

This is a fork, and contributions specific to this version should be directed accordingly (e.g., via pull requests to this repository if applicable).

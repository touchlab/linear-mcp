#!/usr/bin/env node
// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  // CallToolRequestSchema,
  ErrorCode,
  // ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
// import { LinearAuth } from './auth.js';
// import { LinearGraphQLClient } from './graphql/client.js';
// import { HandlerFactory } from './core/handlers/handler.factory.js';
// import { toolSchemas } from './core/types/tool.types.js';

// --- Start: Echo Server Example ---
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod"; // Make sure zod is installed: npm install zod

import { LinearAuth } from './auth.js';
import { LinearGraphQLClient } from './graphql/client.js';
import { HandlerFactory } from './core/handlers/handler.factory.js';
// We don't need the old toolSchemas anymore
// import { toolSchemas } from './core/types/tool.types.js'; 

async function runLinearServer() {
  console.error('Starting Linear MCP server using McpServer...');

  // --- Initialize Auth and GraphQL Client --- 
  const auth = new LinearAuth();
  let graphqlClient: LinearGraphQLClient | undefined;

  // Log and Initialize with PAT if available
  const accessToken = process.env.LINEAR_ACCESS_TOKEN;
  console.error(`[DEBUG] LINEAR_ACCESS_TOKEN: ${accessToken ? '***' : 'undefined'}`); // Avoid logging token
  if (accessToken) {
    try {
      auth.initialize({
        type: 'pat',
        accessToken
      });
      graphqlClient = new LinearGraphQLClient(auth.getClient());
      console.error('Linear Auth initialized with PAT.');
    } catch (error) {
      console.error('[ERROR] Failed to initialize PAT auth:', error);
      // Allow server to start, but tools requiring auth will fail
    }
  } else {
      console.error('LINEAR_ACCESS_TOKEN not set. Tools requiring auth will fail until OAuth flow is completed (if implemented).');
  }

  // --- Initialize Handler Factory ---
  // Pass potentially undefined graphqlClient; handlers check auth state internally
  const handlerFactory = new HandlerFactory(auth, graphqlClient); 

  // --- Create McpServer Instance ---
  const server = new McpServer({
    name: "linear-server",
    version: "1.1.0" // Updated version to reflect refactor
  });

  // --- Define Tools using Zod Schemas ---

  // Helper to get handler or throw McpError
  const getHandler = (toolName: string) => {
    try {
      return handlerFactory.getHandlerForTool(toolName);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('No handler found')) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
      }
      // Wrap unexpected factory errors
      throw new McpError(ErrorCode.InternalError, `Error getting handler for ${toolName}: ${error instanceof Error ? error.message : error}`);
    }
  };

  // linear_auth
  server.tool(
    'linear_auth',
    {
      clientId: z.string().describe('Linear OAuth client ID (Untested)'),
      clientSecret: z.string().describe('Linear OAuth client secret'),
      redirectUri: z.string().describe('OAuth redirect URI'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_auth');
      return (handler as any)[method](args);
    }
  );

  // linear_auth_callback
  server.tool(
    'linear_auth_callback',
    {
      code: z.string().describe('OAuth authorization code (Untested)'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_auth_callback');
      return (handler as any)[method](args);
    }
  );

  // linear_create_issue
  server.tool(
    'linear_create_issue',
    {
      title: z.string().describe('Issue title'),
      description: z.string().describe('Issue description'),
      teamId: z.string().describe('Team ID'),
      assigneeId: z.string().describe('Assignee user ID').optional(),
      priority: z.number().describe('Issue priority (0-4)').optional(),
      projectId: z.string().describe('Project ID').optional(),
      createAsUser: z.string().describe('Name to display for the created issue').optional(),
      displayIconUrl: z.string().describe('URL of the avatar to display').optional(),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_create_issue');
      return (handler as any)[method](args);
    }
  );
  
  // linear_create_project_with_issues 
  const issueInputShape = {
      title: z.string().describe('Issue title'),
      description: z.string().describe('Issue description'),
      teamId: z.string().describe('Team ID (must match one of the project teamIds)'),
  };
  server.tool(
    'linear_create_project_with_issues',
    {
      project: z.object({
        name: z.string().describe('Project name'),
        description: z.string().describe('Project description (optional)').optional(),
        teamIds: z.array(z.string()).min(1).describe('Array of team IDs this project belongs to (Required). Use linear_get_teams to get available team IDs.'),
      }),
      issues: z.array(z.object(issueInputShape)).describe('List of issues to create with this project'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_create_project_with_issues');
      return (handler as any)[method](args);
    }
  );

  /* // Remove bulk update tool definition
  // linear_bulk_update_issues
  server.tool(
    'linear_bulk_update_issues',
    {
      issueIds: z.array(z.string()).describe('List of issue IDs to update'),
      update: z.object({ // Nested object definition
        stateId: z.string().describe('New state ID').optional(),
        assigneeId: z.string().describe('New assignee ID').optional(),
        priority: z.number().describe('New priority (0-4)').optional(),
      }),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_bulk_update_issues');
      return (handler as any)[method](args);
    }
  );
  */

  // linear_search_issues
  server.tool(
    'linear_search_issues',
    {
      query: z.string().describe('Search query string').optional(),
      teamIds: z.array(z.string()).describe('Filter by team IDs').optional(),
      assigneeIds: z.array(z.string()).describe('Filter by assignee IDs').optional(),
      states: z.array(z.string()).describe('Filter by state names').optional(),
      priority: z.number().describe('Filter by priority (0-4)').optional(),
      first: z.number().describe('Number of issues to return (default: 50)').optional(),
      after: z.string().describe('Cursor for pagination').optional(),
      orderBy: z.string().describe('Field to order by (default: updatedAt)').optional(),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_search_issues');
      return (handler as any)[method](args);
    }
  );

  // linear_get_teams
  server.tool(
    'linear_get_teams',
    {}, // Empty object for no params
    async (args) => {
      const { handler, method } = getHandler('linear_get_teams');
      return (handler as any)[method](args);
    }
  );

  // linear_get_user
  server.tool(
    'linear_get_user',
    {}, // Empty object for no params
    async (args) => {
      const { handler, method } = getHandler('linear_get_user');
      return (handler as any)[method](args);
    }
  );

  // linear_delete_issue
  server.tool(
    'linear_delete_issue',
    {
      id: z.string().describe('Issue identifier (e.g., ENG-123)'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_delete_issue');
      return (handler as any)[method](args);
    }
  );

  /* // Remove bulk delete tool definition
  // linear_delete_issues
  server.tool(
    'linear_delete_issues',
    {
      ids: z.array(z.string()).describe('List of issue identifiers to delete'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_delete_issues');
      return (handler as any)[method](args);
    }
  );
  */

  // linear_get_project
  server.tool(
    'linear_get_project',
    {
      id: z.string().describe('Project identifier'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_get_project');
      return (handler as any)[method](args);
    }
  );

  // linear_search_projects
  server.tool(
    'linear_search_projects',
    {
      name: z.string().describe('Project name to search for (exact match)'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_search_projects');
      return (handler as any)[method](args);
    }
  );

  // linear_create_issues
  const createIssueShape = {
      title: z.string().describe('Issue title'),
      description: z.string().describe('Issue description'),
      teamId: z.string().describe('Team ID'),
      assigneeId: z.string().describe('Assignee user ID').optional(),
      priority: z.number().describe('Issue priority (0-4)').optional(),
      projectId: z.string().describe('Project ID').optional(),
      labelIds: z.array(z.string()).describe('Label IDs to apply').optional()
  };
  server.tool(
    'linear_create_issues',
    {
        issues: z.array(z.object(createIssueShape))
                 .describe('List of issues to create'),
    },
    async (args) => {
      const { handler, method } = getHandler('linear_create_issues');
      return (handler as any)[method](args);
    }
  );

  // --- Handle Process Exit Gracefully ---
  process.on('SIGINT', async () => {
      console.error('SIGINT received, closing server...');
      await server.close();
      process.exit(0);
  });

  // --- Connect and Run Server ---
  try {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error('Linear MCP server running on stdio using McpServer');
  } catch (error) {
      console.error('[FATAL] Failed to connect or run server:', error);
      process.exit(1);
  }
}

// --- Run the Server --- 
runLinearServer().catch(error => {
    console.error('[FATAL] Uncaught error during server execution:', error);
    process.exit(1);
});

/**
 * Main server class that handles MCP protocol interactions.
 * Delegates tool operations to domain-specific handlers.
 */
/* // Commented out original LinearServer
class LinearServer {
  private server: Server;
  private auth: LinearAuth;
  private graphqlClient?: LinearGraphQLClient;
  private handlerFactory: HandlerFactory;

  constructor() {
    this.server = new Server(
      {
        name: 'linear-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.auth = new LinearAuth();
    
    // Log the environment variable to check if it's being passed correctly
    console.error(`[DEBUG] LINEAR_ACCESS_TOKEN: ${process.env.LINEAR_ACCESS_TOKEN}`);

    // Initialize with PAT if available
    const accessToken = process.env.LINEAR_ACCESS_TOKEN;
    if (accessToken) {
      this.auth.initialize({
        type: 'pat',
        accessToken
      });
      this.graphqlClient = new LinearGraphQLClient(this.auth.getClient());
    }
    
    // Initialize handler factory
    this.handlerFactory = new HandlerFactory(this.auth, this.graphqlClient);
    
    this.setupRequestHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupRequestHandlers() {
    

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.values(toolSchemas),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
      // try {
      //   const { handler, method } = this.handlerFactory.getHandlerForTool(request.params.name);
      //   // Use type assertion to handle dynamic method access
      //   return await (handler as any)[method](request.params.arguments);
      // } catch (error) {
      //   if (error instanceof Error && error.message.startsWith('No handler found')) {
      //     throw new McpError(
      //       ErrorCode.MethodNotFound,
      //       `Unknown tool: ${request.params.name}`
      //     );
      //   }
      //   throw error;
      // }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Linear MCP server running on stdio');
  }
}

const server = new LinearServer();
server.run().catch(console.error);
*/ // End commented out original LinearServer

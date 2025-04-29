import { LinearClient } from '@linear/sdk';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { 
  CreateIssueInput, 
  CreateIssueResponse,
  UpdateIssueInput,
  UpdateIssuesResponse,
  SearchIssuesInput,
  SearchIssuesResponse,
  DeleteIssueResponse,
  IssueBatchResponse,
  Issue
} from '../features/issues/types/issue.types.js';
import {
  ProjectInput,
  ProjectResponse,
  SearchProjectsResponse
} from '../features/projects/types/project.types.js';
import {
  TeamResponse,
  LabelInput,
  LabelResponse
} from '../features/teams/types/team.types.js';
import {
  UserResponse
} from '../features/users/types/user.types.js';

// Import mutations at the top level
import { 
    CREATE_ISSUE_MUTATION,
    CREATE_PROJECT,
    CREATE_BATCH_ISSUES,
    UPDATE_ISSUES_MUTATION,
    DELETE_ISSUE_MUTATION, // Import single delete mutation
    CREATE_ISSUE_LABELS 
} from './mutations.js'; 
import { SEARCH_ISSUES_QUERY, GET_TEAMS_QUERY, GET_USER_QUERY, GET_PROJECT_QUERY, SEARCH_PROJECTS_QUERY } from './queries.js';

// Define the wrapper response type for GetIssue query
interface SingleIssueResponse {
  issue: Issue; // Uses the imported Issue type
}

// Define the query to get a single issue's description
const GET_ISSUE_QUERY = gql`
  query GetIssue($id: String!) {
    issue(id: $id) {
      id
      description
    }
  }
`;

export class LinearGraphQLClient {
  private linearClient: LinearClient;

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
  }

  async execute<T, V extends Record<string, unknown> = Record<string, unknown>>(
    document: DocumentNode,
    variables?: V
  ): Promise<T> {
    const graphQLClient = this.linearClient.client;
    const queryString = document.loc?.source.body || ''; // Get the query string
    
    // Log the query and variables just before execution
    console.error(`[DEBUG] Executing GraphQL:`);
    console.error(`[DEBUG] Query String: ${queryString.substring(0, 200)}...`); // Log truncated query
    console.error(`[DEBUG] Variables: ${JSON.stringify(variables)}`);

    try {
      const response = await graphQLClient.rawRequest(
        queryString, // Use the extracted query string
        variables
      );
      return response.data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`GraphQL operation failed: ${error.message}`);
      }
      throw error;
    }
  }

  // Create single issue
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    return this.execute<CreateIssueResponse>(CREATE_ISSUE_MUTATION, { input: input });
  }

  // Create multiple issues
  async createIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues }
    });
  }

  // Create a project
  async createProject(input: ProjectInput): Promise<ProjectResponse> {
    return this.execute<ProjectResponse>(CREATE_PROJECT, { input });
  }

  // Create batch of issues
  async createBatchIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues }
    });
  }

  // Helper method to create a project with associated issues
  async createProjectWithIssues(projectInput: ProjectInput, issues: CreateIssueInput[]): Promise<ProjectResponse> {
    // Create project first
    const projectResult = await this.createProject(projectInput);
    
    if (!projectResult.projectCreate.success) {
      throw new Error('Failed to create project');
    }

    // Then create issues with project ID
    const issuesWithProject = issues.map(issue => ({
      ...issue,
      projectId: projectResult.projectCreate.project.id
    }));

    const issuesResult = await this.createBatchIssues(issuesWithProject);

    if (!issuesResult.issueBatchCreate.success) {
      throw new Error('Failed to create issues');
    }

    return {
      projectCreate: projectResult.projectCreate,
      issueBatchCreate: issuesResult.issueBatchCreate
    };
  }

  // Update a single issue
  async updateIssue(id: string, input: UpdateIssueInput): Promise<UpdateIssuesResponse> {
    return this.execute<UpdateIssuesResponse>(UPDATE_ISSUES_MUTATION, {
      id: id,
      input,
    });
  }

  // Create multiple labels
  async createIssueLabels(labels: LabelInput[]): Promise<LabelResponse> {
    return this.execute<LabelResponse>(CREATE_ISSUE_LABELS, { labels });
  }

  // Search issues with pagination
  async searchIssues(
    filter: SearchIssuesInput['filter'], 
    first: number = 50, 
    after?: string, 
    orderBy: string = "updatedAt"
  ): Promise<SearchIssuesResponse> {
    return this.execute<SearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
      filter,
      first,
      after,
      orderBy,
    });
  }

  // Get teams with their states and labels
  async getTeams(): Promise<TeamResponse> {
    return this.execute<TeamResponse>(GET_TEAMS_QUERY);
  }

  // Get current user info
  async getCurrentUser(): Promise<UserResponse> {
    return this.execute<UserResponse>(GET_USER_QUERY);
  }

  // Get project info
  async getProject(id: string): Promise<ProjectResponse> {
    return this.execute<ProjectResponse>(GET_PROJECT_QUERY, { id });
  }

  // Search projects
  async searchProjects(filter: { name?: { eq: string } }): Promise<SearchProjectsResponse> {
    return this.execute<SearchProjectsResponse>(SEARCH_PROJECTS_QUERY, { filter });
  }

  // Delete a single issue
  async deleteIssue(id: string): Promise<DeleteIssueResponse> {
    return this.execute<DeleteIssueResponse>(DELETE_ISSUE_MUTATION, { id: id });
  }

  // Method to get a single issue by ID
  async getIssue(id: string): Promise<SingleIssueResponse> {
    return this.execute<SingleIssueResponse>(GET_ISSUE_QUERY, { id });
  }
}

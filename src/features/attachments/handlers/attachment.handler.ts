import { Buffer } from 'buffer';
import * as fs from 'fs'; // Import Node.js File System module
import * as path from 'path'; // Import Node.js Path module
import { LinearAuth } from '../../../auth.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { gql } from 'graphql-tag';
import fetch from 'node-fetch';
import { BaseHandler } from '../../../core/handlers/base.handler.js'; // Import BaseHandler
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js'; // Import BaseToolResponse

// Define the expected header structure from Linear's fileUpload mutation
interface HeaderPayload {
  key: string;
  value: string;
}

// Define the expected nested structure within the fileUpload response based on docs
interface UploadFileDetails {
    uploadUrl: string; // The URL for the PUT request
    assetUrl: string; // The URL to use for linking the attachment
    headers: HeaderPayload[]; // Headers for the PUT request
}

// Define the expected payload structure from Linear's fileUpload mutation
interface FileUploadPayload {
    success: boolean;
    uploadFile?: UploadFileDetails | null; // Changed structure based on docs
    // assetUrl is now nested inside uploadFile
    contentType?: string; // These might not be returned at this level
    filename?: string;
    size?: number;
    // headers are now nested inside uploadFile
}


// Define the expected response structure for the file upload mutation
interface FileUploadResponse {
  fileUpload: FileUploadPayload;
}

// Define input arguments for the handler method
interface AddAttachmentArgs {
  issueId: string;
  filePath: string; // Changed from fileContentBase64
  contentType: string;
  fileName?: string; // Now optional
  title?: string; // Optional title
}

// Define the GraphQL mutation for initiating the file upload based on docs
const FILE_UPLOAD_MUTATION = gql`
  mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
    fileUpload(contentType: $contentType, filename: $filename, size: $size) {
      success # Added success field
      uploadFile { # Nested structure based on docs
        uploadUrl
        assetUrl
        headers { key value }
      }
      # assetUrl # Removed from top level
      # contentType # Likely not needed here
      # filename # Likely not needed here
      # size # Likely not needed here
      # headers { key value } # Moved into uploadFile
    }
  }
`;

/**
 * Handles operations related to Linear attachments.
 */
// Make AttachmentHandler extend BaseHandler
export class AttachmentHandler extends BaseHandler {

  // Call super() in constructor
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Handles adding an attachment to a Linear issue by reading a local file,
   * uploading it, and appending a markdown link to the issue description.
   */
  // Ensure return type matches BaseHandler methods if needed (using BaseToolResponse)
  async handleAddAttachment(args: AddAttachmentArgs): Promise<BaseToolResponse> {
    // Use this.verifyAuth() instead of checking client directly
    // const client = this.graphqlClient!;
    const client = this.verifyAuth(); 
    const { issueId, filePath, contentType, fileName: providedFileName, title: providedTitle } = args;

    // Removed redundant client check
    // if (!client) {
    //     throw new McpError(ErrorCode.InternalError, 'Linear client is not available in AttachmentHandler.');
    // }

    // 1. Read file content (using validateRequiredParams could be added here)
    this.validateRequiredParams(args, ['issueId', 'filePath', 'contentType']);
    let fileBuffer: Buffer;
    let resolvedFileName: string;
    let fileSize: number;
    let finalFileName: string;
    try {
        resolvedFileName = path.basename(filePath);
        fileBuffer = await fs.promises.readFile(filePath);
        fileSize = fileBuffer.length;
        finalFileName = providedFileName || resolvedFileName;
        console.error(`[AttachmentHandler] Read ${fileSize} bytes from ${finalFileName}`);
    } catch (error: any) {
        console.error(`[AttachmentHandler] Error reading file ${filePath}:`, error);
        if (error.code === 'ENOENT') { throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`); }
        if (error.code === 'EACCES') { throw new McpError(ErrorCode.InternalError, `Permission denied reading file: ${filePath}`); }
        // Use BaseHandler error handling
        this.handleError(error, `read file ${filePath}`);
        // throw new McpError(ErrorCode.InternalError, `Failed to read file ${filePath}: ${error.message}`);
    }

    // 2. Get Upload URL from Linear 
    let uploadDetails: UploadFileDetails;
    let assetLinkUrl: string;
    try {
      console.error(`[AttachmentHandler] Requesting upload URL for ${finalFileName} (${fileSize} bytes, ${contentType})...`);
      const uploadResponse = await client.execute<FileUploadResponse>(FILE_UPLOAD_MUTATION, {
          contentType: contentType,
          filename: finalFileName,
          size: fileSize,
      });
      if (!uploadResponse?.fileUpload?.success || !uploadResponse?.fileUpload?.uploadFile?.uploadUrl || !uploadResponse?.fileUpload?.uploadFile?.assetUrl) {
        console.error("[AttachmentHandler] Invalid response from fileUpload mutation:", uploadResponse);
        throw new Error('Failed to get upload URL from Linear.');
      }
      uploadDetails = uploadResponse.fileUpload.uploadFile;
      assetLinkUrl = uploadDetails.assetUrl;
      console.error(`[AttachmentHandler] Received Upload URL: ${uploadDetails.uploadUrl}, Asset URL: ${assetLinkUrl}`);
    } catch (error) {
        // Use BaseHandler error handling
        this.handleError(error, 'request upload URL');
        // console.error("[AttachmentHandler] Error requesting upload URL:", error);
        // throw new McpError(ErrorCode.InternalError, `Failed to get upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Upload File to the received URL
    try {
        console.error(`[AttachmentHandler] Uploading file to ${uploadDetails.uploadUrl}...`);
        const uploadHeaders: Record<string, string> = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000'
        };
        uploadDetails.headers?.forEach((header: HeaderPayload) => {
             if (header?.key && header?.value) { uploadHeaders[header.key] = header.value; }
        });
        const uploadResponse = await fetch(uploadDetails.uploadUrl, { method: 'PUT', headers: uploadHeaders, body: fileBuffer });
        if (!uploadResponse.ok) {
             const errorBody = await uploadResponse.text();
             console.error(`[AttachmentHandler] Upload failed: ${uploadResponse.status}`, errorBody);
             throw new Error(`Upload failed: ${uploadResponse.status}`);
        }
        console.error(`[AttachmentHandler] File uploaded successfully.`);
    } catch (error) {
        // Use BaseHandler error handling
        this.handleError(error, 'upload file');
        // console.error("[AttachmentHandler] Error uploading file:", error);
        // throw new McpError(ErrorCode.InternalError, `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Fetch existing issue description
    let currentDescription = '';
    try {
        console.error(`[AttachmentHandler] Fetching current description for issue ${issueId}...`);
        const issueResponse = await client.getIssue(issueId);
        currentDescription = (issueResponse?.issue as any)?.description || '';
        console.error(`[AttachmentHandler] Fetched current description.`);
    } catch (error) {
         // Use BaseHandler error handling for fetch failure
         this.handleError(error, `fetch description for issue ${issueId}`);
        // console.error("[AttachmentHandler] Error fetching issue description:", error);
        // throw new McpError(ErrorCode.InternalError, `Failed to fetch issue description: ${error.message}`);
    }

    // 5. Append Markdown link and update issue
    try {
        const attachmentTitle = providedTitle || finalFileName;
        const markdownLink = `\n\n![${attachmentTitle}](${assetLinkUrl})\n`;
        const newDescription = currentDescription + markdownLink;

        console.error(`[AttachmentHandler] Updating issue ${issueId} description...`);
        const updateResponse = await client.updateIssue(issueId, { description: newDescription });

        if (!(updateResponse as any)?.issueUpdate?.success && !(updateResponse as any)?.success) {
             console.error("[AttachmentHandler] Failed to update issue description:", updateResponse);
             throw new Error('Issue description update failed after successful file upload.');
        }

        console.error(`[AttachmentHandler] Issue description updated successfully for ${issueId}.`);
        
        // Use createResponse from BaseHandler
        const successMessage = `Attachment uploaded and linked successfully to issue ${issueId}. Asset URL: ${assetLinkUrl}`;
        return this.createResponse(successMessage);

    } catch (error) {
         // Use BaseHandler error handling for update failure
         this.handleError(error, `update description for issue ${issueId}`);
        // console.error("[AttachmentHandler] Error updating issue description:", error);
        // throw new McpError(ErrorCode.InternalError, `Failed to update issue description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 
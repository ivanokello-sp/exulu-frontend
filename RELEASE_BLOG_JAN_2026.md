# Exulu IMP Release: December 2025 - January 2026

**Release Date:** January 10, 2026

We're excited to announce a major platform update bringing significant workflow enhancements, a significantly improved chat experience, and substantial architectural improvements. This release represents our most comprehensive update to date, with a focus on developer productivity, system performance, and user experience.

## VERSIONS

- Backend NPM package: 1.45.0
- Frontend Docker image: latest | 1.27.0
- Frontend NPM package: 

Please make sure you are using the latest compatible frontend and backend versions.

## 🚀 What's New

### Enhanced Workflow Automation

We've significantly enhanced our workflow system with powerful new scheduling and monitoring capabilities:

- **CRON Scheduling**: Automate workflow execution with flexible CRON-based scheduling featuring built-in presets (hourly, daily, weekly, monthly) or custom CRON expressions with cron-validator integration for pattern validation
- **Simplified Workflow Object**: Streamlined workflow schema with direct agent references via UUID, removing unnecessary complexity around ownership, variables, and RBAC fields
- **Run History Tracking**: Comprehensive history view for every workflow execution with full result, error, and metadata inspection
- **Real-time Monitoring**: Live status indicators showing active, completed, and failed workflow runs with instant updates
- **Visual Feedback**: Enhanced UI with status badges, tooltips, and at-a-glance health indicators for better workflow visibility
- **Improved UX**: Added persistent "Save as Workflow" banner in chat interface for easier workflow template creation, and users can now edit individual chat messages that are part of a workflow
- **Workflow Queue Configuration**: Workflows are created using a specific Agent instance. It is now possible to define a queue on an ExuluAgent class (in the new workflows property), which if provided enables you to define concurrency limits (in code) and automated schedules (in the UI and API)

These improvements make it easier than ever to automate recurring tasks and monitor their execution at scale.

### Chat Experience Overhaul

We've completely refactored the chat architecture to deliver a faster, more intuitive conversational experience:

- **Server Components Migration**: Chat pages now leverage Next.js server components for dramatically improved initial load performance
- **Session Auto-creation**: Cleaner flow when starting new conversations with automatic session management
- **Improved Session UI**: Streamlined the Chat Session UI by hiding metadata such as created date and edit options behind hover states
- **Chat Search**: New dedicated search page to find specific messages or sessions across your entire chat history
- **Save as Workflow**: Persistent banner in chat interface making it easy to convert conversations into reusable workflow templates
- **Automatic Citations**: Agents using context search tools now automatically format inline citations with item metadata, chunk IDs, and context references, these are automatically processed, showing citation badges in the chat including a dialog window showing the original chunk the citation references
- **User Personalization**: Enhanced system prompts with user firstname/lastname fields for better agent personalization (configurable via privacy settings)

### Agent & Prompt Management

Managing agents and prompts is now significantly more powerful and organized:

- **Prompt Library**: Browse prompts by tags with grouped category views at `/prompts/[tag]`
- **Agent Prompt Templates Browser**: Intuitive sheet interface for browsing and assigning prompts to agents with folder organization and tag filtering directly from the agent configuration screen
- **Quick Agent Duplication**: Copy existing agents with one click to accelerate agent creation using the new `<entity>CopyOneById` GraphQL mutation
- **Increased Agent Tool Execution Steps**: Extended default agent step count from 2 to 5 across chat and function calling flows for more complex reasoning tasks
- **Enhanced Tool Configuration**: Collapsible categories and search functionality in tool selection
- **Separated Instructions**: Clear distinction between system instructions and custom instructions, now fully exposed in GraphQL schema and shown in the UI if provided

### Knowledge Base Data Processing Architecture

A fundamental refactor of our data processing system improves consistency and reduces complexity:

- **Unified Items Filtering**: New centralized `items-filter.tsx` component provides consistent filtering experience across items list view, embedding job trigger creation, and processor job filter creation with enhanced filter options and real-time result preview
- **Item-level Processing**: Migrated from field-level to item-level processors (`ExuluContextFieldProcessor` → `ExuluContextProcessor`) to reduce complexity
- **Bulk Operations**: Process multiple items at once with new `ProcessItems` GraphQL mutation supporting filter and limit parameters
- **Processor Visibility**: New processors view in the knowledge base section showing configuration details, queue status, and execution history
- **Timestamp Tracking**: added `last_processed_at` field on items for better processing visibility
- **Queue Management Integration**: Direct access to queue controls from processor configuration with configurable timeouts (default: 180s, up to 30 minutes for long operations)
- **Enhanced Concurrency**: Separate worker and queue-level concurrency settings for granular control over job processing
- **Improved Database Pool**: Increased connection pool from 20 to 50 connections with statement timeouts to handle concurrent processor jobs
- **Automatic JSON Handling**: JSON fields now automatically serialize during create and update operations

### Project Context Integration

Agents can now automatically leverage project-specific context for enhanced retrieval capabilities:

- **Project-aware Sessions**: Chat sessions can be associated with projects for contextual tool access with automatic project tool injection
- **Project-scoped Retrieval**: New `createProjectRetrievalTool` enables project-specific information search across multiple contexts with hybrid search and filtering
- **Enhanced Metadata**: Project cards display creation date, character count, and chunk information
- **Automatic Tool Ingestion**: Agents automatically gain access to project-specific retrieval tools when sessions have associated projects
- **Project Caching**: Optimized repeated project queries with intelligent caching mechanisms

### Vector Search & Context System

Major improvements to our semantic search and retrieval capabilities:

- **Adaptive Filtering**: Automatic threshold filtering (60-70% of best match score) removes low-quality results
- **Chunk Expansion**: Configurable option to retrieve surrounding chunks (before/after) for better context continuity
- **Enhanced Hybrid Search**: Improved RRF weighting and scoring with better cosine distance, tsvector, and hybrid cutoff thresholds
- **Increased Capacity**: Maximum retrieval limit increased from 50 to 250 results
- **Improved Text Search**: tsvector search now uses OR logic for better partial matching of technical terms
- **Archive Filtering**: Archived items automatically excluded from all search methods
- **Context Metadata**: New `chunks_count` and `embeddings_updated_at` fields for better visibility
- **Chunk Management**: Added limit parameters to `generateChunks` and `deleteChunks` mutations with proper counting support
- **Direct Search API**: Added search method directly to `ExuluContext` class for easier integration

** Important: 
depending on your current Exulu IMP version you might need to update your database schema to add missing fields. **

### Access Control & Security

Enhanced security and access control mechanisms across the platform:

- **Refined RBAC Logic**: More explicit and maintainable role-based access control with improved conditionals
- **Non-admin Chunk Limits**: Non-super-admins can generate/delete chunks with configurable limits for safety
- **User-scoped File Access**: Proper folder prefixing and user-scoped access control in file upload routes
- **Global File Management**: Enhanced download access control to support both user-scoped and global file access
- **Record Privacy Reset**: Copied records automatically reset to private `rights_mode` with new timestamps
- **Improved Authentication**: Better handling of unauthenticated requests with proper fallback behavior
- **Context-specific Validation**: Enhanced role validation for context-specific operations

## 🔧 Technical Improvements

### Performance & Architecture

- **Next.js 16 Upgrade**: Migrated entire application to Next.js 16 for latest features and performance
- **GraphiQL v4**: Updated to latest GraphiQL version with improved developer experience
- **Server-side Data Fetching**: New `fetchGraphQLServerSide` moves certain fetch operations to server components
- **Optimistic Updates**: Better perceived performance with optimistic UI updates throughout
- **Query Optimization**: Full-text search now uses `ts_rank` instead of `ts_rank_cd` for better performance
- **GraphQL Filter Extensions**: Added `lte` and `gte` operators for Float filter types
- **Eval Worker Scaling**: Increased eval runs queue concurrency from 1 to 10 workers for faster evaluation processing

### Developer Experience

- **Toast Notifications**: Standardized on Sonner library for consistent notification styling
- **Type Safety**: Enhanced TypeScript definitions across agent sessions, items, and workflows
- **Better Error Handling**: Improved API error responses and user-facing error states with proper null value handling in job results
- **S3 Integration**: Simplified bucket handling with slash-based key notation (bucket/key) for better consistency
- **Global File Uploads**: New global file upload support outside user directories with enhanced access control (used primarily for agent visuals)

### UI/UX Polish

- **Navigation Improvements**: Streamlined navigation with better visual hierarchy
- **Layout Refinements**: Fixed numerous spacing and alignment issues across pages
- **Status Indicators**: Consistent status badges and tooltips for better information density

## 🐛 Bug Fixes & Refinements

### Minor Fixes
- Resolved duplicate todo list message rendering
- Fixed command item disabled styling and duplicate keys in tool lists
- Corrected search results layout from multi-column to single-column for readability
- Added automatic data refresh after chunk deletion
- Fixed missing spaces in chat session layout
- Improved retry functionality for embeddings and processor jobs
- Fixed `hasNextPage` logic in pagination queries
- Fixed access control to properly handle unauthenticated requests with super_admin bypass
- Corrected S3 key prefix ordering (user prefix before general prefix) and proper bucket name handling
- Fixed file deletion by properly stripping bucket prefix
- Fixed `created_by` type handling (string vs number) in access control checks
- Fixed eval run deletion to properly clean up associated job_results entries
- Improved chunk deletion safety by checking table existence before deletion
- Fixed image handling in chat API for proper multimodal support

## 🗑️ Cleanup & Deprecations

This release includes significant cleanup to maintain codebase health:

- Removed deprecated `jobs-status-area` component
- Removed obsolete `chat-empty-state` component
- Removed deprecated `agent-nav` component
- Consolidated redundant layout files
- Removed `recent-jobs` component in favor of unified queue management
- Removed deprecated `ExuluDefaultContexts` export
- Deleted unused template contexts (code-standards.ts, outputs.ts)
- Removed hardcoded context registrations from ExuluApp
- Removed excessive debug console.log statements from auth, postgres, and redis clients
- Cleaned up redundant code across multiple modules

## 📊 What's Next

Looking ahead, we're focusing on:

- Advanced workflow conditions and branching
- Enhanced eval capabilities with more flexible test case management
- Real-time collaboration features for shared agents and workflows
- Extended monitoring and observability for production deployments
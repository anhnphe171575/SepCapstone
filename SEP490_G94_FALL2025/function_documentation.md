# Function Documentation - Line Counts and Descriptions

## auth.controller.js

- `computeIsAdmin` (9 lines): <Brief description about requirements which are tested in this function: Determines if a user's role includes admin privileges.>
- `register` (113 lines): <Brief description about requirements which are tested in this function: Registers a new user, hashes password, generates and sends OTP for email verification.>
- `verifyRegistrationOTP` (54 lines): <Brief description about requirements which are tested in this function: Verifies the OTP sent during registration and marks the user's email as verified.>
- `resendRegistrationOTP` (75 lines): <Brief description about requirements which are tested in this function: Generates and resends a new OTP for email verification if the previous one expired or was not received.>
- `login` (65 lines): <Brief description about requirements which are tested in this function: Authenticates a user with email and password, generates a JWT, and provides redirection URL based on role.>
- `googleLogin` (67 lines): <Brief description about requirements which are tested in this function: Authenticates a user via Google ID token, creates a new user if not existing, and generates a JWT.>
- `forgotPassword` (69 lines): <Brief description about requirements which are tested in this function: Initiates password reset by generating an OTP and storing it in Redis, then sending it via email.>
- `verifyOTP` (49 lines): <Brief description about requirements which are tested in this function: Verifies the OTP for password reset, clears it from Redis, and generates a temporary reset token.>
- `resetPassword` (49 lines): <Brief description about requirements which are tested in this function: Resets a user's password using a valid reset token.>
- `changePassword` (49 lines): <Brief description about requirements which are tested in this function: Allows an authenticated user to change their password.>
- `getProfile` (19 lines): <Brief description about requirements which are tested in this function: Retrieves the profile information of the currently authenticated user.>

## user.controller.js

- `parseRole` (23 lines): <Brief description about requirements which are tested in this function: Helper to parse user roles from Excel data, allowing only 'STUDENT' or 'LECTURER'.>
- `normalizeHeader` (10 lines): <Brief description about requirements which are tested in this function: Helper to clean up Excel column headers for mapping.>
- `normalizeExcelRow` (12 lines): <Brief description about requirements which are tested in this function: Helper to apply header mappings to an Excel row.>
- `parseExcelDate` (46 lines): <Brief description about requirements which are tested in this function: Helper to parse various date formats from Excel cells into Date objects.>
- `buildAddress` (14 lines): <Brief description about requirements which are tested in this function: Helper to construct an address array from normalized row data.>
- `generateDefaultPassword` (5 lines): <Brief description about requirements which are tested in this function: Generates a default password based on phone number.>
- `formatRoleName` (13 lines): <Brief description about requirements which are tested in this function: Formats a role enum value into a human-readable string.>
- `getMe` (19 lines): <Brief description about requirements which are tested in this function: Retrieves the profile of the currently authenticated user.>
- `getUserProfile` (17 lines): <Brief description about requirements which are tested in this function: Retrieves a user's profile by ID.>
- `updateProfile` (58 lines): <Brief description about requirements which are tested in this function: Updates the profile of the current user.>
- `getAllUsers` (40 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated and filterable list of all users.>
- `deleteUser` (40 lines): <Brief description about requirements which are tested in this function: Deletes a user, with checks for Admin Developer role and project involvement.>
- `updateUser` (69 lines): <Brief description about requirements which are tested in this function: Updates a user's information, with checks for Admin Developer role and email uniqueness.>
- `getDashboardSupervisor` (117 lines): <Brief description about requirements which are tested in this function: Provides dashboard statistics for a supervisor, including project and task counts, grouped by semester.>
- `getDashboardFeature` (64 lines): <Brief description about requirements which are tested in this function: Provides feature-related dashboard statistics for a supervisor across all their projects.>
- `getDashboardFeatureByProjectId` (64 lines): <Brief description about requirements which are tested in this function: Provides feature-related dashboard statistics for a specific project under a supervisor.>
- `importLecturersFromExcel` (344 lines): <Brief description about requirements which are tested in this function: Imports user data (lecturers/students) from an Excel file, creates new users, and optionally adds them to teams/projects.>
- `exportUsersToExcel` (76 lines): <Brief description about requirements which are tested in this function: Exports user data to an Excel file, with filtering options.>
- `downloadImportTemplate` (69 lines): <Brief description about requirements which are tested in this function: Provides an Excel template for importing user data.>

## function.controller.js

- `listFunctions` (35 lines): <Brief description about requirements which are tested in this function: Lists functions for a given project, optionally filtered by feature ID or status.>
- `listFunctionsByFeature` (12 lines): <Brief description about requirements which are tested in this function: Lists functions belonging to a specific feature.>
- `createFunction` (57 lines): <Brief description about requirements which are tested in this function: Creates a new function, validates input, and logs the activity.>
- `updateFunction` (124 lines): <Brief description about requirements which are tested in this function: Updates an existing function, tracks changes, and logs activity including status changes.>
- `getFunction` (16 lines): <Brief description about requirements which are tested in this function: Retrieves a single function by ID.>
- `deleteFunction` (38 lines): <Brief description about requirements which are tested in this function: Deletes a function and logs the activity.>
- `getFunctionStats` (47 lines): <Brief description about requirements which are tested in this function: Provides statistics for functions within a project (total, completed, in-progress, pending, overdue).>
- `getComments` (17 lines): <Brief description about requirements which are tested in this function: Retrieves comments for a specific function.>
- `addComment` (43 lines): <Brief description about requirements which are tested in this function: Adds a new comment to a function and logs the activity.>
- `updateComment` (19 lines): <Brief description about requirements which are tested in this function: Updates an existing comment on a function.>
- `deleteComment` (19 lines): <Brief description about requirements which are tested in this function: Deletes a comment from a function.>
- `getActivityLogs` (39 lines): <Brief description about requirements which are tested in this function: Retrieves activity logs for a specific function.>
- `listTasks` (20 lines): <Brief description about requirements which are tested in this function: Lists tasks associated with a specific function.>
- `getAttachments` (12 lines): <Brief description about requirements which are tested in this function: Retrieves attachments for a specific function.>
- `addAttachment` (95 lines): <Brief description about requirements which are tested in this function: Adds an attachment (file upload or link) to a function and logs the activity.>
- `deleteAttachment` (67 lines): <Brief description about requirements which are tested in this function: Deletes an attachment from a function and removes the file from Firebase Storage if it's not a link.>

## feature.controller.js

- `getFeature` (13 lines): <Brief description about requirements which are tested in this function: Retrieves a single feature by ID.>
- `listFeatures` (11 lines): <Brief description about requirements which are tested in this function: Lists all features for a given project.>
- `getAllFeaturesByProjectId` (75 lines): <Brief description about requirements which are tested in this function: Retrieves all features for a project, including their associated functions and tasks, using aggregation.>
- `createFeature` (80 lines): <Brief description about requirements which are tested in this function: Creates a new feature, validates dates against project dates, and logs activity.>
- `updateFeature` (148 lines): <Brief description about requirements which are tested in this function: Updates an existing feature, validates dates, and logs detailed activity for changes.>
- `linkMilestones` (18 lines): <Brief description about requirements which are tested in this function: Links multiple milestones to a feature, replacing existing links.>
- `unlinkAllMilestones` (8 lines): <Brief description about requirements which are tested in this function: Removes all milestone links from a feature.>
- `listLinkedMilestones` (9 lines): <Brief description about requirements which are tested in this function: Lists the IDs of milestones linked to a feature.>
- `deleteFeature` (79 lines): <Brief description about requirements which are tested in this function: Deletes a feature, including associated milestones, functions, tasks, and activity logs, with business rule validations.>
- `listCommentsByFeatureId` (14 lines): <Brief description about requirements which are tested in this function: Lists comments for a specific feature.>
- `createCommentByFeatureId` (24 lines): <Brief description about requirements which are tested in this function: Adds a new comment to a feature and logs activity.>
- `listActivityLogs` (18 lines): <Brief description about requirements which are tested in this function: Lists activity logs for a specific feature.>
- `updateCommentByFeatureId` (37 lines): <Brief description about requirements which are tested in this function: Updates a comment on a feature.>
- `deleteCommentByFeatureId` (28 lines): <Brief description about requirements which are tested in this function: Deletes a comment from a feature.>
- `getAttachments` (12 lines): <Brief description about requirements which are tested in this function: Retrieves attachments for a specific feature.>
- `addAttachment` (95 lines): <Brief description about requirements which are tested in this function: Adds an attachment (file upload or link) to a feature and logs activity.>
- `deleteAttachment` (67 lines): <Brief description about requirements which are tested in this function: Deletes an attachment from a feature and removes the file from Firebase Storage if it's not a link.>

## team.controller.js

- `getTeamByProject` (50 lines): <Brief description about requirements which are tested in this function: Retrieves team details for a specific project, including supervisor information.>
- `updateMemberRole` (62 lines): <Brief description about requirements which are tested in this function: Updates a member's role within a team (e.g., promoting to team leader).>
- `inviteMemberByEmail` (240 lines): <Brief description about requirements which are tested in this function: Invites a user to a team via email, handling different roles (lecturer/student) and team size limits.>
- `autoJoinTeamByCode` (202 lines): <Brief description about requirements which are tested in this function: Allows a user to automatically join a team using a team code, handling both student and lecturer roles.>
- `joinTeamByCode` (69 lines): <Brief description about requirements which are tested in this function: Allows an authenticated user to join a team using a team code.>
- `getTeamByCode` (28 lines): <Brief description about requirements which are tested in this function: Retrieves public team information using a team code.>
- `getSupervisorDetail` (53 lines): <Brief description about requirements which are tested in this function: Retrieves detailed information about a project's supervisor.>
- `getMemberDetail` (142 lines): <Brief description about requirements which are tested in this function: Retrieves detailed information about a team member, including assigned tasks, comments, and activities.>
- `removeMember` (69 lines): <Brief description about requirements which are tested in this function: Removes a member from a team, with logic to reassign team leader if the current leader is removed.>

## project.controller.js

- `generateTeamCode` (8 lines): <Brief description about requirements which are tested in this function: Generates a unique 6-character alphanumeric team code.>
- `checkStudentProjectInSemester` (66 lines): <Brief description about requirements which are tested in this function: Checks if a user is already involved in a project (created or member) within the current semester.>
- `getCurrentSemesterInfo` (15 lines): <Brief description about requirements which are tested in this function: Retrieves information about the current academic semester.>
- `listProjects` (85 lines): <Brief description about requirements which are tested in this function: Lists projects the current user is involved in (created by or team member), with status and semester statistics.>
- `getProject` (45 lines): <Brief description about requirements which are tested in this function: Retrieves a single project by ID, safely populating related user fields.>
- `createProject` (187 lines): <Brief description about requirements which are tested in this function: Creates a new project, assigns the creator as leader, creates a new team, and seeds template documents.>
- `updateProject` (38 lines): <Brief description about requirements which are tested in this function: Updates an existing project, with ownership and code uniqueness checks.>
- `deleteProject` (19 lines): <Brief description about requirements which are tested in this function: Deletes a project, with ownership checks.>
- `getProjectDashboard` (99 lines): <Brief description about requirements which are tested in this function: Provides a comprehensive dashboard for a project, including statistics on milestones, features, tasks, and functions.>
- `getProjectContributions` (389 lines): <Brief description about requirements which are tested in this function: Analyzes and returns data for project contribution charts (pie, bar, line) and individual member contributions.>
- `getProjectTeamMembers` (52 lines): <Brief description about requirements which are tested in this function: Lists team members for a project, categorizing them as leaders and members.>
- `seedProjectTemplates` (79 lines): <Brief description about requirements which are tested in this function: Seeds template documents into a project's "Template" folder.>
- `canViewSupervisorProjects` (14 lines): <Brief description about requirements which are tested in this function: Helper to determine if a user has permission to view a supervisor's projects.>
- `fetchProjectsBySupervisorId` (5 lines): <Brief description about requirements which are tested in this function: Helper to fetch projects by supervisor ID.>
- `getProjectsBySupervisor` (26 lines): <Brief description about requirements which are tested in this function: Retrieves projects supervised by a specific lecturer.>
- `getProjectsByMentor` (3 lines): <Brief description about requirements which are tested in this function: Alias for `getProjectsBySupervisor`.>
- `analyzeProjectEffort` (66 lines): <Brief description about requirements which are tested in this function: Analyzes project effort, calculating capacity and validating feature allocation.>
- `suggestFeatureAllocation` (65 lines): <Brief description about requirements which are tested in this function: Suggests feature allocation based on project capacity and features' complexity/priority.>
- `listProjectFunctions` (42 lines): <Brief description about requirements which are tested in this function: Lists all functions belonging to a project.>
- `listProjectMembers` (37 lines): <Brief description about requirements which are tested in this function: Lists all members of a project's team.>
- `getAllProjects` (47 lines): <Brief description about requirements which are tested in this function: Retrieves all projects in the system with statistics.>
- `getProjectChartsOverview` (389 lines): <Brief description about requirements which are tested in this function: Provides a comprehensive overview of project charts including progress timeline, status distribution, effort trends, velocity, completion trends, burndown, and team performance.>
- `getProjectRecentActivities` (19 lines): <Brief description about requirements which are tested in this function: Retrieves recent activity logs for a project.>
- `getProjectUpcomingDeadlines` (79 lines): <Brief description about requirements which are tested in this function: Retrieves upcoming deadlines for tasks, milestones, and functions within a project.>
- `getProjectQuickSummary` (89 lines): <Brief description about requirements which are tested in this function: Provides a quick summary of project statistics, progress, alerts, and effort.>

## milestone.controller.js

- `listMilestones` (8 lines): <Brief description about requirements which are tested in this function: Lists all milestones for a given project.>
- `createMilestone` (134 lines): <Brief description about requirements which are tested in this function: Creates a new milestone, generates a unique code, validates dates against project dates, and optionally links features.>
- `createMilestoneFromFeatures` (129 lines): <Brief description about requirements which are tested in this function: Creates a new milestone by grouping existing features, calculating its dates from them.>
- `updateMilestone` (117 lines): <Brief description about requirements which are tested in this function: Updates an existing milestone, validates dates, and logs activity.>
- `getMilestone` (10 lines): <Brief description about requirements which are tested in this function: Retrieves a single milestone by ID.>
- `listUpdates` (10 lines): <Brief description about requirements which are tested in this function: Lists comments/updates for a specific milestone.>
- `createUpdate` (24 lines): <Brief description about requirements which are tested in this function: Adds a new comment/update to a milestone and logs activity.>
- `listActivityLogs` (10 lines): <Brief description about requirements which are tested in this function: Lists activity logs for a specific milestone.>
- `updateComment` (29 lines): <Brief description about requirements which are tested in this function: Updates a comment on a milestone.>
- `deleteComment` (20 lines): <Brief description about requirements which are tested in this function: Deletes a comment from a milestone.>
- `listFiles` (10 lines): <Brief description about requirements which are tested in this function: Lists files associated with a milestone (Note: Document model doesn't have `milestone_id`).>
- `uploadFile` (37 lines): <Brief description about requirements which are tested in this function: Uploads a file to a milestone (Note: Document model doesn't have `milestone_id`).>
- `exportMilestone` (147 lines): <Brief description about requirements which are tested in this function: Exports milestone data (including linked features, comments, activities) to Excel, CSV, or JSON.>
- `archiveMilestone` (19 lines): <Brief description about requirements which are tested in this function: Placeholder for archiving a milestone (functionality not fully supported by current model).>
- `deleteMilestone` (64 lines): <Brief description about requirements which are tested in this function: Deletes a milestone, including linked features, comments, and activity logs, with dependency checks.>
- `convertToExcel` (118 lines): <Brief description about requirements which are tested in this function: Helper to convert milestone data to Excel format.>
- `convertToCSV` (43 lines): <Brief description about requirements which are tested in this function: Helper to convert milestone data to CSV format.>
- `getMilestoneRules` (10 lines): <Brief description about requirements which are tested in this function: Retrieves milestone business rules.>
- `getMilestoneStatuses` (10 lines): <Brief description about requirements which are tested in this function: Retrieves all available milestone status settings.>
- `getGanttHierarchy` (80 lines): <Brief description about requirements which are tested in this function: Retrieves a hierarchical structure of milestones, features, and functions for Gantt chart filtering.>

## document.controller.js

- `uploadDocument` (173 lines): <Brief description about requirements which are tested in this function: Uploads a new document or a new version of an existing document to Firebase Storage, creates a document record, logs history, and sends notifications.>
- `getDocumentsByProject` (32 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated list of documents for a specific project, with filtering options.>
- `getDocument` (16 lines): <Brief description about requirements which are tested in this function: Retrieves a single document by ID.>
- `updateDocument` (76 lines): <Brief description about requirements which are tested in this function: Updates document metadata (title, version, type, folder_id, file_url), logs changes to history.>
- `updateDocumentStatus` (3 lines): <Brief description about requirements which are tested in this function: Placeholder, indicates status field is no longer supported.>
- `updateFinalRelease` (89 lines): <Brief description about requirements which are tested in this function: Marks or unmarks a document version as the final release, unmarking other versions if a new one is marked, logs history, and sends notifications.>
- `deleteDocument` (43 lines): <Brief description about requirements which are tested in this function: Deletes a document, including its file from Firebase Storage, and logs history.>
- `getDocumentsByMilestone` (3 lines): <Brief description about requirements which are tested in this function: Placeholder, indicates querying by milestone is no longer supported.>
- `searchDocuments` (32 lines): <Brief description about requirements which are tested in this function: Searches for documents within a project, with various filtering options.>
- `getDocumentsByFolder` (32 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated list of documents within a specific folder.>
- `getDocumentDashboard` (186 lines): <Brief description about requirements which are tested in this function: Provides a comprehensive dashboard for documents within a project, including statistics by type, version, folder, top uploaders, upload trends, and recent uploads.>
- `getDocumentActivityLogs` (48 lines): <Brief description about requirements which are tested in this function: Retrieves activity logs (history) for a specific document.>

## meeting.controller.js

- `getMeetingsByProject` (67 lines): <Brief description about requirements which are tested in this function: Retrieves a list of meetings for a specific project, with optional month/year filtering, and access control.>
- `createMeeting` (183 lines): <Brief description about requirements which are tested in this function: Creates a new meeting schedule, validates input, checks for time conflicts, and sets initial status based on the creator's role.>
- `updateMeeting` (167 lines): <Brief description about requirements which are tested in this function: Updates an existing meeting, with restrictions based on status and creator, and checks for time conflicts.>
- `updateMeetingStatus` (46 lines): <Brief description about requirements which are tested in this function: Updates the status of a meeting (approved/rejected), restricted to the project's supervisor.>
- `deleteMeeting` (45 lines): <Brief description about requirements which are tested in this function: Deletes a meeting, restricted to the creator and only if the status is 'pending'.>
- `getMeetingById` (24 lines): <Brief description about requirements which are tested in this function: Retrieves a single meeting by ID.>
- `getAllMeetingsByUser` (134 lines): <Brief description about requirements which are tested in this function: Retrieves all meetings relevant to a user across all projects they are involved in, with date filtering and role-based categorization.>

## message.controller.js

- `getTeamMessages` (69 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated list of messages for a specific team.>
- `sendTeamMessage` (39 lines): <Brief description about requirements which are tested in this function: Sends a new message to a team chat.>
- `getDirectMessages` (79 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated list of direct messages between two users.>
- `sendDirectMessage` (53 lines): <Brief description about requirements which are tested in this function: Sends a direct message between two users, with real-time emission via Socket.io.>
- `markMessageAsRead` (97 lines): <Brief description about requirements which are tested in this function: Marks a message as read by the current user, with real-time updates.>
- `getUnreadCount` (29 lines): <Brief description about requirements which are tested in this function: Retrieves the total unread message count for the current user (team and direct).>
- `getConversations` (89 lines): <Brief description about requirements which are tested in this function: Retrieves a list of direct message conversations for the current user, showing the last message and unread count for each.>

## notification.controller.js

- `createNotification` (38 lines): <Brief description about requirements which are tested in this function: Creates a single notification for a user and emits it in real-time.>
- `createNotificationsForUsers` (23 lines): <Brief description about requirements which are tested in this function: Creates multiple notifications for a list of users.>
- `getNotifications` (39 lines): <Brief description about requirements which are tested in this function: Retrieves a paginated list of notifications for the current user, with filtering and unread count.>
- `getUnreadCount` (17 lines): <Brief description about requirements which are tested in this function: Retrieves the total unread notification count for the current user.>
- `markAsRead` (29 lines): <Brief description about requirements which are tested in this function: Marks a single notification as read and emits a real-time update.>
- `markAllAsRead` (19 lines): <Brief description about requirements which are tested in this function: Marks all unread notifications for the current user as read.>
- `deleteNotification` (17 lines): <Brief description about requirements which are tested in this function: Deletes a single notification.>
- `deleteAllRead` (19 lines): <Brief description about requirements which are tested in this function: Deletes all read notifications for the current user.>

## folder.controller.js

- `getFoldersByProject` (27 lines): <Brief description about requirements which are tested in this function: Retrieves a list of folders for a project, optionally filtered by parent folder.>
- `getFolder` (35 lines): <Brief description about requirements which are tested in this function: Retrieves a single folder by ID, including its children folders and documents.>
- `createRootFolder` (67 lines): <Brief description about requirements which are tested in this function: Creates a new root-level folder within a project.>
- `createFolder` (79 lines): <Brief description about requirements which are tested in this function: Creates a new folder (can be nested) within a project.>
- `updateFolder` (68 lines): <Brief description about requirements which are tested in this function: Updates an existing folder's name, parent, or public status.>
- `deleteFolder` (19 lines): <Brief description about requirements which are tested in this function: Deletes a folder, including all its children folders and documents.>
- `getFolderTree` (33 lines): <Brief description about requirements which are tested in this function: Retrieves the hierarchical tree structure of a folder and its descendants.>
- `searchFolders` (26 lines): <Brief description about requirements which are tested in this function: Searches for folders within a project based on a query string.>
- `getCurrentUser` (15 lines): <Brief description about requirements which are tested in this function: Retrieves basic information about the currently authenticated user.>

## task.controller.js

- `normalizePriority` (8 lines): <Brief description about requirements which are tested in this function: Helper to normalize task priority values to standard format.>
- `normalizeStatus` (11 lines): <Brief description about requirements which are tested in this function: Helper to normalize task status values to standard format (To Do, Doing, Done).>
- `normalizeType` (11 lines): <Brief description about requirements which are tested in this function: Helper to normalize task type values to standard format.>
- `isStatusDone` (3 lines): <Brief description about requirements which are tested in this function: Checks if a given status is 'Done'.>
- `isStatusStarted` (4 lines): <Brief description about requirements which are tested in this function: Checks if a given status indicates the task has started.>
- `isStatusPending` (3 lines): <Brief description about requirements which are tested in this function: Checks if a given status is 'To Do'.>
- `getlistTasks` (71 lines): <Brief description about requirements which are tested in this function: Lists tasks for a project, with extensive filtering, sorting, and pagination.>
- `listTasksByFeature` (27 lines): <Brief description about requirements which are tested in this function: Lists tasks belonging to a specific feature.>
- `createTask` (124 lines): <Brief description about requirements which are tested in this function: Creates a new task, validates input, checks dates against project/feature, and logs activity.>
- `checkDependencyViolations` (28 lines): <Brief description about requirements which are tested in this function: Helper to check if a status change violates task dependencies.>
- `updateTask` (307 lines): <Brief description about requirements which are tested in this function: Updates an existing task, performs extensive validation including dependency checks, auto-updates actual hours on status change, and logs detailed activity.>
- `getTask` (30 lines): <Brief description about requirements which are tested in this function: Retrieves a single task by ID.>
- `deleteTask` (18 lines): <Brief description about requirements which are tested in this function: Deletes a task.>
- `getTaskStats` (54 lines): <Brief description about requirements which are tested in this function: Provides statistics for tasks within a project (total, completed, in-progress, pending, overdue).>
- `hasCircularDependency` (20 lines): <Brief description about requirements which are tested in this function: Helper to detect circular dependencies.>
- `getDependencies` (64 lines): <Brief description about requirements which are tested in this function: Retrieves both dependencies (predecessors) and dependents (successors) for a task.>
- `addDependency` (353 lines): <Brief description about requirements which are tested in this function: Adds a new dependency between tasks, including validation for circular dependencies and date/status conflicts.>
- `validateDependency` (58 lines): <Brief description about requirements which are tested in this function: Validates a potential new dependency for circular references and suggests dates.>
- `calculateSuggestedDates` (33 lines): <Brief description about requirements which are tested in this function: Helper to calculate suggested start/end dates based on dependency type and lag.>
- `updateDependency` (54 lines): <Brief description about requirements which are tested in this function: Updates an existing task dependency.>
- `removeDependency` (20 lines): <Brief description about requirements which are tested in this function: Removes a task dependency.>
- `validateDates` (46 lines): <Brief description about requirements which are tested in this function: Validates task dates against its dependencies and suggests adjustments.>
- `analyzeDateImpact` (37 lines): <Brief description about requirements which are tested in this function: Analyzes the impact of changing a task's dates on its dependent tasks.>
- `autoAdjustDates` (101 lines): <Brief description about requirements which are tested in this function: Automatically adjusts a task's dates based on its dependencies, with an option to adjust dependent tasks as well.>
- `validateStatusChangeEndpoint` (23 lines): <Brief description about requirements which are tested in this function: Endpoint to validate a task status change against dependencies.>
- `analyzeStatusImpact` (45 lines): <Brief description about requirements which are tested in this function: Analyzes the impact of changing a task's status on its dependent tasks.>
- `getComments` (16 lines): <Brief description about requirements which are tested in this function: Retrieves comments for a specific task.>
- `addComment` (58 lines): <Brief description about requirements which are tested in this function: Adds a new comment to a task and logs activity.>
- `updateComment` (25 lines): <Brief description about requirements which are tested in this function: Updates an existing comment on a task.>
- `deleteComment` (20 lines): <Brief description about requirements which are tested in this function: Deletes a comment from a task.>
- `getAttachments` (14 lines): <Brief description about requirements which are tested in this function: Retrieves attachments for a specific task.>
- `addAttachment` (112 lines): <Brief description about requirements which are tested in this function: Adds an attachment (file upload or link) to a task and logs activity.>
- `deleteAttachment` (72 lines): <Brief description about requirements which are tested in this function: Deletes an attachment from a task and removes the file from Firebase Storage if it's not a link.>
- `getActivityLogs` (18 lines): <Brief description about requirements which are tested in this function: Retrieves activity logs for a specific task.>
- `bulkUpdateTasks` (33 lines): <Brief description about requirements which are tested in this function: Updates multiple tasks at once with the same changes.>
- `bulkDeleteTasks` (38 lines): <Brief description about requirements which are tested in this function: Deletes multiple tasks at once, with soft delete option.>
- `getTaskStatistics` (122 lines): <Brief description about requirements which are tested in this function: Provides comprehensive task statistics for a project, including status breakdown and unassigned tasks.>
- `getDashboardContribution` (370 lines): <Brief description about requirements which are tested in this function: Provides contribution metrics for team members within a project, including task counts, hours, and completion rates.>
- `getContributionCalendar` (70 lines): <Brief description about requirements which are tested in this function: Retrieves contribution calendar data showing completed tasks by date for the last 365 days.>
- `getUserTasks` (26 lines): <Brief description about requirements which are tested in this function: Retrieves all tasks assigned to a specific user.>
- `getTaskDashboard` (176 lines): <Brief description about requirements which are tested in this function: Provides a comprehensive dashboard for tasks within a project, including statistics, dependencies, upcoming deadlines, and overdue tasks.>
- `getDependenciesForGantt` (118 lines): <Brief description about requirements which are tested in this function: Retrieves all dependencies formatted for Gantt chart visualization.>
- `getMilestoneSummary` (104 lines): <Brief description about requirements which are tested in this function: Provides milestone summary with task statistics for each milestone.>
- `calculateProjectProgressEndpoint` (78 lines): <Brief description about requirements which are tested in this function: Calculates overall project progress based on task completion.>
- `getTaskTimeBasedProgress` (24 lines): <Brief description about requirements which are tested in this function: Gets time-based progress metrics for a single task.>
- `getProjectTimeBasedProgress` (137 lines): <Brief description about requirements which are tested in this function: Gets time-based progress metrics for all tasks in a project.>
- `getExpiredTasks` (82 lines): <Brief description about requirements which are tested in this function: Retrieves expired/overdue tasks in a project.>
- `getGanttTasks` (142 lines): <Brief description about requirements which are tested in this function: Retrieves tasks formatted for a Gantt chart, including dependencies and hierarchy.>


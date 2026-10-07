import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import {
    CollaborationUsersSchema,
    GoalsListSchema,
    GoalsSchema,
    SprintsSchema,
    TaskCommentsSchema,
    TasksSchema,
    TasksStatusesSchema,
    TasksToTagsSchema,
    TaskSharesSchema,
    TasksAssigneeSchema,
    TagsSchema,
    UsersSchema,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';

export class TaskShareRepository {
    private readonly db = Database.getInstance();

    async findActiveShareByTaskId(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TaskSharesSchema)
                .where(and(eq(TaskSharesSchema.taskId, taskId), isNull(TaskSharesSchema.revokedAt)))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async findActiveShareByToken(token: string) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TaskSharesSchema)
                .where(and(eq(TaskSharesSchema.token, token), isNull(TaskSharesSchema.revokedAt)))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async createShare(taskId: number, token: string, createdBy: number | null) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(TaskSharesSchema)
                .values({ taskId, token, createdBy })
                .returning()
        );
        return rows?.[0] ?? null;
    }

    async revokeShare(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TaskSharesSchema)
                .set({ revokedAt: sql`now()` })
                .where(and(eq(TaskSharesSchema.taskId, taskId), isNull(TaskSharesSchema.revokedAt)))
                .returning()
        );
        return (rows?.length ?? 0) > 0;
    }

    async fetchTask(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId)).limit(1)
        );
        return rows?.[0] ?? null;
    }

    async updateTaskNote(taskId: number, note: string) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .update(TasksSchema)
                .set({ note })
                .where(eq(TasksSchema.id, taskId))
                .returning()
        );
        return rows?.[0] ?? null;
    }

    async fetchSubtasks(parentId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: TasksSchema.id,
                    description: TasksSchema.description,
                    complete: TasksSchema.complete,
                    priorityId: TasksSchema.priorityId,
                    endDate: TasksSchema.endDate,
                })
                .from(TasksSchema)
                .where(eq(TasksSchema.parentId, parentId))
                .orderBy(asc(TasksSchema.taskOrder), asc(TasksSchema.id))
        );
        return rows ?? [];
    }

    async fetchStatus(statusId: number | null) {
        if (!statusId) return null;
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: TasksStatusesSchema.id, name: TasksStatusesSchema.name })
                .from(TasksStatusesSchema)
                .where(eq(TasksStatusesSchema.id, statusId))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async fetchList(listId: number | null) {
        if (!listId) return null;
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: GoalsListSchema.id, name: GoalsListSchema.name })
                .from(GoalsListSchema)
                .where(eq(GoalsListSchema.id, listId))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async fetchSprint(sprintId: number | null) {
        if (!sprintId) return null;
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: SprintsSchema.id,
                    name: SprintsSchema.name,
                    status: SprintsSchema.status,
                    startDate: SprintsSchema.startDate,
                    endDate: SprintsSchema.endDate,
                })
                .from(SprintsSchema)
                .where(eq(SprintsSchema.id, sprintId))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async fetchGoal(goalId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: GoalsSchema.id, name: GoalsSchema.name, organizationId: GoalsSchema.organizationId })
                .from(GoalsSchema)
                .where(eq(GoalsSchema.id, goalId))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async fetchTags(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: TagsSchema.id, name: TagsSchema.name, color: TagsSchema.color })
                .from(TasksToTagsSchema)
                .innerJoin(TagsSchema, eq(TagsSchema.id, TasksToTagsSchema.tagId))
                .where(eq(TasksToTagsSchema.taskId, taskId))
        );
        return rows ?? [];
    }

    async fetchAssignees(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({
                    id: CollaborationUsersSchema.id,
                    email: CollaborationUsersSchema.email,
                })
                .from(TasksAssigneeSchema)
                .innerJoin(
                    CollaborationUsersSchema,
                    eq(CollaborationUsersSchema.id, TasksAssigneeSchema.collabUserId)
                )
                .where(eq(TasksAssigneeSchema.taskId, taskId))
        );
        return rows ?? [];
    }

    async listComments(taskId: number) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select()
                .from(TaskCommentsSchema)
                .where(eq(TaskCommentsSchema.taskId, taskId))
                .orderBy(asc(TaskCommentsSchema.createdAt), asc(TaskCommentsSchema.id))
        );
        return rows ?? [];
    }

    async addComment(args: {
        taskId: number;
        body: string;
        authorName: string;
        authorUserId: number | null;
    }) {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .insert(TaskCommentsSchema)
                .values({
                    taskId: args.taskId,
                    body: args.body,
                    authorName: args.authorName,
                    authorUserId: args.authorUserId,
                })
                .returning()
        );
        return rows?.[0] ?? null;
    }

    async fetchUser(userId: number | null) {
        if (!userId) return null;
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle
                .select({ id: UsersSchema.id, email: UsersSchema.email, login: UsersSchema.login })
                .from(UsersSchema)
                .where(eq(UsersSchema.id, userId))
                .limit(1)
        );
        return rows?.[0] ?? null;
    }

    async fetchTaskHistoryLogs(taskId: number, limit = 20) {
        const query = `
            SELECT id, task_id as "taskId", user_id as "userId", user_email as "userEmail",
                   user_name as "userName", action, details, created_at as "createdAt"
            FROM tasks.task_history_logs
            WHERE task_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT $2
        `;
        const result = await this.db.query(query, [taskId, limit]).catch(() => null);
        return (result?.rows ?? []) as Array<{
            id: number;
            taskId: number;
            userId: number | null;
            userEmail: string | null;
            userName: string | null;
            action: string;
            details: string | null;
            createdAt: Date | string;
        }>;
    }

    async logTaskHistory(args: {
        taskId: number;
        userId?: number | null;
        userEmail?: string | null;
        userName?: string | null;
        action: string;
        details?: string | null;
    }) {
        const query = `
            INSERT INTO tasks.task_history_logs (task_id, user_id, user_email, user_name, action, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const result = await this.db.query(query, [
            args.taskId,
            args.userId ?? null,
            args.userEmail ?? null,
            args.userName ?? null,
            args.action,
            args.details ?? null,
        ]).catch(() => null);
        return !!result;
    }
}

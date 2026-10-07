import { randomBytes } from 'crypto';
import { TaskShareRepository } from './TaskShareRepository';
import { toggleChecklistItem } from './checklist.utils';

export type PublicTaskPayload = {
    task: {
        id: number;
        goalId: number;
        description: string | null;
        complete: boolean | null;
        note: string | null;
        priorityId: 1 | 2 | 3 | null;
        startDate: string | null;
        endDate: string | null;
        startTime: string | null;
        endTime: string | null;
        statusId: number | null;
        goalListId: number | null;
        sprintId: number | null;
        amount: string | null;
        estimateValue: string | null;
        sourceUrl: string | null;
    };
    goal: { id: number; name: string } | null;
    status: { id: number; name: string } | null;
    list: { id: number; name: string } | null;
    sprint: {
        id: number;
        name: string;
        status: string;
        startDate: string;
        endDate: string;
    } | null;
    tags: { id: number; name: string; color: string }[];
    assignees: { id: number; email: string }[];
    subtasks: {
        id: number;
        description: string | null;
        complete: boolean | null;
        priorityId: 1 | 2 | 3 | null;
        endDate: string | null;
    }[];
    comments: {
        id: number;
        body: string;
        authorName: string;
        authorUserId: number | null;
        createdAt: Date | string;
    }[];
    share: { token: string };
};

export class TaskShareManager {
    private readonly repository = new TaskShareRepository();

    private makeToken() {
        return randomBytes(24).toString('base64url');
    }

    private appUrl() {
        return (process.env.APP_URL ?? '').replace(/\/+$/, '');
    }

    async createOrGetShare(taskId: number, userId: number | null) {
        const task = await this.repository.fetchTask(taskId);
        if (!task) return null;

        let share = await this.repository.findActiveShareByTaskId(taskId);
        if (!share) {
            share = await this.repository.createShare(taskId, this.makeToken(), userId);
        }
        if (!share) return null;

        const base = this.appUrl() || '';
        return {
            token: share.token,
            url: `${base}/share/t/${share.token}`,
        };
    }

    async revokeShare(taskId: number) {
        return this.repository.revokeShare(taskId);
    }

    async getShareStatus(taskId: number) {
        const share = await this.repository.findActiveShareByTaskId(taskId);
        if (!share) return { active: false as const, url: null, token: null };
        const base = this.appUrl() || '';
        return {
            active: true as const,
            token: share.token,
            url: `${base}/share/t/${share.token}`,
        };
    }

    async buildPublicPayload(token: string): Promise<PublicTaskPayload | null> {
        const share = await this.repository.findActiveShareByToken(token);
        if (!share) return null;

        const task = await this.repository.fetchTask(share.taskId);
        if (!task) return null;

        const [goal, status, list, sprint, tags, assignees, subtasks, comments] = await Promise.all([
            this.repository.fetchGoal(task.goalId),
            this.repository.fetchStatus(task.statusId),
            this.repository.fetchList(task.goalListId),
            this.repository.fetchSprint(task.sprintId),
            this.repository.fetchTags(task.id),
            this.repository.fetchAssignees(task.id),
            this.repository.fetchSubtasks(task.id),
            this.repository.listComments(task.id),
        ]);

        return {
            task: {
                id: task.id,
                goalId: task.goalId,
                description: task.description,
                complete: task.complete,
                note: task.note,
                priorityId: task.priorityId,
                startDate: task.startDate,
                endDate: task.endDate,
                startTime: task.startTime,
                endTime: task.endTime,
                statusId: task.statusId,
                goalListId: task.goalListId,
                sprintId: task.sprintId,
                amount: task.amount,
                estimateValue: task.estimateValue,
                sourceUrl: task.sourceUrl,
            },
            goal: goal ? { id: goal.id, name: goal.name || '' } : null,
            status,
            list,
            sprint: sprint
                ? {
                      id: sprint.id,
                      name: sprint.name,
                      status: sprint.status,
                      startDate: sprint.startDate,
                      endDate: sprint.endDate,
                  }
                : null,
            tags,
            assignees,
            subtasks,
            comments: comments.map((c) => ({
                id: c.id,
                body: c.body,
                authorName: c.authorName,
                authorUserId: c.authorUserId,
                createdAt: c.createdAt,
            })),
            share: { token: share.token },
        };
    }

    async listComments(taskId: number) {
        return this.repository.listComments(taskId);
    }

    async addComment(args: {
        taskId: number;
        body: string;
        authorName: string;
        authorUserId: number | null;
    }) {
        const body = args.body.trim();
        const authorName = args.authorName.trim();
        if (!body || body.length > 2000) return null;
        if (!authorName || authorName.length > 80) return null;
        return this.repository.addComment({
            taskId: args.taskId,
            body,
            authorName,
            authorUserId: args.authorUserId,
        });
    }

    async addPublicComment(token: string, body: string, authorName: string, authorUserId: number | null) {
        const share = await this.repository.findActiveShareByToken(token);
        if (!share) return null;
        return this.addComment({
            taskId: share.taskId,
            body,
            authorName,
            authorUserId,
        });
    }

    async togglePublicChecklist(token: string, itemIndex: number, checked: boolean) {
        const share = await this.repository.findActiveShareByToken(token);
        if (!share) return null;
        const task = await this.repository.fetchTask(share.taskId);
        if (!task) return null;

        const nextNote = toggleChecklistItem(task.note ?? '', itemIndex, checked);
        if (nextNote === null) return null;

        const updated = await this.repository.updateTaskNote(task.id, nextNote);
        if (!updated) return null;
        return { note: updated.note };
    }
}

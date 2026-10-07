import TvApiBase from "./base"
import type { AppResponse } from "./base.types";
import { type TaskArgAdd, type TaskResponseAdd, type TaskArgDelete, type TaskResponseDelete, type TaskArgUpdate, type TaskResponseUpdate, type TaskResponseFetchById, type TaskArgFetch, type TaskResponseFetch, type TaskArgToggleAssignee, type TaskResponseToggleAssignee, type TaskResponseFetchTaskHistory, type TaskResponseRecoveryTaskHistory } from "./tasks.api.types"
import type {
    PublicSharedTask,
    TaskComment,
    TaskShareCreateResponse,
    TaskShareStatus,
} from "./task-share.types";

export default class TvTaskApi extends TvApiBase {
    protected moduleUrl = '/module/tasks';
    protected publicModuleUrl = '/module/public';

    public async fetch(data: TaskArgFetch) {
        const params = data.filters
            ? { ...data, filters: JSON.stringify(data.filters) }
            : data;
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetch>>(
                `${this.moduleUrl}`, { params }
            )
        );
    }

    public async fetchTaskById(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetchById>>(
                `${this.moduleUrl}/${taskId}`
            )
        );
    }

    public async updateTask(task: TaskArgUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<TaskResponseUpdate>>(
                `${this.moduleUrl}`, task
            )
        );
    }

    public async createTask(task: TaskArgAdd) {
        return this.request(
            this.$axios.post<AppResponse<TaskResponseAdd>>(
                `${this.moduleUrl}`, task
            )
        );
    }

    public async deleteTask(taskId: TaskArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<TaskResponseDelete>>(
                `${this.moduleUrl}`, { data: { taskId } }
            )
        );
    }

    public async toggleTasksAssignee(data: TaskArgToggleAssignee) {
        return this.request(
            this.$axios.patch<AppResponse<TaskResponseToggleAssignee>>(
                `${this.moduleUrl}/task-users`, data
            )
        );
    }

    public async fetchTaskHistory(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TaskResponseFetchTaskHistory>>(
                `${this.moduleUrl}/${taskId}/history`
            )
        );
    }

    public async recoveryTaskHistory(historyId: number, taskId: number) {
        return this.request(
            this.$axios.post<AppResponse<TaskResponseRecoveryTaskHistory>>(
                `${this.moduleUrl}/${taskId}/restore/${historyId}`
            )
        );
    }

    public async getShare(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<TaskShareStatus>>(
                `${this.moduleUrl}/${taskId}/share`
            )
        );
    }

    public async createShare(taskId: number) {
        return this.request(
            this.$axios.post<AppResponse<TaskShareCreateResponse>>(
                `${this.moduleUrl}/${taskId}/share`
            )
        );
    }

    public async revokeShare(taskId: number) {
        return this.request(
            this.$axios.delete<AppResponse<{ revoked: boolean }>>(
                `${this.moduleUrl}/${taskId}/share`
            )
        );
    }

    public async fetchComments(taskId: number) {
        return this.request(
            this.$axios.get<AppResponse<{ comments: TaskComment[] }>>(
                `${this.moduleUrl}/${taskId}/comments`
            )
        );
    }

    public async addComment(taskId: number, body: string, authorName?: string) {
        return this.request(
            this.$axios.post<AppResponse<{ comment: TaskComment }>>(
                `${this.moduleUrl}/${taskId}/comments`,
                { body, authorName }
            )
        );
    }

    public async fetchPublicTask(token: string) {
        return this.request(
            this.$axios.get<AppResponse<PublicSharedTask>>(
                `${this.publicModuleUrl}/tasks/${encodeURIComponent(token)}`
            )
        );
    }

    public async addPublicComment(token: string, body: string, authorName: string) {
        return this.request(
            this.$axios.post<AppResponse<{ comment: TaskComment }>>(
                `${this.publicModuleUrl}/tasks/${encodeURIComponent(token)}/comments`,
                { body, authorName }
            )
        );
    }

    public async togglePublicChecklist(token: string, itemIndex: number, checked: boolean) {
        return this.request(
            this.$axios.patch<AppResponse<{ note: string | null }>>(
                `${this.publicModuleUrl}/tasks/${encodeURIComponent(token)}/checklist`,
                { itemIndex, checked }
            )
        );
    }
}
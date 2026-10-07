import type { Request, Response } from 'express';
import { TaskShareManager } from './TaskShareManager';

export class TaskShareController {
    private readonly manager = new TaskShareManager();

    private parseTaskId(req: Request) {
        const taskId = Number(req.params.taskId);
        return Number.isInteger(taskId) && taskId > 0 ? taskId : null;
    }

    private parseToken(req: Request) {
        const token = String(req.params.token ?? '').trim();
        return token.length >= 8 && token.length <= 128 ? token : null;
    }

    getShare = async (req: Request, res: Response) => {
        const taskId = this.parseTaskId(req);
        if (!taskId) return res.status(400).end();
        return res.tvJson(await this.manager.getShareStatus(taskId));
    };

    createShare = async (req: Request, res: Response) => {
        const taskId = this.parseTaskId(req);
        if (!taskId) return res.status(400).end();
        const userId = req.appUser.getUserData()?.id ?? null;
        const share = await this.manager.createOrGetShare(taskId, userId);
        if (!share) return res.status(404).end();
        return res.tvJson(share);
    };

    revokeShare = async (req: Request, res: Response) => {
        const taskId = this.parseTaskId(req);
        if (!taskId) return res.status(400).end();
        const revoked = await this.manager.revokeShare(taskId);
        return res.tvJson({ revoked });
    };

    listComments = async (req: Request, res: Response) => {
        const taskId = this.parseTaskId(req);
        if (!taskId) return res.status(400).end();
        return res.tvJson({ comments: await this.manager.listComments(taskId) });
    };

    addComment = async (req: Request, res: Response) => {
        const taskId = this.parseTaskId(req);
        if (!taskId) return res.status(400).end();

        const body = typeof req.body?.body === 'string' ? req.body.body : '';
        const user = req.appUser.getUserData();
        const authorName =
            (typeof req.body?.authorName === 'string' && req.body.authorName.trim()) ||
            user?.login ||
            user?.email ||
            'User';

        const comment = await this.manager.addComment({
            taskId,
            body,
            authorName,
            authorUserId: user?.id ?? null,
        });
        if (!comment) return res.status(400).end();
        return res.tvJson({ comment });
    };

    getPublicTask = async (req: Request, res: Response) => {
        const token = this.parseToken(req);
        if (!token) return res.status(400).end();
        const payload = await this.manager.buildPublicPayload(token);
        if (!payload) return res.status(404).end();
        return res.tvJson(payload);
    };

    addPublicComment = async (req: Request, res: Response) => {
        const token = this.parseToken(req);
        if (!token) return res.status(400).end();

        const body = typeof req.body?.body === 'string' ? req.body.body : '';
        const authorName = typeof req.body?.authorName === 'string' ? req.body.authorName : '';
        const userId = req.appUser.getHasActiveToken() ? (req.appUser.getUserData()?.id ?? null) : null;

        const comment = await this.manager.addPublicComment(token, body, authorName, userId);
        if (!comment) return res.status(400).end();
        return res.tvJson({ comment });
    };

    togglePublicChecklist = async (req: Request, res: Response) => {
        const token = this.parseToken(req);
        if (!token) return res.status(400).end();

        const itemIndex = Number(req.body?.itemIndex);
        const checked = Boolean(req.body?.checked);
        if (!Number.isInteger(itemIndex) || itemIndex < 0) return res.status(400).end();

        const result = await this.manager.togglePublicChecklist(token, itemIndex, checked);
        if (!result) return res.status(400).end();
        return res.tvJson(result);
    };
}

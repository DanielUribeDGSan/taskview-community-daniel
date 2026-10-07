import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { TaskShareController } from './TaskShareController';

export default class PublicTaskShareRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly controller: TaskShareController;

    constructor() {
        this.router = Router();
        this.controller = new TaskShareController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        this.router.get('/tasks/:token', this.controller.getPublicTask);
        this.router.post('/tasks/:token/comments', this.controller.addPublicComment);
        this.router.patch('/tasks/:token/checklist', this.controller.togglePublicChecklist);
    }
}

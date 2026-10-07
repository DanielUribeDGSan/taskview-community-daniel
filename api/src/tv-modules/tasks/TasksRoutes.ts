import { Router } from 'express';
import type { Routable } from '../../types/routable.type';
import { IsLoggedIn } from '../auth/middlewares/is-logged-in';
import { CanAddTaskNew } from './middlewares/CanAddTaskNew';
import { CanDeleteTask } from './middlewares/CanDeleteTask';
import { CanFetchTask } from './middlewares/CanFetchTask';
import { CanFetchTaskHistory } from './middlewares/CanFetchTaskHistory';
import { CanFetchTasks } from './middlewares/CanFetchTasks';
import { CanRecoveryTaskHistory } from './middlewares/CanRecoveryTaskHistory';
import { CanUpdateTask } from './middlewares/CanUpdateTask';
import { CanUpdateTaskAssigneeNew } from './middlewares/CanUpdateTaskAssigneeNew';
import { TaskShareController } from '../task-share/TaskShareController';
import { TasksController } from './TasksController';

export default class TasksRoutes implements Routable {
    private readonly router: ReturnType<typeof Router>;
    private readonly tasksController: TasksController;
    private readonly taskShareController: TaskShareController;

    constructor() {
        this.router = Router();
        this.tasksController = new TasksController();
        this.taskShareController = new TaskShareController();
        this.initRoutes();
    }

    getRouter() {
        return this.router;
    }

    initRoutes() {
        /**
         * Fetch tasks (pagination is working properly)
         */
        this.router.get('', [IsLoggedIn, CanFetchTasks], this.tasksController.fetchTasksNew);

        /**
         * Public share link (create / status / revoke)
         */
        this.router.get('/:taskId/share', [IsLoggedIn, CanFetchTask], this.taskShareController.getShare);
        this.router.post('/:taskId/share', [IsLoggedIn, CanFetchTask], this.taskShareController.createShare);
        this.router.delete('/:taskId/share', [IsLoggedIn, CanFetchTask], this.taskShareController.revokeShare);

        /**
         * Task comments (private modal)
         */
        this.router.get('/:taskId/comments', [IsLoggedIn, CanFetchTask], this.taskShareController.listComments);
        this.router.post('/:taskId/comments', [IsLoggedIn, CanFetchTask], this.taskShareController.addComment);

        /**
         * Fetch task by id
         */
        this.router.get('/:taskId', [IsLoggedIn, CanFetchTask], this.tasksController.fetchTaskByIdNew);

        /**
         * Update task
         */
        this.router.patch('', [IsLoggedIn, CanUpdateTask], this.tasksController.updateTask);

        /**
         * Toggle user for task
         */
        this.router.patch(
            '/task-users',
            [IsLoggedIn, CanUpdateTaskAssigneeNew],
            this.tasksController.toggleUserRolesNew
        );

        /**
         * Add new task
         */
        this.router.post('', [IsLoggedIn, CanAddTaskNew], this.tasksController.addTaskNew);

        /**
         * Delete task
         */
        this.router.delete('', [IsLoggedIn, CanDeleteTask], this.tasksController.deleteTaskNew);

        /**
         * Fetch task history
         */
        this.router.get('/:taskId/history', [IsLoggedIn, CanFetchTaskHistory], this.tasksController.fetchTaskHistory);

        /**
         * Restore task from history
         */
        this.router.post(
            '/:taskId/restore/:historyId',
            [IsLoggedIn, CanRecoveryTaskHistory],
            this.tasksController.recoverTaskHistory
        );
    }
}

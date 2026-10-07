import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { TasksSchema } from './tasks.schema';
import { UsersSchema } from './users.schema';

export const TaskCommentsSchema = pgSchema('tasks').table('task_comments', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer('task_id')
        .notNull()
        .references(() => TasksSchema.id, { onDelete: 'cascade' }),
    body: varchar({ length: 2000 }).notNull(),
    authorName: varchar('author_name', { length: 80 }).notNull(),
    authorUserId: integer('author_user_id').references(() => UsersSchema.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type TaskCommentsSchemaTypeForSelect = typeof TaskCommentsSchema.$inferSelect;
export type TaskCommentsSchemaTypeForInsert = typeof TaskCommentsSchema.$inferInsert;

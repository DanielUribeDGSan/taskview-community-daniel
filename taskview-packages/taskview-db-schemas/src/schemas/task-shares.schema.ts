import { integer, pgSchema, timestamp, varchar } from 'drizzle-orm/pg-core';
import { TasksSchema } from './tasks.schema';
import { UsersSchema } from './users.schema';

export const TaskSharesSchema = pgSchema('tasks').table('task_shares', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    taskId: integer('task_id')
        .notNull()
        .references(() => TasksSchema.id, { onDelete: 'cascade' }),
    token: varchar({ length: 64 }).notNull().unique(),
    createdBy: integer('created_by').references(() => UsersSchema.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),
});

export type TaskSharesSchemaTypeForSelect = typeof TaskSharesSchema.$inferSelect;
export type TaskSharesSchemaTypeForInsert = typeof TaskSharesSchema.$inferInsert;

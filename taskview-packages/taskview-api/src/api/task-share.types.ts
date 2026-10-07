export type TaskShareStatus = {
    active: boolean
    token: string | null
    url: string | null
}

export type TaskShareCreateResponse = {
    token: string
    url: string
}

export type TaskComment = {
    id: number
    body: string
    authorName: string
    authorUserId: number | null
    createdAt: string | Date
}

export type TaskHistoryEntry = {
    id: number
    action: string
    details: string | null
    userEmail: string | null
    userName: string | null
    createdAt: string | Date
}

export type TaskLastModified = {
    userEmail: string | null
    userName: string | null
    action: string | null
    details: string | null
    at: string | Date
}

export type PublicSharedTask = {
    task: {
        id: number
        goalId: number
        description: string | null
        complete: boolean | null
        note: string | null
        priorityId: 1 | 2 | 3 | null
        startDate: string | null
        endDate: string | null
        startTime: string | null
        endTime: string | null
        statusId: number | null
        goalListId: number | null
        sprintId: number | null
        amount: string | null
        estimateValue: string | null
        sourceUrl: string | null
    }
    goal: { id: number; name: string } | null
    status: { id: number; name: string } | null
    list: { id: number; name: string } | null
    sprint: {
        id: number
        name: string
        status: string
        startDate: string
        endDate: string
    } | null
    tags: { id: number; name: string; color: string }[]
    assignees: { id: number; email: string }[]
    subtasks: {
        id: number
        description: string | null
        complete: boolean | null
        priorityId: 1 | 2 | 3 | null
        endDate: string | null
    }[]
    comments: TaskComment[]
    history?: TaskHistoryEntry[]
    lastModified?: TaskLastModified | null
    share: { token: string }
}

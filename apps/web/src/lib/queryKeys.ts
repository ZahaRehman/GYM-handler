export const queryKeys = {
  auth: { admin: (userId: string) => ['auth', 'admin', userId] as const },
  settings: { all: ['settings'] as const },
  plans: { all: ['plans'] as const },
  members: {
    all: ['members'] as const,
    detail: (id: string) => ['members', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    member: (memberId: string) => ['payments', 'member', memberId] as const,
  },
  reminders: {
    all: ['reminders'] as const,
    member: (memberId: string) => ['reminders', 'member', memberId] as const,
  },
  dashboard: { all: ['dashboard'] as const },
}

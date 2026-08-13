export type AdminPlan = { id: number; name: string; description: string; price: string | number; weeklyClasses: number; active: boolean };
export type AdminModality = { id: number; name: string; description: string; hasGraduation: boolean; active: boolean };
export type SafeUser = { id: number; name: string; email: string; role: 'OWNER' | 'ADMIN' | 'RECEPTION' | 'TEACHER'; active: boolean };
export type AdminClass = { id: number; name: string; modalityId: number; teacherUserId: number; weekDays: string[]; startTime: string; endTime: string; capacity: number; active: boolean; modality: AdminModality; teacher: SafeUser };

export type Attendance = { id: number; attendanceDate: string; status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED'; class: { name: string; modality: { name: string } } };

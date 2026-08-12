export type Attendance = { id: number; attendanceDate: string; status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED'; student?: { id: number }; class: { name: string; modality: { name: string } } };
export type AttendanceStatus = Attendance['status'];
export type AttendanceFilters = { studentId?: number; classId?: number; startDate?: string; endDate?: string };
export type ClassStudents = { class: { id: number; name: string; teacher: string; modality: string }; students: { id: number; name: string }[]; totalStudents: number };
export type AttendanceBatch = { classId: number; attendanceDate: string; students: { studentId: number; status: AttendanceStatus }[] };

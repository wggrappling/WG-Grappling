import { httpService } from './http.service';
import type {
  AttendanceProjection,
  FinanceProjection,
  GraduationsProjection,
  MeProjection,
  ModalitiesProjection,
  SelfProfile,
} from '../types/self-service';

export const selfService = {
  me: () => httpService.get<MeProjection>('/me'),
  profile: () => httpService.get<SelfProfile>('/me/profile'),
  graduations: () => httpService.get<GraduationsProjection>('/me/graduations'),
  modalities: () => httpService.get<ModalitiesProjection>('/me/modalities'),
  attendance: (startDate?: string, endDate?: string) =>
    httpService.get<AttendanceProjection>('/me/attendance', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    }),
  finance: () => httpService.get<FinanceProjection>('/me/finance'),
};

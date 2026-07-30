import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentPlanDto } from './create-student-plan.dto';

export class UpdateStudentPlanDto extends PartialType(CreateStudentPlanDto) {}

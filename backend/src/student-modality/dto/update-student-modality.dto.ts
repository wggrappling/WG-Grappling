import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentModalityDto } from './create-student-modality.dto';

export class UpdateStudentModalityDto extends PartialType(CreateStudentModalityDto) {}

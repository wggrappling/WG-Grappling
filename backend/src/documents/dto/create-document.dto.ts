import { ApiProperty } from '@nestjs/swagger';
import { DocumentStatus, DocumentType } from '../../../generated/prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ example: 1, description: 'ID do estudante vinculado ao documento' })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({ example: DocumentType.PHOTO, description: 'Tipo do documento', enum: DocumentType })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty({ example: 'perfil-123.jpg', description: 'Nome do arquivo armazenado' })
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @ApiProperty({ example: 'perfil.jpg', description: 'Nome original do arquivo' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ example: 'image/jpeg', description: 'Tipo MIME do arquivo' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 'jpg', description: 'Extensão do arquivo' })
  @IsString()
  @IsNotEmpty()
  extension: string;

  @ApiProperty({ example: 245760, description: 'Tamanho do arquivo em bytes' })
  @IsInt()
  @Min(0)
  size: number;

  @ApiProperty({ example: '/storage/documents/perfil-123.jpg', description: 'Caminho de armazenamento do arquivo' })
  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @ApiProperty({ example: DocumentStatus.ACTIVE, description: 'Status do documento', enum: DocumentStatus, required: false })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiProperty({ example: 1, description: 'ID do usuário que carregou o documento' })
  @IsInt()
  @IsNotEmpty()
  uploadedBy: number;
}

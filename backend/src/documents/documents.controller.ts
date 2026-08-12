import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../../generated/prisma/enums';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentsService, type UploadedDocumentFile } from './documents.service';

type AuthRequest = { user: { id: number; role: UserRole } };
const documentRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION];

@ApiTags('Documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents') findAll() { return this.documentsService.findAll(); }

  @Get('documents/:id/file')
  @Roles(...documentRoles)
  async getFile(@Param('id') id: string, @Query('download') download: string | undefined, @Request() req: AuthRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.documentsService.getFile(Number(id), req.user);
    const disposition = download === 'true' ? 'attachment' : result.inline ? 'inline' : 'attachment';
    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(result.originalName)}`);
    response.setHeader('Content-Length', String(result.data.length));
    return new StreamableFile(result.data);
  }

  @Get('documents/:id') findOne(@Param('id') id: string) { return this.documentsService.findOne(Number(id)); }
  @Get('students/:studentId/documents') findByStudent(@Param('studentId') studentId: string) { return this.documentsService.findByStudent(Number(studentId)); }

  @Post('students/:studentId/documents')
  @Roles(...documentRoles)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['file', 'type'], properties: { file: { type: 'string', format: 'binary' }, type: { type: 'string' } } } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.DOCUMENT_MAX_SIZE_MB ?? 10) * 1024 * 1024 } }))
  upload(@Param('studentId') studentId: string, @Body() dto: UploadDocumentDto, @UploadedFile() file: UploadedDocumentFile, @Request() req: AuthRequest) {
    return this.documentsService.upload(Number(studentId), dto.type, file, req.user);
  }

  @Post('documents') create(@Body() dto: CreateDocumentDto) { return this.documentsService.create(dto); }
  @Patch('documents/:id') update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.documentsService.update(Number(id), dto); }

  @Delete('documents/:id')
  @Roles(...documentRoles)
  remove(@Param('id') id: string, @Request() req: AuthRequest) { return this.documentsService.remove(Number(id), req.user); }
}

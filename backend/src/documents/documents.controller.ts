import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

@ApiTags('Documents')
@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Listar documentos' })
  @ApiResponse({ status: 200, description: 'Lista de documentos retornada com sucesso.' })
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Buscar documento por ID' })
  @ApiParam({ name: 'id', description: 'ID do documento' })
  @ApiResponse({ status: 200, description: 'Documento retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(Number(id));
  }

  @Get('students/:studentId/documents')
  @ApiOperation({ summary: 'Listar documentos de um estudante' })
  @ApiParam({ name: 'studentId', description: 'ID do estudante' })
  @ApiResponse({ status: 200, description: 'Documentos do estudante retornados com sucesso.' })
  findByStudent(@Param('studentId') studentId: string) {
    return this.documentsService.findByStudent(Number(studentId));
  }

  @Post('documents')
  @ApiOperation({ summary: 'Criar documento' })
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponse({ status: 201, description: 'Documento criado com sucesso.' })
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  @Patch('documents/:id')
  @ApiOperation({ summary: 'Atualizar documento' })
  @ApiParam({ name: 'id', description: 'ID do documento' })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiResponse({ status: 200, description: 'Documento atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(Number(id), updateDocumentDto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Remover documento' })
  @ApiParam({ name: 'id', description: 'ID do documento' })
  @ApiResponse({ status: 200, description: 'Documento removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(Number(id));
  }
}

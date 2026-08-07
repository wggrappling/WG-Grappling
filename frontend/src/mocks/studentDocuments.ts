export type StudentDocumentStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';

export type StudentDocument = {
  id: number;
  type: string;
  name: string;
  status: StudentDocumentStatus;
  uploadedAt: string;
  size: string;
};

export const studentDocuments: readonly StudentDocument[] = [
  {
    id: 1,
    type: 'Documento pessoal',
    name: 'RG - Rafael Mendes.pdf',
    status: 'Aprovado',
    uploadedAt: '03/08/2026',
    size: '1,2 MB',
  },
  {
    id: 2,
    type: 'Contrato',
    name: 'Contrato de matrícula.pdf',
    status: 'Aprovado',
    uploadedAt: '03/08/2026',
    size: '842 KB',
  },
  {
    id: 3,
    type: 'Atestado médico',
    name: 'Atestado médico 2026.pdf',
    status: 'Pendente',
    uploadedAt: '05/08/2026',
    size: '560 KB',
  },
  {
    id: 4,
    type: 'Comprovante',
    name: 'Comprovante de residência.jpg',
    status: 'Rejeitado',
    uploadedAt: '06/08/2026',
    size: '2,4 MB',
  },
];

export type DocumentType =
  | 'PHOTO'
  | 'MEDICAL_CERTIFICATE'
  | 'CONTRACT'
  | 'CERTIFICATE'
  | 'LGPD'
  | 'OTHER';

export type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export type DocumentUploader = {
  id: number;
  name: string;
  email: string;
};

export type StudentDocument = {
  id: number;
  studentId: number;
  type: DocumentType;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  status: DocumentStatus;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
  uploader: DocumentUploader;
  fileAvailable: boolean;
};

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttachment extends Document {
  // Identificador del token o solicitud al que pertenece
  relatedId: string;
  // Tipo: 'token' | 'trusted-issuer-request'
  relatedType: 'token' | 'trusted-issuer-request';
  // Nombre original del archivo
  fileName: string;
  // Tipo MIME del archivo
  mimeType: string;
  // Tamaño del archivo en bytes
  size: number;
  // Ruta o URL donde se almacena el archivo
  filePath: string;
  // Hash del archivo para verificación de integridad
  fileHash?: string;
  // Descripción opcional del archivo
  description?: string;
  // Usuario que subió el archivo
  uploadedBy: string; // address del wallet
  // Fecha de creación
  createdAt: Date;
  // Fecha de actualización
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    relatedId: {
      type: String,
      required: true,
      index: true,
    },
    relatedType: {
      type: String,
      required: true,
      enum: ['token', 'trusted-issuer-request'],
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileHash: {
      type: String,
    },
    description: {
      type: String,
    },
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice compuesto para búsquedas eficientes
AttachmentSchema.index({ relatedId: 1, relatedType: 1 });

// Modelo con verificación de existencia para evitar errores en hot-reload
const Attachment: Model<IAttachment> =
  mongoose.models.Attachment || mongoose.model<IAttachment>('Attachment', AttachmentSchema);

export default Attachment;


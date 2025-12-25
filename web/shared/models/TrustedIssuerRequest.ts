import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITrustedIssuerRequest extends Document {
  // Dirección del wallet que solicita ser trusted issuer
  requesterAddress: string;
  // Nombre de la organización o entidad
  organizationName: string;
  // Descripción de la organización
  description?: string;
  // Email de contacto
  contactEmail?: string;
  // Website
  website?: string;
  // Claim topics que puede emitir (array de topic IDs)
  claimTopics: number[];
  // Estado de la solicitud
  status: 'pending' | 'approved' | 'rejected';
  // Dirección del contrato de trusted issuer (si fue aprobado)
  issuerContractAddress?: string;
  // Hash de la transacción de aprobación
  approvalTxHash?: string;
  // Razón de rechazo (si fue rechazado)
  rejectionReason?: string;
  // Fecha de creación
  createdAt: Date;
  // Fecha de actualización
  updatedAt: Date;
  // Fecha de aprobación/rechazo
  reviewedAt?: Date;
  // Dirección del wallet que revisó la solicitud
  reviewedBy?: string;
}

const TrustedIssuerRequestSchema = new Schema<ITrustedIssuerRequest>(
  {
    requesterAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    organizationName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    contactEmail: {
      type: String,
    },
    website: {
      type: String,
    },
    claimTopics: {
      type: [Number],
      required: true,
      default: [],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    issuerContractAddress: {
      type: String,
      lowercase: true,
    },
    approvalTxHash: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
TrustedIssuerRequestSchema.index({ requesterAddress: 1, status: 1 });
TrustedIssuerRequestSchema.index({ status: 1, createdAt: -1 });

// Modelo con verificación de existencia para evitar errores en hot-reload
const TrustedIssuerRequest: Model<ITrustedIssuerRequest> =
  mongoose.models.TrustedIssuerRequest ||
  mongoose.model<ITrustedIssuerRequest>('TrustedIssuerRequest', TrustedIssuerRequestSchema);

export default TrustedIssuerRequest;


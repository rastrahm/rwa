import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClaimRequest extends Document {
  // Dirección del wallet que solicita el claim
  requesterAddress: string;
  // Dirección del contrato Identity del solicitante
  identityAddress: string;
  // Tipo de claim (topic)
  topic: number;
  // Esquema de firma
  scheme: number;
  // Dirección del Trusted Issuer que debe aprobar
  issuerAddress: string;
  // Firma criptográfica (opcional al solicitar, se completa al aprobar)
  signature?: string;
  // Datos del claim en texto (se convierte a hex)
  dataText?: string;
  // Datos del claim en hexadecimal
  dataHex?: string;
  // URI con documentación adicional
  uri?: string;
  // Estado de la solicitud
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  // Hash de la transacción cuando se agregó el claim (si fue completado)
  claimTxHash?: string;
  // Razón de rechazo (si fue rechazado)
  rejectionReason?: string;
  // Fecha de creación
  createdAt: Date;
  // Fecha de actualización
  updatedAt: Date;
  // Fecha de revisión (aprobación/rechazo)
  reviewedAt?: Date;
  // Dirección del wallet que revisó la solicitud (Trusted Issuer)
  reviewedBy?: string;
  // Notas adicionales del issuer
  issuerNotes?: string;
}

const ClaimRequestSchema = new Schema<IClaimRequest>(
  {
    requesterAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    identityAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    topic: {
      type: Number,
      required: true,
      index: true,
    },
    scheme: {
      type: Number,
      required: true,
      default: 1, // ECDSA por defecto
    },
    issuerAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    signature: {
      type: String,
    },
    dataText: {
      type: String,
    },
    dataHex: {
      type: String,
    },
    uri: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    claimTxHash: {
      type: String,
      index: true,
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
    issuerNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índices para búsquedas eficientes
ClaimRequestSchema.index({ requesterAddress: 1, status: 1 });
ClaimRequestSchema.index({ issuerAddress: 1, status: 1 });
ClaimRequestSchema.index({ status: 1, createdAt: -1 });
ClaimRequestSchema.index({ topic: 1, status: 1 });

// Modelo con verificación de existencia para evitar errores en hot-reload
// Asegurarse de que el modelo use la conexión correcta
// Si la conexión no está lista, el modelo se registrará cuando se importe después de conectar
let ClaimRequest: Model<IClaimRequest>;

if (mongoose.connection && mongoose.connection.readyState === 1) {
  // Si la conexión ya está lista, usar esa conexión
  ClaimRequest = mongoose.connection.models.ClaimRequest || 
    mongoose.connection.model<IClaimRequest>('ClaimRequest', ClaimRequestSchema);
} else {
  // Si la conexión no está lista, registrar en la instancia default
  // Se actualizará cuando se establezca la conexión
  ClaimRequest = mongoose.models.ClaimRequest || 
    mongoose.model<IClaimRequest>('ClaimRequest', ClaimRequestSchema);
}

export default ClaimRequest;


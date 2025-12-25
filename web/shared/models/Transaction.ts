import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  // Hash de la transacción en blockchain
  txHash: string;
  // Dirección del wallet que ejecutó la transacción
  fromAddress: string;
  // Dirección del contrato interactuado (si aplica)
  contractAddress?: string;
  // Tipo de transacción
  type:
    | 'identity-registration'
    | 'identity-claim-add'
    | 'identity-claim-remove'
    | 'trusted-issuer-request'
    | 'trusted-issuer-approval'
    | 'token-creation'
    | 'token-purchase'
    | 'token-transfer'
    | 'other';
  // Estado de la transacción
  status: 'pending' | 'confirmed' | 'failed';
  // Número de bloque (si está confirmada)
  blockNumber?: number;
  // Gas usado
  gasUsed?: string;
  // Precio del gas
  gasPrice?: string;
  // Costo total (gasUsed * gasPrice)
  totalCost?: string;
  // Datos adicionales específicos del tipo de transacción
  metadata?: {
    // Para identity-registration
    identityAddress?: string;
    // Para identity-claim-add/remove
    claimTopic?: number;
    claimIssuer?: string;
    // Para token-creation
    tokenAddress?: string;
    tokenName?: string;
    tokenSymbol?: string;
    // Para token-purchase
    tokenAmount?: string;
    paymentAmount?: string;
    // Para trusted-issuer-request/approval
    issuerAddress?: string;
    requestId?: string;
    // Otros datos
    [key: string]: any;
  };
  // Fecha de creación
  createdAt: Date;
  // Fecha de confirmación
  confirmedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    contractAddress: {
      type: String,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'identity-registration',
        'identity-claim-add',
        'identity-claim-remove',
        'trusted-issuer-request',
        'trusted-issuer-approval',
        'token-creation',
        'token-purchase',
        'token-transfer',
        'other',
      ],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending',
      index: true,
    },
    blockNumber: {
      type: Number,
      index: true,
    },
    gasUsed: {
      type: String,
    },
    gasPrice: {
      type: String,
    },
    totalCost: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    confirmedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para búsquedas eficientes
TransactionSchema.index({ fromAddress: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ contractAddress: 1, createdAt: -1 });

// Modelo con verificación de existencia para evitar errores en hot-reload
const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;


import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User as IUser } from '../types';
import { applyFieldEncryption } from '../utils/encryption';

export interface UserDocument extends Omit<IUser, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

export interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findActive(): Promise<UserDocument[]>;
  findByRole(role: string): Promise<UserDocument[]>;
  getUserStats(): Promise<Record<string, { total: number; active: number }>>;
}

const UserSchema = new Schema<UserDocument>({
  name: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingresa un email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false // No incluir en consultas por defecto
  },
  role: {
    type: String,
    enum: {
      values: ['patient', 'doctor', 'admin'],
      message: 'El rol debe ser patient, doctor o admin'
    },
    default: 'patient'
  },
  avatar: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    match: [
      /^\+[1-9]\d{1,14}$/,
      'El número de teléfono debe estar en formato E.164 (ej: +51987654321)'
    ],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Cifrado en reposo para datos de perfil no indexados
applyFieldEncryption(UserSchema, [
  'name',
  'avatar',
  'phone' // Cifrar número de teléfono por privacidad
]);

// Índices para optimizar consultas
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });

// Middleware para encriptar contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  // Solo encriptar si la contraseña ha sido modificada
  if (!this.isModified('password')) return next();

  try {
    // Encriptar contraseña con bcrypt
    const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Middleware para actualizar lastLogin
UserSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update?.$set?.lastLogin) {
    this.set({ lastLogin: new Date() });
  }
  next();
});

// Método para comparar contraseñas
UserSchema.methods['comparePassword'] = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this['password']);
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

// Método para convertir a JSON sin campos sensibles
UserSchema.methods['toJSON'] = function() {
  const userObject = this['toObject']();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Virtual para obtener el nombre completo
UserSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual para obtener estadísticas del usuario
UserSchema.virtual('stats', {
  ref: 'MedicalHistory',
  localField: '_id',
  foreignField: 'doctorId',
  count: true
});

// Método estático para buscar usuarios por email
UserSchema.statics['findByEmail'] = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Método estático para buscar usuarios activos
UserSchema.statics['findActive'] = function() {
  return this.find({ isActive: true });
};

// Método estático para buscar por rol
UserSchema.statics['findByRole'] = function(role: string) {
  return this.find({ role, isActive: true });
};

// Método estático para obtener estadísticas de usuarios
UserSchema.statics['getUserStats'] = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        }
      }
    }
  ]);

  return stats.reduce((acc: Record<string, { total: number; active: number }>, stat: any) => {
    acc[stat._id] = {
      total: stat.count,
      active: stat.active
    };
    return acc;
  }, {} as Record<string, { total: number; active: number }>);
};

export default mongoose.model<UserDocument, UserModel>('User', UserSchema);

// Implementación de Repositorio de Usuario con MongoDB - Capa de Infraestructura
import { UserEntity, UserRole } from '../../domain/entities/User';
import { UserRepository } from '../../domain/repositories/UserRepository';
import mongoose, { Document, Schema } from 'mongoose';

interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.PATIENT
  },
  avatar: {
    type: String,
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

const UserModel = mongoose.model<UserDocument>('User', UserSchema);

export class MongoUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const user = await UserModel.findById(id);
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    return user ? this.toEntity(user) : null;
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await UserModel.find();
    return users.map(user => this.toEntity(user));
  }

  async save(user: UserEntity): Promise<UserEntity> {
    const userDoc = new UserModel({
      _id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });

    const savedUser = await userDoc.save();
    return this.toEntity(savedUser);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    const updatedUser = await UserModel.findByIdAndUpdate(
      user.id,
      {
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Usuario no encontrado');
    }

    return this.toEntity(updatedUser);
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }

  async findActiveUsers(): Promise<UserEntity[]> {
    const users = await UserModel.find({ isActive: true });
    return users.map(user => this.toEntity(user));
  }

  async findByRole(role: string): Promise<UserEntity[]> {
    const users = await UserModel.find({ role, isActive: true });
    return users.map(user => this.toEntity(user));
  }

  async findUsersByDateRange(startDate: Date, endDate: Date): Promise<UserEntity[]> {
    const users = await UserModel.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });
    return users.map(user => this.toEntity(user));
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    byRole: Record<string, { total: number; active: number }>;
  }> {
    const stats = await UserModel.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    const total = await UserModel.countDocuments();
    const active = await UserModel.countDocuments({ isActive: true });

    const byRole = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        total: stat.total,
        active: stat.active
      };
      return acc;
    }, {} as Record<string, { total: number; active: number }>);

    return {
      total,
      active,
      byRole
    };
  }

  async findUsersPaginated(page: number, limit: number): Promise<{
    users: UserEntity[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;
    const users = await UserModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserModel.countDocuments();

    return {
      users: users.map(user => this.toEntity(user)),
      total,
      pages: Math.ceil(total / limit)
    };
  }

  async searchUsers(query: string): Promise<UserEntity[]> {
    const users = await UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    });
    return users.map(user => this.toEntity(user));
  }

  private toEntity(userDoc: UserDocument): UserEntity {
    return new UserEntity(
      (userDoc._id as any).toString(),
      userDoc.name,
      userDoc.email,
      userDoc.password,
      userDoc.role as UserRole,
      userDoc.avatar,
      userDoc.isActive,
      userDoc.lastLogin,
      userDoc.createdAt,
      userDoc.updatedAt
    );
  }
}

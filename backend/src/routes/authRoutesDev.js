/**
 * Authentication Routes - JavaScript version for development
 * Simple implementation for demo purposes
 */

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Load User model - usar mongoose directamente ya que el modelo TypeScript no se puede cargar desde JS
let UserModel;
let userSchemaCreated = false;

const initializeUserModel = () => {
  if (UserModel) return UserModel;
  
  try {
    const mongoose = require('mongoose');
    
    // Intentar obtener el modelo si ya existe
    try {
      UserModel = mongoose.model('User');
      console.log('✅ User model loaded from mongoose');
      return UserModel;
    } catch (e) {
      // Si no existe, crear el schema y modelo directamente
      if (!userSchemaCreated) {
        const bcrypt = require('bcryptjs');
        const userSchema = new mongoose.Schema({
          name: { type: String, required: true, trim: true },
          email: { type: String, required: true, unique: true, lowercase: true, trim: true },
          password: { type: String, required: true, select: false },
          role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
          avatar: { type: String, default: null },
          phone: { type: String, default: null },
          isActive: { type: Boolean, default: true },
          lastLogin: { type: Date, default: null }
        }, { timestamps: true });

        // Hash password antes de guardar
        userSchema.pre('save', async function(next) {
          if (!this.isModified('password')) return next();
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
          this.password = await bcrypt.hash(this.password, saltRounds);
          next();
        });

        // Método para comparar contraseñas
        userSchema.methods.comparePassword = async function(candidatePassword) {
          return await bcrypt.compare(candidatePassword, this.password);
        };

        // Índices
        userSchema.index({ email: 1 });
        userSchema.index({ role: 1 });
        userSchema.index({ isActive: 1 });

        UserModel = mongoose.model('User', userSchema);
        userSchemaCreated = true;
        console.log('✅ User model created directly with mongoose');
        return UserModel;
      }
    }
  } catch (error) {
    console.error('❌ Could not initialize User model:', error.message);
    console.error('Error stack:', error.stack);
    return null;
  }
  
  return null;
};

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Inicializar el modelo si no está cargado
    UserModel = initializeUserModel();
    
    if (!UserModel) {
      return res.status(500).json({
        success: false,
        message: 'Sistema de autenticación no disponible'
      });
    }

    // Buscar usuario y incluir contraseña
    const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'La cuenta está desactivada'
      });
    }

    // Verificar contraseña
    let isPasswordValid = false;
    try {
      if (typeof user.comparePassword === 'function') {
        isPasswordValid = await user.comparePassword(password);
      } else {
        // Fallback: comparar directamente con bcrypt si el método no existe
        const bcrypt = require('bcryptjs');
        isPasswordValid = await bcrypt.compare(password, user.password);
      }
    } catch (passwordError) {
      console.error('Error al verificar contraseña:', passwordError);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar contraseña',
        error: passwordError.message
      });
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar tokens
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Actualizar lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Preparar respuesta sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          ...userResponse,
          _id: user._id.toString()
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'patient' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    // Inicializar el modelo si no está cargado
    UserModel = initializeUserModel();
    
    if (!UserModel) {
      return res.status(500).json({
        success: false,
        message: 'Sistema de registro no disponible'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya existe con este email'
      });
    }

    // Crear nuevo usuario
    const user = await UserModel.create({
      name,
      email: email.toLowerCase(),
      password,
      role
    });

    // Generar tokens
    const token = generateToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    // Actualizar lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Preparar respuesta sin contraseña
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          ...userResponse,
          _id: user._id.toString()
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken: refreshTokenInput } = req.body;

    if (!refreshTokenInput) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requerido'
      });
    }

    const secret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-change-in-production';
    
    // Verificar refresh token
    const decoded = jwt.verify(refreshTokenInput, secret);
    
    // Inicializar el modelo si no está cargado
    UserModel = initializeUserModel();
    
    if (!UserModel) {
      return res.status(500).json({
        success: false,
        message: 'Sistema no disponible'
      });
    }

    // Buscar usuario
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Generar nuevos tokens
    const newToken = generateToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Token refrescado exitosamente',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Refresh token inválido',
      error: error.message
    });
  }
});

module.exports = router;


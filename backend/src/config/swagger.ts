/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

const swaggerJsdoc = require('swagger-jsdoc');
import { config } from './config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RespiCare Backend API',
      version: '1.0.0',
      description: 'API para el sistema de gestión de enfermedades respiratorias RespiCare Tacna',
      contact: {
        name: 'RespiCare Team',
        email: 'support@respicare.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.respicare.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID único del usuario'
            },
            name: {
              type: 'string',
              description: 'Nombre completo del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            role: {
              type: 'string',
              enum: ['patient', 'doctor', 'admin'],
              description: 'Rol del usuario'
            },
            avatar: {
              type: 'string',
              description: 'URL del avatar del usuario'
            },
            isActive: {
              type: 'boolean',
              description: 'Estado activo del usuario'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Último inicio de sesión'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de actualización'
            }
          }
        },
        MedicalHistory: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID único de la historia médica'
            },
            patientId: {
              type: 'string',
              description: 'ID del paciente'
            },
            doctorId: {
              type: 'string',
              description: 'ID del doctor'
            },
            patientName: {
              type: 'string',
              description: 'Nombre del paciente'
            },
            age: {
              type: 'number',
              description: 'Edad del paciente'
            },
            diagnosis: {
              type: 'string',
              description: 'Diagnóstico médico'
            },
            symptoms: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Symptom'
              },
              description: 'Lista de síntomas'
            },
            description: {
              type: 'string',
              description: 'Descripción adicional'
            },
            date: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de la consulta'
            },
            location: {
              $ref: '#/components/schemas/Location'
            },
            images: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'URLs de imágenes médicas'
            },
            audioNotes: {
              type: 'string',
              description: 'URL del archivo de audio'
            },
            isOffline: {
              type: 'boolean',
              description: 'Indica si fue creado offline'
            },
            syncStatus: {
              type: 'string',
              enum: ['pending', 'synced', 'error'],
              description: 'Estado de sincronización'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de actualización'
            }
          }
        },
        Symptom: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nombre del síntoma'
            },
            severity: {
              type: 'string',
              enum: ['mild', 'moderate', 'severe'],
              description: 'Severidad del síntoma'
            },
            duration: {
              type: 'string',
              description: 'Duración del síntoma'
            },
            description: {
              type: 'string',
              description: 'Descripción adicional del síntoma'
            }
          },
          required: ['name', 'severity', 'duration']
        },
        Location: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitud de la ubicación'
            },
            longitude: {
              type: 'number',
              description: 'Longitud de la ubicación'
            },
            address: {
              type: 'string',
              description: 'Dirección de la ubicación'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo de la respuesta'
            },
            data: {
              type: 'object',
              description: 'Datos de la respuesta'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  description: 'Página actual'
                },
                limit: {
                  type: 'number',
                  description: 'Límite de elementos por página'
                },
                total: {
                  type: 'number',
                  description: 'Total de elementos'
                },
                pages: {
                  type: 'number',
                  description: 'Total de páginas'
                }
              }
            }
          },
          required: ['success', 'message']
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'Mensaje de error'
            },
            error: {
              type: 'string',
              description: 'Detalles del error'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);

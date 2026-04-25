# 🔑 Credenciales de Usuarios Demo - RespiCare

## 📝 Método de Encriptación

### Algoritmo: **bcrypt** (a través de `bcryptjs`)

- **Tipo**: Hash unidireccional (no es encriptación reversible)
- **Salt Rounds**: 
  - **Por defecto**: 12 rounds (configurable con variable de entorno `BCRYPT_ROUNDS`)
  - **En algunos scripts**: 10 rounds
- **Biblioteca**: `bcryptjs` (versión JavaScript de bcrypt)

### ¿Cómo funciona?

1. Al crear/actualizar un usuario, el middleware `pre('save')` del modelo User automáticamente hashea la contraseña
2. El hash incluye un "salt" aleatorio único por contraseña
3. Las contraseñas nunca se almacenan en texto plano
4. Para verificar, se compara el hash con `bcrypt.compare()`

```javascript
// Ejemplo de hash generado:
$2a$12$rXK8VQqXQqXQqXQqXQqXOuXQqXQqXQqXQqXQqXQqXQqXQqXQqX
```

---

## 👥 Usuarios Creados por Script `seed.ts`

### Administrador
- **Email**: `admin@respicare.com`
- **Contraseña**: `admin123`
- **Rol**: `admin`

### Doctores
- **Email**: `doctor@respicare.com`
- **Contraseña**: `password123`
- **Rol**: `doctor`

- **Email**: `maria.garcia@respicare.com`
- **Contraseña**: `password123`
- **Rol**: `doctor`

### Pacientes
- **Email**: `ana.lopez@email.com`
- **Contraseña**: `password123`
- **Rol**: `patient`

- **Email**: `carlos.mendoza@email.com`
- **Contraseña**: `password123`
- **Rol**: `patient`

- **Email**: `rosa.mamani@email.com`
- **Contraseña**: `password123`
- **Rol**: `patient`

---

## 👥 Usuarios Creados por Scripts `seed-complete-system.js` y `seed-users.js`

### Administrador
- **Email**: `admin@demo.com`
- **Contraseña**: `admin1234`
- **Rol**: `admin`

### Doctores
- **Email**: `doctor@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `doctor`

- **Email**: `laura.martinez@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `doctor`

### Pacientes
- **Email**: `paciente@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `patient`

- **Email**: `juan.perez@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `patient`

- **Email**: `maria.garcia@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `patient`

- **Email**: `carlos.mendoza@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `patient`

- **Email**: `ana.lopez@demo.com`
- **Contraseña**: `demo1234`
- **Rol**: `patient`

---

## 🔒 Seguridad

### Importante

⚠️ **Estas contraseñas son SOLO para desarrollo y pruebas**. En producción:

1. ✅ Cambia TODAS las contraseñas por defecto
2. ✅ Usa contraseñas fuertes y únicas
3. ✅ Implementa políticas de contraseñas (longitud mínima, complejidad)
4. ✅ Considera usar autenticación de dos factores (2FA)
5. ✅ Rota las contraseñas periódicamente

### Configuración de Salt Rounds

Para cambiar el número de salt rounds (mayor = más seguro pero más lento):

```bash
# En .env
BCRYPT_ROUNDS=12  # Valor por defecto (recomendado: 10-12)
```

**Nota**: Aumentar los rounds mejora la seguridad pero aumenta el tiempo de hash. 12 rounds es un buen balance entre seguridad y rendimiento.

---

## 📍 Ubicación del Código

- **Modelo de Usuario**: `backend/src/models/User.ts`
- **Scripts de Seed**: 
  - `backend/src/scripts/seed.ts`
  - `backend/src/scripts/seed-complete-system.js`
  - `backend/src/scripts/seed-users.js`
- **Servicio de Hash**: `backend/src/application/services/HashService.ts`

---

## 🧪 Verificar Contraseñas

Si necesitas verificar que una contraseña es correcta programáticamente:

```javascript
const bcrypt = require('bcryptjs');
const hashedPassword = '$2a$12$...'; // Hash almacenado en BD
const plainPassword = 'password123';

const isValid = await bcrypt.compare(plainPassword, hashedPassword);
console.log('Contraseña válida:', isValid);
```

---

**Última actualización**: Noviembre 2024


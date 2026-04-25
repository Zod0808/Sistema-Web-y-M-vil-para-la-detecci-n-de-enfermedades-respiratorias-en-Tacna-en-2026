import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../../../src/models/User';

describe('User model', () => {
  beforeAll(() => {
    jest.spyOn(bcrypt, 'hash');
    jest.spyOn(bcrypt, 'compare');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  const buildUserData = (overrides: Partial<Record<string, any>> = {}) => ({
    name: 'Doctora Respi',
    email: `user-${Math.random().toString(16).slice(2)}@example.com`,
    password: 'Secret123!',
    role: 'doctor',
    ...overrides
  });

  it('encripta la contraseña antes de guardar y la oculta en toJSON', async () => {
    const hashSpy = jest.spyOn(bcrypt, 'hash');
    const user = await User.create(buildUserData());

    const stored = await User.findById(user._id).select('+password');
    expect(stored?.password).toBeDefined();
    expect(stored?.password).not.toBe('Secret123!');
    expect(hashSpy).toHaveBeenCalled();

    const json = stored?.toJSON();
    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('__v');
  });

  it('comparePassword devuelve verdadero para coincidencias y falso en caso contrario', async () => {
    const user = await User.create(buildUserData());
    const stored = await User.findById(user._id).select('+password');

    await expect(stored?.comparePassword('Secret123!')).resolves.toBe(true);
    await expect(stored?.comparePassword('otra-clave')).resolves.toBe(false);
  });

  it('findByEmail y findByRole devuelven resultados esperados', async () => {
    const { email } = await User.create(buildUserData({ role: 'patient' }));
    await User.create(buildUserData({ role: 'admin', isActive: false }));
    await User.create(buildUserData({ role: 'doctor', isActive: true }));

    const foundByEmail = await User.findByEmail(email);
    expect(foundByEmail?.email).toBe(email.toLowerCase());

    const doctors = await User.findByRole('doctor');
    expect(doctors).toHaveLength(1);
    expect(doctors[0].role).toBe('doctor');

    const activeUsers = await User.findActive();
    expect(activeUsers.every((u) => u.isActive)).toBe(true);
  });

  it('getUserStats agrega conteos por rol', async () => {
    await User.create(buildUserData({ role: 'doctor' }));
    await User.create(buildUserData({ role: 'doctor', isActive: false }));
    await User.create(buildUserData({ role: 'patient' }));

    const stats = await User.getUserStats();

    expect(stats.doctor).toEqual({ total: 2, active: 1 });
    expect(stats.patient).toEqual({ total: 1, active: 1 });
  });

  it('actualiza lastLogin en pre findOneAndUpdate cuando se establece en $set', async () => {
    const user = await User.create(buildUserData({ lastLogin: null }));
    const before = Date.now();

    const updated = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { lastLogin: new Date('2024-01-01T00:00:00.000Z') } },
      { new: true }
    );

    expect(updated?.lastLogin).toBeInstanceOf(Date);
    expect(updated!.lastLogin!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('expone virtuales fullName y stats', async () => {
    const user = await User.create(buildUserData({ name: 'Respira Paciente' }));
    const reloaded = await User.findById(user._id);

    expect(reloaded?.fullName).toBe('Respira Paciente');
    // stats es un virtual de conteo: al no hacer populate debe poder consultarse sin lanzar error
    expect(reloaded?.stats).toBeUndefined();
  });
});



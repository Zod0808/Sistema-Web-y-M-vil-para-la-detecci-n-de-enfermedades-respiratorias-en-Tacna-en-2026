import { asyncHandler } from '../../../src/utils/asyncHandler';

const buildReq = (): any => ({ body: {}, params: {}, query: {} });
const buildRes = (): any => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
const buildNext = () => jest.fn();

describe('asyncHandler', () => {
  it('llama a la función handler con req, res, next', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it('propaga errores síncronos a next', async () => {
    const error = new Error('Error síncrono');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const next = buildNext();

    await wrapped(buildReq(), buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('propaga errores asíncronos a next', async () => {
    const error = new Error('Error asíncrono');
    const handler = jest.fn(async () => {
      throw error;
    });
    const wrapped = asyncHandler(handler);
    const next = buildNext();

    await wrapped(buildReq(), buildRes(), next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('no llama a next cuando no hay error', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const next = buildNext();

    await wrapped(buildReq(), buildRes(), next);

    expect(next).not.toHaveBeenCalled();
  });

  it('retorna una función', () => {
    const handler = jest.fn();
    const result = asyncHandler(handler);
    expect(typeof result).toBe('function');
  });

  it('maneja correctamente una respuesta exitosa', async () => {
    const res = buildRes();
    const handler = jest.fn(async (_req: any, response: any) => {
      response.status(200).json({ success: true });
    });
    const wrapped = asyncHandler(handler);
    const next = buildNext();

    await wrapped(buildReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('propaga AppError a next correctamente', async () => {
    const { AppError } = require('../../../src/utils/AppError');
    const appError = new AppError('No autorizado', 401, 'AUTH_REQUIRED');
    const handler = jest.fn().mockRejectedValue(appError);
    const wrapped = asyncHandler(handler);
    const next = buildNext();

    await wrapped(buildReq(), buildRes(), next);

    expect(next).toHaveBeenCalledWith(appError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});
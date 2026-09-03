import * as controller from '../../../src/controllers/educationalContentController';

jest.mock('../../../src/services/educationalContentService', () => ({
  educationalContentService: {
    getPersonalizedContent: jest.fn(),
    getContentById: jest.fn(),
    listContent: jest.fn(),
    createContent: jest.fn(),
    updateContent: jest.fn(),
    deleteContent: jest.fn(),
  },
}));

const { educationalContentService } = require('../../../src/services/educationalContentService');

const buildReq = (overrides: Partial<any> = {}): any => ({
  user: { _id: 'user-1', role: 'patient' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

const buildRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
};

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const runHandler = async (handler: any, req: any, res = buildRes(), next = jest.fn()) => {
  await handler(req, res, next);
  await flushMicrotasks();
  return { res, next };
};

describe('educationalContentController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getPersonalizedContent', () => {
    it('rechaza si no hay usuario autenticado', async () => {
      const { next } = await runHandler(controller.getPersonalizedContent, buildReq({ user: undefined }));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('retorna el contenido personalizado del usuario autenticado', async () => {
      educationalContentService.getPersonalizedContent.mockResolvedValue([{ title: 'General' }]);

      const { res } = await runHandler(controller.getPersonalizedContent, buildReq());

      expect(educationalContentService.getPersonalizedContent).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [{ title: 'General' }] })
      );
    });
  });

  describe('getContentById', () => {
    it('retorna el detalle y delega el registro de la consulta al servicio', async () => {
      educationalContentService.getContentById.mockResolvedValue({ title: 'Asma' });

      const { res } = await runHandler(
        controller.getContentById,
        buildReq({ params: { id: 'content-1' } })
      );

      expect(educationalContentService.getContentById).toHaveBeenCalledWith('content-1', 'user-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { title: 'Asma' } }));
    });
  });

  describe('createContent', () => {
    it('crea contenido y responde 201', async () => {
      const payload = { title: 't', summary: 's', content: 'c', category: 'general' };
      educationalContentService.createContent.mockResolvedValue({ _id: '1', ...payload });

      const { res } = await runHandler(controller.createContent, buildReq({ body: payload }));

      expect(educationalContentService.createContent).toHaveBeenCalledWith(payload);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteContent', () => {
    it('elimina contenido y responde éxito', async () => {
      const { res } = await runHandler(controller.deleteContent, buildReq({ params: { id: 'content-1' } }));

      expect(educationalContentService.deleteContent).toHaveBeenCalledWith('content-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});

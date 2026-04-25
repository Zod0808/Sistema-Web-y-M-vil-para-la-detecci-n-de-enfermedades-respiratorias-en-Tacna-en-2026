import axios, { AxiosInstance } from 'axios';
import { FhirService, FhirBundle } from '../../../src/services/fhirService';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FhirService', () => {
  const postMock = jest.fn();
  const getMock = jest.fn();
  const patchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    postMock.mockReset();
    getMock.mockReset();
    patchMock.mockReset();

    mockedAxios.create.mockReturnValue({
      post: postMock,
      get: getMock,
      patch: patchMock,
    } as unknown as AxiosInstance);
  });

  it('crea recursos decorando la metainformación con etiquetas de inquilino', async () => {
    postMock.mockResolvedValue({
      data: { resourceType: 'Patient', id: 'patient-1' },
    });

    const service = new FhirService({
      baseUrl: 'https://fhir.test',
      authToken: 'test-token',
      tenantId: 'tenant-123',
    });

    const resource = {
      resourceType: 'Patient',
      meta: {
        tag: [{ system: 'http://example.org', code: 'existing-tag' }],
      },
    };

    await service.createResource(resource);

    expect(mockedAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://fhir.test',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/fhir+json',
        }),
      }),
    );

    expect(postMock).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({
        meta: {
          tag: expect.arrayContaining([
            { system: 'http://example.org', code: 'existing-tag' },
            { system: 'https://respicare.health/tenants', code: 'tenant-123' },
          ]),
        },
      }),
    );
  });

  it('recupera un recurso específico utilizando GET', async () => {
    const responseData = { resourceType: 'Observation', id: 'obs-001' };
    getMock.mockResolvedValue({ data: responseData });

    const service = new FhirService({ baseUrl: 'https://fhir.test' });

    const result = await service.getResource('Observation', 'obs-001');

    expect(getMock).toHaveBeenCalledWith('/Observation/obs-001');
    expect(result).toEqual(responseData);
  });

  it('sincroniza bundles aplicando decoración a cada recurso', async () => {
    const responseBundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [],
    };
    postMock.mockResolvedValue({ data: responseBundle });

    const service = new FhirService({
      baseUrl: 'https://fhir.test',
      tenantId: 'tenant-xyz',
    });

    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        { resource: { resourceType: 'Patient' } },
        { resource: { resourceType: 'Observation', meta: { tag: [] } } },
      ],
    };

    await service.syncBundle(bundle);

    expect(postMock).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({
        entry: expect.arrayContaining([
          expect.objectContaining({
            resource: expect.objectContaining({
              meta: expect.objectContaining({
                tag: expect.arrayContaining([
                  { system: 'https://respicare.health/tenants', code: 'tenant-xyz' },
                ]),
              }),
            }),
          }),
        ]),
      }),
    );
  });

  it('realiza búsqueda de recursos con parámetros FHIR', async () => {
    const bundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [],
    };
    getMock.mockResolvedValue({ data: bundle });

    const service = new FhirService({ baseUrl: 'https://fhir.test' });

    const params = { name: 'García', birthdate: '1980-01-01' };
    const result = await service.search('Patient', params);

    expect(getMock).toHaveBeenCalledWith('/Patient', { params });
    expect(result).toEqual(bundle);
  });

  it('actualiza parcialmente un recurso mediante PATCH', async () => {
    const updatedResource = { resourceType: 'Patient', id: 'patient-42' };
    patchMock.mockResolvedValue({ data: updatedResource });

    const service = new FhirService({ baseUrl: 'https://fhir.test' });

    const operations = [{ op: 'replace', path: '/active', value: true }];
    const result = await service.patchResource('Patient', 'patient-42', operations);

    expect(patchMock).toHaveBeenCalledWith('/Patient/patient-42', operations, {
      headers: { 'Content-Type': 'application/json-patch+json' },
    });
    expect(result).toEqual(updatedResource);
  });
});


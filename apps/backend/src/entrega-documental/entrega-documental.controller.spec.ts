import { Test, TestingModule } from '@nestjs/testing';
import { EntregaDocumentalController } from './entrega-documental.controller';
import { EntregaDocumentalService } from './entrega-documental.service';

describe('EntregaDocumentalController', () => {
  let controller: EntregaDocumentalController;
  const service = {
    findAllPublic: jest.fn(),
    findAllGestao: jest.fn(),
    findOneGestao: jest.fn(),
    findOnePublic: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntregaDocumentalController],
      providers: [{ provide: EntregaDocumentalService, useValue: service }],
    }).compile();
    controller = module.get(EntregaDocumentalController);
  });

  it('delegates list gestao', async () => {
    service.findAllGestao.mockResolvedValue({ configuracoes: [] });
    await expect(controller.findAllGestao(1)).resolves.toEqual({
      configuracoes: [],
    });
  });

  it('delegates create', async () => {
    service.create.mockResolvedValue({ id: 1, uploads_ocultos: false });
    await controller.create(1, {
      id_campus: 10,
      id_curso: 1,
      id_cronograma_etapa: 1,
      modo: 'ONLINE',
      subtipo_online: 'UPLOAD_NATIVO_PWA',
    } as never);
    expect(service.create).toHaveBeenCalled();
  });
});

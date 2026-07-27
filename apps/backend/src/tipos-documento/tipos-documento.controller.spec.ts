import { Test, TestingModule } from '@nestjs/testing';
import { TiposDocumentoController } from './tipos-documento.controller';
import { TiposDocumentoService } from './tipos-documento.service';

describe('TiposDocumentoController', () => {
  let controller: TiposDocumentoController;
  const service = {
    findAllPublic: jest.fn(),
    findAllGestao: jest.fn(),
    findOneGestao: jest.fn(),
    findOnePublic: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    replaceCampos: jest.fn(),
    uploadTemplate: jest.fn(),
    downloadTemplate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TiposDocumentoController],
      providers: [{ provide: TiposDocumentoService, useValue: service }],
    }).compile();
    controller = module.get(TiposDocumentoController);
  });

  it('delegates list public', async () => {
    service.findAllPublic.mockResolvedValue({ tipos: [], warnings: [] });
    await expect(controller.findAllPublic(1)).resolves.toEqual({
      tipos: [],
      warnings: [],
    });
    expect(service.findAllPublic).toHaveBeenCalledWith(1);
  });

  it('delegates create', async () => {
    service.create.mockResolvedValue({ id: 1 });
    await controller.create(1, { nome: 'RG', fase: 'INSCRICAO' } as never);
    expect(service.create).toHaveBeenCalled();
  });
});

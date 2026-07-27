import { Test, TestingModule } from '@nestjs/testing';
import { TiposDocumentoBaseController } from './tipos-documento-base.controller';
import { TiposDocumentoBaseService } from './tipos-documento-base.service';

describe('TiposDocumentoBaseController', () => {
  let controller: TiposDocumentoBaseController;
  const service = {
    findAllGestao: jest.fn(),
    findOneGestao: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadTemplate: jest.fn(),
    downloadTemplate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TiposDocumentoBaseController],
      providers: [{ provide: TiposDocumentoBaseService, useValue: service }],
    }).compile();
    controller = module.get(TiposDocumentoBaseController);
  });

  it('delegates gestao list', async () => {
    service.findAllGestao.mockResolvedValue({ tipos: [] });
    await expect(controller.findGestao()).resolves.toEqual({ tipos: [] });
  });

  it('delegates remove', async () => {
    service.remove.mockResolvedValue({ id: 1 });
    await expect(controller.remove(1)).resolves.toEqual({ id: 1 });
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});

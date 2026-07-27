import { Test, TestingModule } from '@nestjs/testing';
import { CronogramaController } from './cronograma.controller';
import { CronogramaService } from './cronograma.service';
import { TipoEtapaCronograma } from '@repo/types';

describe('CronogramaController', () => {
  let controller: CronogramaController;
  const service = {
    findAllPublic: jest.fn(),
    findAllGestao: jest.fn(),
    findOnePublic: jest.fn(),
    findOneGestao: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CronogramaController],
      providers: [{ provide: CronogramaService, useValue: service }],
    }).compile();
    controller = module.get(CronogramaController);
  });

  it('delegates list public', async () => {
    service.findAllPublic.mockResolvedValue({ etapas: [], warnings: [] });
    await controller.findAllPublic(1);
    expect(service.findAllPublic).toHaveBeenCalledWith(1);
  });

  it('delegates create', async () => {
    const dto = {
      tipo: TipoEtapaCronograma.INSCRICAO,
      data_inicio: '2026-01-01T00:00:00.000Z',
      data_fim: '2026-01-31T00:00:00.000Z',
    };
    service.create.mockResolvedValue({ id: 1, warnings: [] });
    await controller.create(1, dto);
    expect(service.create).toHaveBeenCalledWith(1, dto);
  });

  it('delegates reorder', async () => {
    service.reorder.mockResolvedValue({ etapas: [], warnings: [] });
    await controller.reorder(1, { ids: [2, 1] });
    expect(service.reorder).toHaveBeenCalledWith(1, [2, 1]);
  });
});

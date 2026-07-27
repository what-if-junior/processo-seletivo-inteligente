import { Test, TestingModule } from '@nestjs/testing';
import { FaixasController } from './faixas.controller';
import { FaixasService } from './faixas.service';

describe('FaixasController', () => {
  let controller: FaixasController;
  const service = {
    findPublic: jest.fn(),
    findGestao: jest.fn(),
    findOneGestao: jest.fn(),
    updateReferencia: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaixasController],
      providers: [{ provide: FaixasService, useValue: service }],
    }).compile();
    controller = module.get(FaixasController);
  });

  it('delegates public list', async () => {
    service.findPublic.mockResolvedValue({
      faixas: [],
      regra_b_socioeconomico: true,
      warnings: [],
    });
    await controller.findPublic();
    expect(service.findPublic).toHaveBeenCalled();
  });

  it('delegates create', async () => {
    const dto = { rotulo: 'Até 1 SM', multiplicador_min: 0, multiplicador_max: 1 };
    service.create.mockResolvedValue({ id: 1 });
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates reorder', async () => {
    service.reorder.mockResolvedValue({ faixas: [] });
    await controller.reorder({ ids: [2, 1] });
    expect(service.reorder).toHaveBeenCalledWith([2, 1]);
  });

  it('delegates updateReferencia', async () => {
    service.updateReferencia.mockResolvedValue({});
    await controller.updateReferencia({ salario_minimo_referencia: 1600 });
    expect(service.updateReferencia).toHaveBeenCalledWith(1600);
  });

  it('soft delete by default; hard when query true', async () => {
    service.remove.mockResolvedValue({});
    await controller.remove(3);
    expect(service.remove).toHaveBeenCalledWith(3, false);
    await controller.remove(3, 'true');
    expect(service.remove).toHaveBeenCalledWith(3, true);
  });
});

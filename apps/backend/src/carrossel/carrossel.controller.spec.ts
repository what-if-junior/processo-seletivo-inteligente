import { Test, TestingModule } from '@nestjs/testing';
import { CarrosselController } from './carrossel.controller';
import { CarrosselService } from './carrossel.service';

describe('CarrosselController', () => {
  let controller: CarrosselController;
  const carrosselService = {
    findPublic: jest.fn(),
    findGestao: jest.fn(),
    createManual: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
    sincronizarAuto: jest.fn(),
    setAutoHabilitado: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarrosselController],
      providers: [{ provide: CarrosselService, useValue: carrosselService }],
    }).compile();
    controller = module.get(CarrosselController);
  });

  it('public GET delegates to findPublic', async () => {
    carrosselService.findPublic.mockResolvedValue([]);
    await controller.findPublic();
    expect(carrosselService.findPublic).toHaveBeenCalled();
  });

  it('sincronizar-auto delegates', async () => {
    carrosselService.sincronizarAuto.mockResolvedValue({
      created: 0,
      updated: 0,
      skipped_disabled: 0,
    });
    await controller.sincronizarAuto();
    expect(carrosselService.sincronizarAuto).toHaveBeenCalled();
  });

  it('reorder passes ids', async () => {
    carrosselService.reorder.mockResolvedValue([]);
    await controller.reorder({ ids: [2, 1] });
    expect(carrosselService.reorder).toHaveBeenCalledWith([2, 1]);
  });
});

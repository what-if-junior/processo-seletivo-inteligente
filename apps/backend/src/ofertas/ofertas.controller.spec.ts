import { Test, TestingModule } from '@nestjs/testing';
import { OfertasController } from './ofertas.controller';
import { OfertasService } from './ofertas.service';

describe('OfertasController', () => {
  let controller: OfertasController;
  const ofertasService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPublic: jest.fn(),
    findOne: jest.fn(),
    findOnePublic: jest.fn(),
    findOneWithWarnings: jest.fn(),
    findCandidaturas: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    replaceCotas: jest.fn(),
    addCota: jest.fn(),
    updateCota: jest.fn(),
    removeCota: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfertasController],
      providers: [{ provide: OfertasService, useValue: ofertasService }],
    }).compile();

    controller = module.get<OfertasController>(OfertasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAllPublic delegates to service.findAllPublic', async () => {
    ofertasService.findAllPublic.mockResolvedValue([]);
    await controller.findAllPublic(1, undefined, undefined, true);
    expect(ofertasService.findAllPublic).toHaveBeenCalledWith({
      id_edital: 1,
      id_curso: undefined,
      id_campus: undefined,
      abertas: true,
    });
  });

  it('replaceCotas delegates to service', async () => {
    const dto = { cotas: [{ tipo_cota: 'AC', vagas: 40 }] };
    ofertasService.replaceCotas.mockResolvedValue({ warnings: [] });
    await controller.replaceCotas(1, dto);
    expect(ofertasService.replaceCotas).toHaveBeenCalledWith(1, dto);
  });
});

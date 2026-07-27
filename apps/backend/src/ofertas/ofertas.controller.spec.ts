import { Test, TestingModule } from '@nestjs/testing';
import { OfertasController } from './ofertas.controller';
import { OfertasService } from './ofertas.service';

describe('OfertasController', () => {
  let controller: OfertasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfertasController],
      providers: [
        {
          provide: OfertasService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findCandidaturas: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OfertasController>(OfertasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OfertasService } from './ofertas.service';
import { Oferta } from './entities/oferta.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';

describe('OfertasService', () => {
  let service: OfertasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfertasService,
        {
          provide: getRepositoryToken(Oferta),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: CandidaturasService,
          useValue: {
            findByOferta: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OfertasService>(OfertasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

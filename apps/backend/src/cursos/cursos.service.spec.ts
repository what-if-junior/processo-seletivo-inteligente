import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CursosService } from './cursos.service';
import { Curso } from './entities/curso.entity';
import { CandidaturasService } from '../candidaturas/candidaturas.service';

describe('CursosService', () => {
  let service: CursosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CursosService,
        {
          provide: getRepositoryToken(Curso),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: CandidaturasService,
          useValue: {
            findByCurso: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CursosService>(CursosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EditaisService } from './editais.service';
import { Edital } from './entities/edital.entity';

describe('EditaisService', () => {
  let service: EditaisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditaisService,
        {
          provide: getRepositoryToken(Edital),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EditaisService>(EditaisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

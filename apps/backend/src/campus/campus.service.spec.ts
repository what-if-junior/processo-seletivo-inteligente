import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Campus } from './entities/campus.entity';
import { CampusService } from './campus.service';

describe('CampusService', () => {
  let service: CampusService;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampusService,
        {
          provide: getRepositoryToken(Campus),
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get(CampusService);
  });

  it('findAll orders by nome ASC', async () => {
    const rows = [{ id: 1, nome: 'Brasília' }];
    find.mockResolvedValue(rows);
    await expect(service.findAll()).resolves.toEqual(rows);
    expect(find).toHaveBeenCalledWith({ order: { nome: 'ASC' } });
  });
});

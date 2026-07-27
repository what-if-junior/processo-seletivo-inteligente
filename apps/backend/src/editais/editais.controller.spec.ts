import { Test, TestingModule } from '@nestjs/testing';
import { EditaisController } from './editais.controller';
import { EditaisService } from './editais.service';

describe('EditaisController', () => {
  let controller: EditaisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditaisController],
      providers: [
        {
          provide: EditaisService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<EditaisController>(EditaisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CandidaturasController } from './candidaturas.controller';
import { CandidaturasService } from './candidaturas.service';

describe('CandidaturasController', () => {
  let controller: CandidaturasController;
  const service = {
    findAll: jest.fn(),
    findByUsuario: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidaturasController],
      providers: [{ provide: CandidaturasService, useValue: service }],
    }).compile();
    controller = module.get(CandidaturasController);
  });

  it('lists by usuario query', async () => {
    service.findByUsuario.mockResolvedValue([]);
    await controller.findAll('3');
    expect(service.findByUsuario).toHaveBeenCalledWith(3);
  });

  it('delegates create', async () => {
    const dto = { id_usuario: 1, id_oferta: 2, id_edital: 3 };
    service.create.mockResolvedValue({ id: 1 });
    await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates cancel', async () => {
    service.cancel.mockResolvedValue({ id: 9, status: 'cancelada' });
    await controller.cancel(9);
    expect(service.cancel).toHaveBeenCalledWith(9);
  });
});

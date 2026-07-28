import { Test, TestingModule } from '@nestjs/testing';
import { CandidaturasController } from './candidaturas.controller';
import { CandidaturasService } from './candidaturas.service';

describe('CandidaturasController', () => {
  let controller: CandidaturasController;
  const service = {
    findAll: jest.fn(),
    findByUsuario: jest.fn(),
    findByProtocolo: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
    getComprovantePdf: jest.fn(),
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

  it('lists by protocolo query', async () => {
    service.findByProtocolo.mockResolvedValue({ id: 1 });
    const result = await controller.findAll(undefined, '001-C1-2024-00001-1');
    expect(service.findByProtocolo).toHaveBeenCalledWith('001-C1-2024-00001-1');
    expect(result).toEqual([{ id: 1 }]);
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

  it('delegates comprovante pdf download', async () => {
    service.getComprovantePdf.mockResolvedValue({
      buffer: Buffer.from('%PDF'),
      protocolo: '001-C1-2024-00001-1',
      filename: 'comprovante-001-C1-2024-00001-1.pdf',
    });
    const file = await controller.downloadComprovante(1);
    expect(service.getComprovantePdf).toHaveBeenCalledWith(1);
    expect(file).toBeDefined();
  });
});

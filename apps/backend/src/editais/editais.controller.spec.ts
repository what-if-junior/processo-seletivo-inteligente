import { Test, TestingModule } from '@nestjs/testing';
import { EditaisController } from './editais.controller';
import { EditaisService } from './editais.service';

describe('EditaisController', () => {
  let controller: EditaisController;
  const editaisService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllPublic: jest.fn(),
    findOne: jest.fn(),
    findOnePublic: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    uploadArquivo: jest.fn(),
    listArquivos: jest.fn(),
    getVigenteArquivo: jest.fn(),
    getArquivoBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EditaisController],
      providers: [{ provide: EditaisService, useValue: editaisService }],
    }).compile();

    controller = module.get(EditaisController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('public list delegates to findAllPublic (published only)', async () => {
    editaisService.findAllPublic.mockResolvedValue([]);
    await controller.findAllPublic(true);
    expect(editaisService.findAllPublic).toHaveBeenCalledWith({
      inscricoes_abertas: true,
    });
  });

  it('gestao list can include drafts', async () => {
    editaisService.findAll.mockResolvedValue([]);
    await controller.findAllGestao(false, undefined);
    expect(editaisService.findAll).toHaveBeenCalledWith({
      publicado: false,
      inscricoes_abertas: undefined,
    });
  });
});

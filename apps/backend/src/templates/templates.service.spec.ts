import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplateBiblioteca } from './entities/template-biblioteca.entity';
import { TemplateEdital } from './entities/template-edital.entity';
import { Edital } from '../editais/entities/edital.entity';

describe('TemplatesService', () => {
  let service: TemplatesService;

  const saveBib = jest.fn(async (row: TemplateBiblioteca) => ({
    ...row,
    id: row.id ?? 1,
  }));
  const createBib = jest.fn((row: unknown) => row);
  const findBib = jest.fn();
  const findOneBib = jest.fn();
  const deleteBib = jest.fn();
  const countEdital = jest.fn();

  const saveEditalTpl = jest.fn(async (row: TemplateEdital) => ({
    ...row,
    id: row.id ?? 20,
  }));
  const createEditalTpl = jest.fn((row: unknown) => row);
  const findEditalTpl = jest.fn();
  const findOneEditalTpl = jest.fn();
  const findOneEdital = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    findOneEdital.mockResolvedValue({ id: 1 });
    findOneBib.mockResolvedValue({
      id: 7,
      titulo: 'Origem',
      corpo: 'corpo bib',
      canal: 'ambos',
      tipo_uso: 'RESPOSTA_CONTESTACAO',
      ativo: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getRepositoryToken(TemplateBiblioteca),
          useValue: {
            save: saveBib,
            create: createBib,
            find: findBib,
            findOne: findOneBib,
            delete: deleteBib,
          },
        },
        {
          provide: getRepositoryToken(TemplateEdital),
          useValue: {
            save: saveEditalTpl,
            create: createEditalTpl,
            find: findEditalTpl,
            findOne: findOneEditalTpl,
            count: countEdital,
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Edital),
          useValue: { findOne: findOneEdital },
        },
      ],
    }).compile();

    service = module.get(TemplatesService);
  });

  it('copy is independent — PATCH corpo does not mutate biblioteca', async () => {
    const copy = await service.copiarParaEdital(1, {
      id_template_biblioteca: 7,
    });
    expect(copy.corpo).toBe('corpo bib');
    expect(createEditalTpl).toHaveBeenCalledWith(
      expect.objectContaining({
        id_template_origem: 7,
        id_edital: 1,
        corpo: 'corpo bib',
      }),
    );

    findOneEditalTpl.mockResolvedValue({
      id: 20,
      id_edital: 1,
      id_template_origem: 7,
      titulo: 'Origem',
      corpo: 'corpo bib',
    });
    const updated = await service.updateEdital(1, 20, {
      corpo: 'corpo editado no edital',
    });
    expect(updated.corpo).toBe('corpo editado no edital');
    expect(saveBib).not.toHaveBeenCalled();
  });

  it('soft-deactivates biblioteca when referenced', async () => {
    countEdital.mockResolvedValue(2);
    findOneBib.mockResolvedValue({
      id: 7,
      titulo: 'X',
      corpo: 'Y',
      ativo: true,
    });
    const res = await service.deleteBiblioteca(7);
    expect(res).toMatchObject({ ativo: false });
    expect(deleteBib).not.toHaveBeenCalled();
  });
});

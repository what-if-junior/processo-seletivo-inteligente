import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { GestoresService } from '../gestores/gestores.service';

describe('AuthService', () => {
  let service: AuthService;
  const userService = {
    findByEmail: jest.fn(),
    findByCpf: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('tok'),
  };
  const gestoresService = {
    isGestor: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        { provide: GestoresService, useValue: gestoresService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validates by CPF + senha', async () => {
    const hash = await bcrypt.hash('senha123', 4);
    userService.findByCpf.mockResolvedValue({
      id: 1,
      email: 'joao@teste.com',
      senha: hash,
    });

    const user = await service.validateCredentials({
      CPF: '12345678900',
      senha: 'senha123',
    });
    expect(userService.findByCpf).toHaveBeenCalledWith('12345678900');
    expect(user.email).toBe('joao@teste.com');
    expect((user as { senha?: string }).senha).toBeUndefined();
  });

  it('validates by email + senha', async () => {
    const hash = await bcrypt.hash('senha123', 4);
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@teste.com',
      senha: hash,
    });

    const user = await service.validateCredentials({
      email: 'joao@teste.com',
      senha: 'senha123',
    });
    expect(userService.findByEmail).toHaveBeenCalledWith('joao@teste.com');
    expect(user.id).toBe(1);
  });

  it('rejects bad password with 401', async () => {
    const hash = await bcrypt.hash('senha123', 4);
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@teste.com',
      senha: hash,
    });

    await expect(
      service.validateCredentials({
        email: 'joao@teste.com',
        senha: 'wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an inactive account even with the right password (REQ-2.8)', async () => {
    const hash = await bcrypt.hash('senha123', 4);
    userService.findByEmail.mockResolvedValue({
      id: 1,
      email: 'joao@teste.com',
      senha: hash,
      ativo: false,
    });

    await expect(
      service.validateCredentials({
        email: 'joao@teste.com',
        senha: 'senha123',
      }),
    ).rejects.toThrow('Conta desativada');
  });

  // ─── ISSUE-012: role claim no JWT ─────────────────────────────────────────

  it('login issues role candidato when user is not a gestor', async () => {
    gestoresService.isGestor.mockResolvedValue(false);
    const result = await service.login({ id: 7, email: 'cand@teste.com' });
    expect(gestoresService.isGestor).toHaveBeenCalledWith(7);
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 7,
      email: 'cand@teste.com',
      role: 'candidato',
    });
    expect(result.access_token).toBe('tok');
  });

  it('login issues role gestor when user belongs to Gestores', async () => {
    gestoresService.isGestor.mockResolvedValue(true);
    await service.login({ id: 3, email: 'admin@teste.com' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 3,
      email: 'admin@teste.com',
      role: 'gestor',
    });
  });
});

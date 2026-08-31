import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function makeContext(user?: { role?: string }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('RolesGuard (ISSUE-012)', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows @Public() routes without a user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === IS_PUBLIC_KEY) return true;
      return undefined;
    });
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('allows routes without @Roles (JWT-only behavior unchanged)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: 'candidato' }))).toBe(true);
  });

  it('allows gestor role on @Roles("gestor") route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === ROLES_KEY) return ['gestor'];
      return undefined;
    });
    expect(guard.canActivate(makeContext({ role: 'gestor' }))).toBe(true);
  });

  it('forbids candidato role on @Roles("gestor") route with 403', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === ROLES_KEY) return ['gestor'];
      return undefined;
    });
    expect(() => guard.canActivate(makeContext({ role: 'candidato' }))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids missing role on @Roles("gestor") route with 403', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === ROLES_KEY) return ['gestor'];
      return undefined;
    });
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * RolesGuard — exige que o JWT carregue um dos papéis declarados via @Roles().
 * - Rota @Public() → permite (JwtAuthGuard já liberou; sem req.user).
 * - Sem @Roles() na rota/controller → permite (comportamento atual, JWT-only).
 * - Com @Roles('gestor') → exige req.user.role === 'gestor' (403 caso contrário).
 * Deve rodar DEPOIS do JwtAuthGuard (que popula req.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{
      user?: { role?: string };
    }>();
    const role = user?.role;

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException(
        'Acesso restrito a gestores (papel não autorizado)',
      );
    }
    return true;
  }
}
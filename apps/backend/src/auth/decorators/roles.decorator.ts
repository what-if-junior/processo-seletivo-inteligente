import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Marca rota/controller como restrita a papéis (ex.: 'gestor').
 * Usado com o RolesGuard global (JWT → Roles).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca rota como pública (sem JWT). Usado com o JwtAuthGuard global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

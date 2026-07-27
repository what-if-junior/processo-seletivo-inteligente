import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = [
    'http://localhost:3000',
    ...(process.env.WEB_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  app.enableCors({
    origin: [...new Set(corsOrigins)],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Processo Seletivo Inteligente API')
    .setDescription(
      [
        '## Autenticação',
        '',
        'Rotas **públicas** (sem JWT):',
        '- `POST /auth/login`',
        '- `POST /user` (cadastro)',
        '- `GET /cursos`, `GET /cursos/:id` (catálogo de cursos)',
        '- `GET /editais`, `GET /editais/:id` (só publicados)',
        '- `GET /editais/:id/arquivos/vigente` (PDF vigente, edital publicado)',
        '- `GET /ofertas`, `GET /ofertas/:id` (catálogo de inscrição: `?abertas=true`)',
        '- `GET /etapas-processo`, `GET /etapas-processo/:id`',
        '',
        'Gestão de editais (JWT): `GET /editais/gestao`, `POST /editais/:id/arquivos`, etc.',
        '',
        'Demais rotas exigem header `Authorization: Bearer <access_token>`.',
        'Use o botão **Authorize** neste Swagger com o token retornado pelo login.',
        '',
        'Seeds de desenvolvimento: `joao@teste.com` / `senha123`, `admin@teste.com` / `admin123`.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 5005);
}
bootstrap();

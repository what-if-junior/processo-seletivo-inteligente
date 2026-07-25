import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3000',
      process.env.WEB_ORIGIN,
    ].filter(Boolean) as string[],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Processo Seletivo Inteligente API')
    .setDescription(
      'API do monorepo PSI. Schema SQL em database/ e a fonte da verdade.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 5005);
}
bootstrap();

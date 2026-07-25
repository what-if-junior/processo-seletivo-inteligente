import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { CursosModule } from './cursos/cursos.module';
import { AuthModule } from './auth/auth.module';
import { CandidaturasModule } from './candidaturas/candidaturas.module';
import { DocumentosModule } from './documentos/documentos.module';
import { GestoresModule } from './gestores/gestores.module';
import { EtapasProcessoModule } from './etapas-processo/etapas-processo.module';
import { RecursosModule } from './recursos/recursos.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './auth/guards/jwt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: parseInt(configService.get('DATABASE_PORT') || '5432', 10),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASS'),
        database: configService.get('DATABASE_NAME'),
        autoLoadEntities: true,
        // SQL em database/ e a fonte da verdade; nao reescrever o schema.
        synchronize: false,
      }),
    }),
    CursosModule,
    UserModule,
    AuthModule,
    CandidaturasModule,
    DocumentosModule,
    GestoresModule,
    EtapasProcessoModule,
    RecursosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

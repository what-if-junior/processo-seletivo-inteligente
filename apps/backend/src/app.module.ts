import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from './user/user.module';
import { CursosModule } from './cursos/cursos.module';
import { CampusModule } from './campus/campus.module';
import { AuthModule } from './auth/auth.module';
import { CandidaturasModule } from './candidaturas/candidaturas.module';
import { DocumentosModule } from './documentos/documentos.module';
import { EditaisModule } from './editais/editais.module';
import { GestoresModule } from './gestores/gestores.module';
import { EtapasProcessoModule } from './etapas-processo/etapas-processo.module';
import { OfertasModule } from './ofertas/ofertas.module';
import { RecursosModule } from './recursos/recursos.module';
import { CronogramaModule } from './cronograma/cronograma.module';
import { TiposDocumentoModule } from './tipos-documento/tipos-documento.module';
import { TiposDocumentoBaseModule } from './tipos-documento-base/tipos-documento-base.module';
import { EntregaDocumentalModule } from './entrega-documental/entrega-documental.module';
import { FaixasModule } from './faixas/faixas.module';
import { SocioeconomicoModule } from './socioeconomico/socioeconomico.module';
import { LotesModule } from './lotes/lotes.module';
import { ChamadasModule } from './chamadas/chamadas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SchemaExtrasModule } from './schema-extras/schema-extras.module';
import { SchemaFoundationModule } from './schema-foundation/schema-foundation.module';
import { ProtocolosModule } from './protocolos/protocolos.module';
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
    CampusModule,
    UserModule,
    AuthModule,
    CandidaturasModule,
    ProtocolosModule,
    DocumentosModule,
    EditaisModule,
    OfertasModule,
    CronogramaModule,
    TiposDocumentoModule,
    TiposDocumentoBaseModule,
    EntregaDocumentalModule,
    FaixasModule,
    SocioeconomicoModule,
    LotesModule,
    ChamadasModule,
    DashboardModule,
    GestoresModule,
    EtapasProcessoModule,
    RecursosModule,
    SchemaExtrasModule,
    SchemaFoundationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantInteracao } from './entities/assistant-interacao.entity';
import { AssistantIngestao } from './entities/assistant-ingestao.entity';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { HubModule } from '../hub/hub.module';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssistantInteracao,
      AssistantIngestao,
      Edital,
      Candidatura,
      User,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_TO_SIGN'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    HubModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CursosModule } from './cursos/cursos.module';

@Module({
  imports: [UserModule, CursosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { appConfig } from './config/app/app.config';
import { ConfigType } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  await app.listen(configService.port || 3001);
}
bootstrap();

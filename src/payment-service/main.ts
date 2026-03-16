import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService} from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PaymentsModule } from './payments.module';
import { IPaymentsServiceConfig } from '../config/payments-service/payments-service.types';
import { PAYMENTS_PACKAGE_NAME } from '../common/grpc/grpc.constants';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule);

    const configService = app.get(ConfigService);
   
    const url = configService.get<IPaymentsServiceConfig['paymentsGrpcBindUrl']>('paymentsServiceConfig.paymentsGrpcBindUrl');

    const grpc = app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.GRPC,
        options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(process.cwd(), 'proto', 'payments', 'v1', 'payments.proto'),
            url
        }
    });

    await grpc.listen();
    await app.init();
    console.log(`payments-service gRPC started on ${url}`);
}

bootstrap();

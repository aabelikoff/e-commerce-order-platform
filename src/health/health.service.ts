import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'net';
import { DataSource } from 'typeorm';
import { IPaymentsServiceConfig } from 'src/config/payments-service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async getReadiness() {
    const checks: Record<string, 'up' | 'down'> = {
      database: 'down',
      payments: 'down',
    };

    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
      await this.checkPaymentsService();
      checks.payments = 'up';

      return { status: 'ready', checks };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
      });
    }
  }

  private async checkPaymentsService(): Promise<void> {
    const paymentsGrpcUrl =
      this.configService.get<IPaymentsServiceConfig['paymentsGrpcUrl']>(
        'paymentsServiceConfig.paymentsGrpcUrl',
      ) ?? 'localhost:5021';

    const { host, port } = this.parseHostAndPort(paymentsGrpcUrl);

    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();
      const timeoutMs = 1500;

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(timeoutMs);

      socket.once('connect', () => {
        cleanup();
        resolve();
      });

      socket.once('timeout', () => {
        cleanup();
        reject(new Error('Payments service timeout'));
      });

      socket.once('error', (error) => {
        cleanup();
        reject(error);
      });

      socket.connect(port, host);
    });
  }

  private parseHostAndPort(address: string): { host: string; port: number } {
    const sanitized = address.replace(/^https?:\/\//, '');
    const [host, portString] = sanitized.split(':');

    return {
      host: host || 'localhost',
      port: Number(portString || '5021'),
    };
  }
}

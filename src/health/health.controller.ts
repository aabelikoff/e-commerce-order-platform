import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('ready')
  getReady() {
    return { status: 'ready' };
  }
}

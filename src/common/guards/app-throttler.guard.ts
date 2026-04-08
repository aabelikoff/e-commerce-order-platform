import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlingPolicyName } from '../decorators/throttle-policy.decorator';
import { THROTTLING_POLICY_METADATA_KEY } from '../decorators/throttle-policy.decorator';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const selectedPolicy =
      this.reflector.getAllAndOverride<ThrottlingPolicyName | undefined>(
        THROTTLING_POLICY_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      );

    const originalThrottlers = this.throttlers;
    this.throttlers = this.throttlers.filter(
      (throttler) =>
        throttler.name === 'default' ||
        (selectedPolicy !== undefined && throttler.name === selectedPolicy),
    );

    try {
      return await super.canActivate(context);
    } finally {
      this.throttlers = originalThrottlers;
    }
  }
}

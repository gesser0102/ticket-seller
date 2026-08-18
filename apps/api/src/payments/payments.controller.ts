import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PaymentResultDto, SessionUserDto } from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RegisteredGuard } from '../common/guards/registered.guard';
import { PayDto } from './dto/pay.dto';
import { PaymentsService } from './payments.service';

@Controller('orders/:id/pay')
@UseGuards(RegisteredGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async pay(
    @Param('id') orderId: string,
    @Body() dto: PayDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<PaymentResultDto>> {
    const result = await this.paymentsService.pay(
      orderId,
      user.id,
      dto.paymentMethod,
      dto.cardNumber,
    );
    const message =
      result.status === 'approved'
        ? 'Pagamento aprovado! Seus ingressos foram emitidos.'
        : 'Pagamento recusado. Os assentos foram liberados.';
    return new ApiResult(result, message);
  }
}

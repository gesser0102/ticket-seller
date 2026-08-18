import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { OrderDto, SessionUserDto } from '@ticket-seller/shared';
import { ApiResult } from '../common/http/api-result';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnonymousIdentityGuard } from '../common/guards/anonymous-identity.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { SetTicketTypesDto } from './dto/set-ticket-types.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AnonymousIdentityGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrderDto>> {
    const order = await this.ordersService.createOrder(
      dto.screeningId,
      dto.seatIds,
      user.id,
    );
    return new ApiResult(
      order,
      'Reserva criada. Você tem 10 minutos para pagar.',
    );
  }

  @Get(':id')
  async get(
    @Param('id') id: string,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrderDto>> {
    const order = await this.ordersService.getOwnOrder(id, user.id);
    return new ApiResult(order);
  }

  @Patch(':id/ticket-types')
  async setTicketTypes(
    @Param('id') id: string,
    @Body() dto: SetTicketTypesDto,
    @CurrentUser() user: SessionUserDto,
  ): Promise<ApiResult<OrderDto>> {
    const order = await this.ordersService.setTicketTypes(id, user.id, dto);
    return new ApiResult(order);
  }
}

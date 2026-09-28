import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import { TicketUrgency } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @ApiProperty({
    example: 'Payment deducted but order failed',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    example:
      'The payment was deducted from my account but the order was not created.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: TicketUrgency,
    example: TicketUrgency.HIGH,
  })
  @IsEnum(TicketUrgency)
  urgency: TicketUrgency;
}
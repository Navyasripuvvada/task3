import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { TicketStatus } from '../schemas/ticket.schema';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    example: 'Updated ticket subject',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({
    example: 'Updated ticket description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
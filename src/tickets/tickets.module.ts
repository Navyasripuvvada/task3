
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Ticket,
  TicketSchema,
} from './schemas/ticket.schema';

import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Ticket.name,
        schema: TicketSchema,
      },
    ]),
    AuthModule,
  ],

  controllers: [
    TicketsController,
  ],

  providers: [
    TicketsService,
  ],

  exports: [
    TicketsService,
  ],
})
export class TicketsModule {}
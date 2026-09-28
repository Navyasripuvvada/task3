import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type  { Request } from 'express';

import { TicketsService } from './tickets.service';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';

import { Roles } from '../auth/decorators/roles.decorator';

import {
  UserRole,
} from '../users/schemas/user.schema';


interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('Tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
  ) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Create a new ticket',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
  })
  async create(
    @Body() dto: CreateTicketDto,
    @Req() req: Request,
  ) {
    return this.ticketsService.create(
      dto,
      req['user'],
    );
  }

  @Get('my')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({
    summary: 'Get my tickets',
  })
  async findMyTickets(
    @Req() req: Request,
  ) {
    return this.ticketsService.findMyTickets(
      req['user'].sub,
    );
  }

  @Get('queue')
  @Roles(UserRole.AGENT)
  @ApiOperation({
    summary: 'Get open ticket queue',
  })
  async findQueue() {
    return this.ticketsService.findQueue();
  }


 @Get('assigned')
@Roles(UserRole.AGENT)
@ApiOperation({
  summary: 'Get tickets assigned to the current agent',
  description:
    'Returns all In Progress tickets currently assigned to the authenticated agent.',
})
async assigned(@Req() request: AuthenticatedRequest) {
  return this.ticketsService.findAssigned(
    request.user.sub,
  );
}

  @Get(':ticketId')
  @Roles(
    UserRole.CUSTOMER,
    UserRole.AGENT,
  )
  @ApiOperation({
    summary: 'Get a ticket by ticket ID',
  })
  async findOne(
    @Param('ticketId') ticketId: string,
    @Req() req: Request,
  ) {
    return this.ticketsService.findOne(
      ticketId,
      req['user'],
    );
  }

 @Patch(':ticketId')
@Roles(UserRole.AGENT)
@ApiOperation({ summary: 'Update an assigned ticket' })
@ApiResponse({
  status: 200,
  description: 'Ticket updated successfully',
})
@ApiResponse({
  status: 403,
  description: 'Agent is not assigned to this ticket',
})
@ApiResponse({
  status: 409,
  description: 'Invalid ticket state or status transition',
})
async update(
  @Param('ticketId') ticketId: string,
  @Body() dto: UpdateTicketDto,
  @Req() req: Request,
) {
  return this.ticketsService.update(
    ticketId,
    dto,
    req['user'],
  );
}



@Post(':ticketId/claim')
@Roles(UserRole.AGENT)
@ApiOperation({
  summary: 'Claim an open ticket',
  description:
    'Atomically claims an open ticket for the current agent. Only one agent can claim a ticket.',
})
@ApiResponse({
  status: 200,
  description: 'Ticket claimed successfully',
})
@ApiResponse({
  status: 404,
  description: 'Ticket not found',
})
@ApiResponse({
  status: 409,
  description:
    'Ticket is already claimed or unavailable',
})
async claimTicket(
  @Param('ticketId') ticketId: string,
  @Req() req: Request,
) {
  return this.ticketsService.claimTicket(
    ticketId,
    req['user'],
  );
}



@Post(':ticketId/heartbeat')
@Roles(UserRole.AGENT)
@ApiOperation({
  summary: 'Send ticket heartbeat',
  description:
    'Extends the ticket lock by 3 minutes for the assigned agent.',
})
@ApiResponse({
  status: 200,
  description: 'Heartbeat successful',
})
@ApiResponse({
  status: 403,
  description:
    'Agent is not assigned to this ticket',
})
@ApiResponse({
  status: 409,
  description:
    'Ticket lock has expired',
})
async heartbeat(
  @Param('ticketId') ticketId: string,
  @Req() req: Request,
) {
  return this.ticketsService.heartbeat(
    ticketId,
    req['user'],
  );
}

@Post(':ticketId/resolve')
@Roles(UserRole.AGENT)
@ApiOperation({ summary: 'Resolve an assigned ticket' })
@ApiResponse({
  status: 200,
  description: 'Ticket resolved successfully',
})
@ApiResponse({
  status: 409,
  description: 'Ticket cannot be resolved',
})
async resolveTicket(
  @Param('ticketId') ticketId: string,
  @Req() req: Request,
) {
  return this.ticketsService.resolveTicket(
    ticketId,
    req['user'],
  );
}
}
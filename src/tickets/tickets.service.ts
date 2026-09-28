import {
    ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Ticket,
  TicketDocument,
  TicketStatus,
} from './schemas/ticket.schema';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

import {
  UserRole,
} from '../users/schemas/user.schema';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
  ) {}

  async create(
    dto: CreateTicketDto,
    user: {
      sub: string;
      email: string;
      role: string;
    },
  ) {
    const now = new Date();

    const slaDeadline = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );

    const ticketId = await this.generateTicketId();

    const ticket = await this.ticketModel.create({
      ticketId,

      customerName: user.email.split('@')[0],

      customerEmail: user.email,

      subject: dto.subject,

      description: dto.description,

      createdAt: now,

      urgency: dto.urgency,

      status: TicketStatus.OPEN,

      customerId: user.sub,

      slaDeadline,

      isOverdue: false,
    });

    return {
      message: 'Ticket created successfully',
      ticket,
    };
  }

  async findMyTickets(
    userId: string,
  ) {
    return this.ticketModel
      .find({
        customerId: userId,
      })
      .sort({
        createdAt: -1,
      });
  }

 async findQueue() {
  const now = new Date();

  // Make sure tickets whose SLA has expired are flagged
  // even before the background scheduler runs.
  await this.ticketModel.updateMany(
    {
      status: { $ne: TicketStatus.RESOLVED },
      slaDeadline: { $lte: now },
      isOverdue: false,
    },
    {
      $set: {
        isOverdue: true,
      },
    },
  );

  const tickets = await this.ticketModel
    .find({
      status: TicketStatus.OPEN,
      assignedAgent: { $exists: false },
    })
    .sort({ urgency: -1, createdAt: 1 })
    .lean();

  return tickets.map((ticket) => {
    const remainingMilliseconds =
      ticket.slaDeadline.getTime() - now.getTime();

    return {
      ...ticket,
      timeRemainingSeconds: Math.max(
        0,
        Math.floor(remainingMilliseconds / 1000),
      ),
      overdue:
        ticket.isOverdue ||
        remainingMilliseconds <= 0,
    };
  });
}
  



async findAssigned(agentId: string) {
  const now = new Date();

  await this.ticketModel.updateMany(
    {
      status: { $ne: TicketStatus.RESOLVED },
      slaDeadline: { $lte: now },
      isOverdue: false,
    },
    {
      $set: {
        isOverdue: true,
      },
    },
  );

  const tickets = await this.ticketModel
    .find({
      assignedAgent: agentId,
      status: TicketStatus.IN_PROGRESS,
    })
    .sort({ createdAt: 1 })
    .lean();

  return tickets.map((ticket) => {
    const remainingMilliseconds =
      ticket.slaDeadline.getTime() - now.getTime();

    return {
      ...ticket,
      timeRemainingSeconds: Math.max(
        0,
        Math.floor(remainingMilliseconds / 1000),
      ),
      overdue:
        ticket.isOverdue ||
        remainingMilliseconds <= 0,
    };
  });
}

 

  async findOne(
    ticketId: string,
    user: {
      sub: string;
      role: string;
    },
  ) {
    const ticket =
      await this.ticketModel.findOne({
        ticketId,
      });

    if (!ticket) {
      throw new NotFoundException(
        'Ticket not found',
      );
    }
    if (
        !ticket.isOverdue &&
        ticket.slaDeadline <= new Date() &&
        ticket.status !== TicketStatus.RESOLVED
    ) {
        ticket.isOverdue = true;
        await ticket.save();
    }

    if (
      user.role === UserRole.CUSTOMER &&
      ticket.customerId?.toString() !== user.sub
    ) {
      throw new ForbiddenException(
        'You can only access your own tickets',
      );
    }

    return ticket;
  }

  async update(
  ticketId: string,
  dto: UpdateTicketDto,
  user: {
    sub: string;
    email: string;
    role: string;
  },
) {
  const ticket = await this.ticketModel.findOne({ ticketId });

  if (!ticket) {
    throw new NotFoundException('Ticket not found');
  }

  // Only the assigned agent can modify the ticket.
  if (ticket.assignedAgent?.toString() !== user.sub) {
    throw new ForbiddenException(
      'You are not assigned to this ticket',
    );
  }

  // A resolved ticket cannot be modified.
  if (ticket.status === TicketStatus.RESOLVED) {
    throw new ConflictException(
      'Resolved tickets cannot be modified',
    );
  }

  // Do not allow an expired lock to be used.
  if (
    ticket.lockExpiresAt &&
    ticket.lockExpiresAt <= new Date()
  ) {
    throw new ConflictException(
      'Ticket lock has expired',
    );
  }

  // Only allow these status transitions:
  //
  // Open -> In Progress
  // In Progress -> Resolved
  //
  // Other transitions are rejected.
  if (dto.status && dto.status !== ticket.status) {
    const validTransition =
      ticket.status === TicketStatus.OPEN &&
      dto.status === TicketStatus.IN_PROGRESS;

    if (!validTransition) {
      throw new ConflictException(
        `Invalid status transition: ${ticket.status} -> ${dto.status}`,
      );
    }
  }

  if (dto.subject !== undefined) {
    ticket.subject = dto.subject;
  }

  if (dto.description !== undefined) {
    ticket.description = dto.description;
  }

  if (dto.status !== undefined) {
    ticket.status = dto.status;
  }

  await ticket.save();

  return {
    message: 'Ticket updated successfully',
    ticket,
  };
}

  private async generateTicketId(): Promise<string> {
    const lastTicket =
      await this.ticketModel
        .findOne()
        .sort({
          createdAt: -1,
        })
        .select('ticketId');

    if (!lastTicket) {
      return 'TKT-9001';
    }

    const lastNumber =
      Number(
        lastTicket.ticketId.replace(
          'TKT-',
          '',
        ),
      ) || 9000;

    return `TKT-${lastNumber + 1}`;
  }

  async claimTicket(
    ticketId: string,
    user: {
        sub: string;
        email: string;
        role: string;
    },
    ) {
    const now = new Date();

    const lockExpiresAt = new Date(
        now.getTime() + 3 * 60 * 1000,
    );

    const ticket =
        await this.ticketModel.findOneAndUpdate(
        {
            ticketId,
            status: TicketStatus.OPEN,

            $and: [
            {
                $or: [
                {
                    assignedAgent: {
                    $exists: false,
                    },
                },
                {
                    assignedAgent: null,
                },
                ],
            },
            {
                $or: [
                {
                    lockExpiresAt: {
                    $exists: false,
                    },
                },
                {
                    lockExpiresAt: null,
                },
                {
                    lockExpiresAt: {
                    $lte: now,
                    },
                },
                ],
            },
            ],
        },

        {
            $set: {
            status: TicketStatus.IN_PROGRESS,
            assignedAgent: user.sub,
            lockedAt: now,
            lockExpiresAt,
            },
        },

        {
            new: true,
        },
        );

    if (!ticket) {
        const existingTicket =
        await this.ticketModel.findOne({
            ticketId,
        });

        if (!existingTicket) {
        throw new NotFoundException(
            'Ticket not found',
        );
        }

        throw new ConflictException(
        'Ticket is already claimed or unavailable',
        );
    }

    return {
        message: 'Ticket claimed successfully',
        ticket,
    };
    }

    async heartbeat(
    ticketId: string,
    user: {
        sub: string;
        email: string;
        role: string;
    },
    ) {
    const now = new Date();

    const lockExpiresAt = new Date(
        now.getTime() + 3 * 60 * 1000,
    );

    const ticket =
        await this.ticketModel.findOneAndUpdate(
        {
            ticketId,

            status: TicketStatus.IN_PROGRESS,

            assignedAgent: user.sub,

            lockExpiresAt: {
            $gt: now,
            },
        },

        {
            $set: {
            lockedAt: now,
            lockExpiresAt,
            },
        },

        {
            new: true,
        },
        );

    if (!ticket) {
        const existingTicket =
        await this.ticketModel.findOne({
            ticketId,
        });

        if (!existingTicket) {
        throw new NotFoundException(
            'Ticket not found',
        );
        }

        if (
        existingTicket.assignedAgent?.toString() !==
        user.sub
        ) {
        throw new ForbiddenException(
            'You are not assigned to this ticket',
        );
        }

        throw new ConflictException(
        'Ticket lock has expired',
        );
    }

    return {
        message: 'Heartbeat successful',
        lockExpiresAt: ticket.lockExpiresAt,
    };
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async releaseExpiredTickets() {
    const now = new Date();

    const result =
        await this.ticketModel.updateMany(
        {
            status: TicketStatus.IN_PROGRESS,

            lockExpiresAt: {
            $lte: now,
            },
        },
        {
            $set: {
            status: TicketStatus.OPEN,
            },

            $unset: {
            assignedAgent: '',
            lockedAt: '',
            lockExpiresAt: '',
            },
        },
        );

    if (result.modifiedCount > 0) {
        console.log(
        `Released ${result.modifiedCount} expired ticket(s) back to queue`,
        );
    }
    }
    @Cron(CronExpression.EVERY_10_SECONDS)
    async markOverdueTickets() {
        const now = new Date();

        const result =
            await this.ticketModel.updateMany(
            {
                slaDeadline: {
                $lte: now,
                },

                isOverdue: false,

                status: {
                $ne: TicketStatus.RESOLVED,
                },
            },
            {
                $set: {
                isOverdue: true,
                },
            },
            );

        if (result.modifiedCount > 0) {
            console.log(
            `Marked ${result.modifiedCount} ticket(s) as overdue`,
            );
        }
    }
    async resolveTicket(
        ticketId: string,
        user: {
            sub: string;
            email: string;
            role: string;
        },
        ) {
        const now = new Date();

        const ticket = await this.ticketModel.findOneAndUpdate(
            {
            ticketId,
            status: TicketStatus.IN_PROGRESS,
            assignedAgent: user.sub,
            lockExpiresAt: { $gt: now },
            },
            {
            $set: {
                status: TicketStatus.RESOLVED,
                resolvedAt: now,
            },
            $unset: {
                lockedAt: '',
                lockExpiresAt: '',
            },
            },
            { new: true },
        );

        if (!ticket) {
            const existingTicket = await this.ticketModel.findOne({ ticketId });

            if (!existingTicket) {
            throw new NotFoundException('Ticket not found');
            }

            if (
            existingTicket.assignedAgent?.toString() !== user.sub
            ) {
            throw new ForbiddenException(
                'You are not assigned to this ticket',
            );
            }

            if (existingTicket.status === TicketStatus.RESOLVED) {
            throw new ConflictException(
                'Ticket is already resolved',
            );
            }

            if (
            existingTicket.lockExpiresAt &&
            existingTicket.lockExpiresAt <= now
            ) {
            throw new ConflictException(
                'Ticket lock has expired',
            );
            }

            throw new ConflictException(
            'Ticket cannot be resolved in its current state',
            );
        }

        return {
            message: 'Ticket resolved successfully',
            ticket,
        };
    }
}
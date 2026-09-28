import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RolesGuard } from './guard/roles.guard';

import { UserRole } from '../users/schemas/user.schema';

@ApiTags('RBAC Test')
@Controller('rbac-test')
export class AuthTestController {
  @Get('agent')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.AGENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Agent-only test endpoint',
  })
  agentOnly() {
    return {
      message:
        'You are authorized as an AGENT',
    };
  }

  @Get('customer')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Customer-only test endpoint',
  })
  customerOnly() {
    return {
      message:
        'You are authorized as a CUSTOMER',
    };
  }
}


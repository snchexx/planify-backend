import { Reflector } from '@nestjs/core';
import { Role } from '../users/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function canAccess(requiredRoles: Role[], userRole: Role): boolean {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    };

    return guard.canActivate(context as never);
  }

  it('allows a user with a required role', () => {
    expect(canAccess([Role.ADMIN], Role.ADMIN)).toBe(true);
  });

  it('denies a user without a required role', () => {
    expect(canAccess([Role.ADMIN], Role.USER)).toBe(false);
  });
});

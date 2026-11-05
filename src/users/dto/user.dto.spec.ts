import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './create-user.dto';

describe('User DTO validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('normalizes valid emails and accepts the supported roles', async () => {
    const result = await validationPipe.transform(
      {
        email: '  USER@example.com ',
        password: 'secure-password',
        identificacion: ' 1234567890 ',
        nombres: ' Ana María ',
        apellidos: ' Pérez Gómez ',
        role: 'admin',
      },
      { type: 'body', metatype: CreateUserDto },
    );

    expect(result).toMatchObject({
      email: 'user@example.com',
      identificacion: '1234567890',
      nombres: 'Ana María',
      apellidos: 'Pérez Gómez',
      role: 'admin',
    });
  });

  it('rejects unknown fields instead of silently accepting them', async () => {
    await expect(
      validationPipe.transform(
        {
          email: 'user@example.com',
          password: 'secure-password',
          identificacion: '1234567890',
          nombres: 'Ana',
          apellidos: 'Pérez',
          isAdmin: true,
        },
        { type: 'body', metatype: CreateUserDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects passwords that exceed bcrypt byte limits', async () => {
    await expect(
      validationPipe.transform(
        {
          email: 'user@example.com',
          password: 'á'.repeat(37),
          identificacion: '1234567890',
          nombres: 'Ana',
          apellidos: 'Pérez',
        },
        { type: 'body', metatype: CreateUserDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

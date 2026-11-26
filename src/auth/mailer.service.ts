import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const host = configService.getOrThrow<string>('SMTP_HOST');
    const port = Number(configService.getOrThrow<string>('SMTP_PORT'));
    const secureValue = configService
      .getOrThrow<string>('SMTP_SECURE')
      .toLowerCase();
    const user = configService.getOrThrow<string>('SMTP_USER');
    const password = configService
      .getOrThrow<string>('SMTP_APP_PASSWORD')
      .replace(/\s/g, '');
    this.from = configService.getOrThrow<string>('SMTP_FROM');

    if (!Number.isSafeInteger(port) || port <= 0) {
      throw new Error('SMTP_PORT debe ser un puerto válido');
    }
    if (secureValue !== 'true' && secureValue !== 'false') {
      throw new Error('SMTP_SECURE debe ser true o false');
    }
    if (!password) {
      throw new Error('SMTP_APP_PASSWORD no puede estar vacío');
    }

    this.transporter = createTransport({
      host,
      port,
      secure: secureValue === 'true',
      auth: { user, pass: password },
    });
  }

  async sendPasswordResetCode(
    recipient: string,
    code: string,
    expiresInMinutes: number,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: recipient,
      subject: 'Código para restablecer tu contraseña de Planify',
      text: `Tu código de recuperación es ${code}. Expira en ${expiresInMinutes} minutos. Si no solicitaste este cambio, ignora este correo.`,
      html: `<p>Usa este código para restablecer tu contraseña de Planify:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>El código expira en ${expiresInMinutes} minutos. Si no solicitaste este cambio, ignora este correo.</p>`,
    });
  }
}

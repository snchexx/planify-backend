import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('password_reset_codes')
export class PasswordResetCode {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'code_hash', type: 'varchar', length: 60 })
  codeHash: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'requested_at', type: 'datetime' })
  requestedAt: Date;
}

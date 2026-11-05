import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.enum';
import { UserStatus } from './user-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 50, nullable: true })
  identificacion: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombres: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apellidos: string | null;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  estado: UserStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

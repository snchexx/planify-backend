import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('solicitud_ia')
export class SolicitudIa {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @Column({ type: 'text' })
  pregunta: string;

  @CreateDateColumn({ name: 'fecha_hora', type: 'datetime' })
  fechaHora: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id' })
  usuario: User;
}

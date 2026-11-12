import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudIa } from './solicitud-ia.entity';

@Entity('respuesta_ia')
export class RespuestaIa {
  @PrimaryGeneratedColumn({ name: 'id_respuesta' })
  idRespuesta: number;

  @Column({ type: 'text' })
  respuesta: string;

  @CreateDateColumn({
    name: 'fechayhora_respuesta',
    type: 'datetime',
  })
  fechaYHoraRespuesta: Date;

  @OneToOne(() => SolicitudIa, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_solicitud', referencedColumnName: 'idSolicitud' })
  solicitud: SolicitudIa;
}

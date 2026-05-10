import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Disponibilite {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  medecinId: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ default: true })
  isAvailable: boolean;
}
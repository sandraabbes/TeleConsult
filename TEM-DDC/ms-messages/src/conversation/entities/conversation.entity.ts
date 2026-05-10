import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MessageEntity } from './message.entity';

@Entity('conversations')
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  doctorId: string;

  @Column()
  patientId: string;

  @UpdateDateColumn()
  lastMessageAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages: MessageEntity[];
}

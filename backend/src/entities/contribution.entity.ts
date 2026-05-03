import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { School } from './school.entity';
import { AppointmentType } from './appointment-type.entity';
import { Person } from './person.entity';
import { MediaFile } from './media-file.entity';

export enum ContributionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

@Entity('contributions')
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'event_date', type: 'date' })
  eventDate: string;

  @Index()
  @Column({ name: 'appointment_type_id', nullable: true })
  appointmentTypeId: string | null;

  @ManyToOne(() => AppointmentType, (at) => at.contributions, { nullable: true })
  @JoinColumn({ name: 'appointment_type_id' })
  appointmentType: AppointmentType | null;

  @Index()
  @Column({ name: 'school_id', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, (school) => school.contributions, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school: School | null;

  @Index()
  @Column({ name: 'submitted_by' })
  submittedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by' })
  submittedByUser: User;

  @Index()
  @Column({
    type: 'enum',
    enum: ContributionStatus,
    default: ContributionStatus.DRAFT,
  })
  status: ContributionStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @ManyToMany(() => Person, (person) => person.contributions)
  @JoinTable({
    name: 'contribution_persons',
    joinColumn: { name: 'contribution_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'person_id', referencedColumnName: 'id' },
  })
  persons: Person[];

  @OneToMany(() => MediaFile, (media) => media.contribution)
  mediaFiles: MediaFile[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

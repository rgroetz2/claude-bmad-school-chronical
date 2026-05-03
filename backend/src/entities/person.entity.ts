import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { School } from './school.entity';
import { Contribution } from './contribution.entity';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', length: 255 })
  lastName: string;

  @Index()
  @Column({ name: 'school_id', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, (school) => school.persons, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school: School | null;

  @ManyToMany(() => Contribution, (contribution) => contribution.persons)
  contributions: Contribution[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'anonymised_at', type: 'timestamptz', nullable: true })
  anonymisedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

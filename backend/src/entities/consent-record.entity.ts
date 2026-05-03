import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Contribution } from './contribution.entity';
import { MediaFile } from './media-file.entity';

@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'contribution_id' })
  contributionId: string;

  @ManyToOne(() => Contribution)
  @JoinColumn({ name: 'contribution_id' })
  contribution: Contribution;

  @Column({ name: 'media_file_id', nullable: true })
  mediaFileId: string | null;

  @OneToOne(() => MediaFile, (media) => media.consentRecord, { nullable: true })
  @JoinColumn({ name: 'media_file_id' })
  mediaFile: MediaFile | null;

  // Snapshot of the exact consent text shown at time of confirmation
  @Column({ name: 'consent_text_snapshot', type: 'text' })
  consentTextSnapshot: string;

  @Column({ name: 'consent_text_version', length: 20, default: 'v1' })
  consentTextVersion: string;

  @Column({ name: 'confirmed_at', type: 'timestamptz' })
  confirmedAt: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

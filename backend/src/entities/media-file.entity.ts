import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contribution } from './contribution.entity';
import { ConsentRecord } from './consent-record.entity';

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'contribution_id' })
  contributionId: string;

  @ManyToOne(() => Contribution, (contribution) => contribution.mediaFiles)
  @JoinColumn({ name: 'contribution_id' })
  contribution: Contribution;

  @Column({ name: 'original_filename', length: 255, nullable: true })
  originalFilename: string | null;

  // MinIO object key — nulled after GDPR anonymisation
  @Column({ name: 'storage_key', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size_bytes', type: 'integer', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'width_px', type: 'integer', nullable: true })
  widthPx: number | null;

  @Column({ name: 'height_px', type: 'integer', nullable: true })
  heightPx: number | null;

  @OneToOne(() => ConsentRecord, (consent) => consent.mediaFile, {
    nullable: true,
  })
  consentRecord: ConsentRecord | null;

  // Set when image is purged from MinIO (GDPR erasure)
  @Column({ name: 'anonymised_at', type: 'timestamptz', nullable: true })
  anonymisedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Angular Material
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { environment } from '../../../../environments/environment';
import { AdminUser, CreateUserRequest } from '../../../core/models/admin.model';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  private readonly apiUrl = `${environment.apiUrl}/users`;

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly createLoading = signal(false);
  readonly showCreateForm = signal(false);

  readonly displayedColumns = [
    'username',
    'email',
    'role',
    'status',
    'actions',
  ];

  readonly roleOptions: { value: UserRole; label: string }[] = [
    { value: 'teacher', label: 'Lehrkraft' },
    { value: 'coordinator', label: 'Koordinator/in' },
    { value: 'admin', label: 'Administrator/in' },
  ];

  createForm: FormGroup = this.fb.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    temporaryPassword: [
      '',
      [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
    ],
    role: ['teacher', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.http.get<AdminUser[]>(this.apiUrl).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify('Fehler beim Laden der Benutzer.', 'error');
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.createForm.reset({ role: 'teacher' });
    }
  }

  onCreateUser(): void {
    if (this.createForm.invalid || this.createLoading()) return;

    this.createLoading.set(true);
    const body: CreateUserRequest = this.createForm.value;

    this.http.post<AdminUser>(this.apiUrl, body).subscribe({
      next: (newUser) => {
        this.users.update((list) => [newUser, ...list]);
        this.createLoading.set(false);
        this.showCreateForm.set(false);
        this.createForm.reset({ role: 'teacher' });
        this.notify(
          `Konto für "${newUser.username}" erstellt. Beim ersten Login muss das Passwort geändert werden.`,
          'success',
        );
      },
      error: (err) => {
        this.createLoading.set(false);
        const msg =
          err?.error?.message ?? 'Fehler beim Erstellen des Benutzerkontos.';
        this.notify(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
      },
    });
  }

  onToggleActive(user: AdminUser): void {
    const newActive = !user.isActive;
    const action = newActive ? 'aktiviert' : 'deaktiviert';

    this.http
      .patch<AdminUser>(`${this.apiUrl}/${user.id}`, { isActive: newActive })
      .subscribe({
        next: (updated) => {
          this.users.update((list) =>
            list.map((u) => (u.id === updated.id ? updated : u)),
          );
          this.notify(`Konto "${user.username}" wurde ${action}.`, 'success');
        },
        error: () => this.notify(`Fehler beim Aktualisieren des Kontos.`, 'error'),
      });
  }

  onChangeRole(user: AdminUser, newRole: UserRole): void {
    this.http
      .patch<AdminUser>(`${this.apiUrl}/${user.id}`, { role: newRole })
      .subscribe({
        next: (updated) => {
          this.users.update((list) =>
            list.map((u) => (u.id === updated.id ? updated : u)),
          );
          this.notify(`Rolle von "${user.username}" geändert.`, 'success');
        },
        error: () => this.notify('Fehler beim Ändern der Rolle.', 'error'),
      });
  }

  onResetPassword(user: AdminUser): void {
    this.http
      .post(`${this.apiUrl}/${user.id}/reset-password`, {})
      .subscribe({
        next: () =>
          this.notify(
            `Passwort-Reset-E-Mail an "${user.email}" gesendet.`,
            'success',
          ),
        error: () =>
          this.notify('Fehler beim Senden der Reset-E-Mail.', 'error'),
      });
  }

  roleLabel(role: UserRole): string {
    return this.roleOptions.find((r) => r.value === role)?.label ?? role;
  }

  private notify(
    message: string,
    type: 'success' | 'error' | 'info',
  ): void {
    this.snackBar.open(message, 'OK', {
      duration: 5000,
      panelClass:
        type === 'error'
          ? ['snack-error']
          : type === 'success'
            ? ['snack-success']
            : [],
    });
  }
}

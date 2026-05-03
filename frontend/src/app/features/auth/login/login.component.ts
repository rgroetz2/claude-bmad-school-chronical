import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);

  get usernameControl() {
    return this.form.get('username')!;
  }

  get passwordControl() {
    return this.form.get('password')!;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .login({
        username: this.usernameControl.value.trim(),
        password: this.passwordControl.value,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.user.forcePasswordChange) {
            this.router.navigate(['/change-password']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.loading.set(false);
          const status = err?.status;
          if (status === 401) {
            this.errorMessage.set(
              'Benutzername oder Passwort ist falsch.',
            );
          } else if (status === 429) {
            this.errorMessage.set(
              'Zu viele Anmeldeversuche. Bitte warten Sie kurz.',
            );
          } else {
            this.errorMessage.set(
              'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
            );
          }
        },
      });
  }
}

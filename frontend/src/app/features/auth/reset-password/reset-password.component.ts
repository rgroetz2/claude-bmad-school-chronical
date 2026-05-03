import { Component, inject, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { environment } from '../../../../environments/environment';

/** Custom validator: confirms that newPassword and confirmPassword match */
function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private token: string | null = null;

  form: FormGroup = this.fb.group(
    {
      newPassword: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(128)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tokenMissing = signal(false);
  readonly passwordVisible = signal(false);
  readonly confirmVisible = signal(false);

  get newPasswordControl() {
    return this.form.get('newPassword')!;
  }
  get confirmPasswordControl() {
    return this.form.get('confirmPassword')!;
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.tokenMissing.set(true);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }
  toggleConfirmVisibility(): void {
    this.confirmVisible.update((v) => !v);
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading() || !this.token) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.http
      .post(`${environment.apiUrl}/auth/password-reset/confirm`, {
        token: this.token,
        newPassword: this.newPasswordControl.value,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          // Redirect to login after 3 seconds
          setTimeout(() => this.router.navigate(['/login']), 3000);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.message;
          if (typeof msg === 'string') {
            this.errorMessage.set(msg);
          } else {
            this.errorMessage.set(
              'Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen an.',
            );
          }
        },
      });
  }
}

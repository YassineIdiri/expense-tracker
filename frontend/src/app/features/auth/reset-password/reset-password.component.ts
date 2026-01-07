import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { ui } from '../../../core/utils/zoneless-ui';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  year = new Date().getFullYear();

  loading = false;
  error = '';
  success = false;
  showPassword = false;
  showConfirm = false;

  form;

  private readonly U;

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private route: ActivatedRoute,
    private router: Router,
    cdr: ChangeDetectorRef
  ) {
    this.U = ui(cdr);

    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    this.form = this.fb.group(
      {
        token: [token, Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordsMatch }
    );
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirm(): void {
    this.showConfirm = !this.showConfirm;
  }

  get passwordMismatch(): boolean {
    return this.form?.hasError('passwordMismatch') ?? false;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.U.set(() => {
      this.loading = true;
      this.error = '';
      this.success = false;
    });

    const raw = this.form.getRawValue() as {
      token: string | null;
      newPassword: string | null;
      confirmPassword: string | null;
    };

    const token = (raw.token ?? '').trim();
    const newPassword = raw.newPassword ?? '';

    this.authApi
      .resetPassword({ token, newPassword })
      .pipe(this.U.pipeRepaint())
      .subscribe({
        next: () => {
          this.U.set(() => {
            this.success = true;
          });

          // Redirige vers login après un court délai
          setTimeout(() => {
            this.router.navigate(['/login'], { queryParams: { reset: 'ok' } });
          }, 800);
        },
        error: (err) => {
          this.U.set(() => {
            this.error =
              err?.error?.message ??
              'Invalid or expired token. Please request a new one.';
          });
        },
        complete: () => {
          this.U.set(() => {
            this.loading = false;
          });
        },
      });
  }

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const p = group.get('newPassword')?.value;
    const c = group.get('confirmPassword')?.value;
    return p && c && p !== c ? { passwordMismatch: true } : null;
  }
}

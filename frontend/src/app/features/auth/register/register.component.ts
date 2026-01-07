import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenStore } from '../../../core/services/token-store.service';
import {ui} from '../../../core/utils/zoneless-ui';

type RegisterForm = {
  email: string | null;
  password: string | null;
  confirmPassword: string | null;
  accept: boolean | null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  year = new Date().getFullYear();

  loading = false;
  error = '';
  showPassword = false;
  showConfirm = false;

  form: FormGroup;

  private u: ReturnType<typeof ui>;

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private tokenStore: TokenStore,
    private router: Router,
    cdr: ChangeDetectorRef
  ) {
    this.u = ui(cdr);

    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
        accept: [false, Validators.requiredTrue],
      },
      { validators: this.passwordsMatch }
    );
  }

  togglePassword(): void {
    this.u.set(() => {
      this.showPassword = !this.showPassword;
    });
  }

  toggleConfirm(): void {
    this.u.set(() => {
      this.showConfirm = !this.showConfirm;
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.u.repaint();
      return;
    }

    this.u.set(() => {
      this.loading = true;
      this.error = '';
    });

    const raw = this.form.getRawValue() as RegisterForm;
    const email = (raw.email ?? '').trim();
    const password = raw.password ?? '';

    this.authApi
      .register({ email, password })
      .pipe(this.u.pipeRepaint()) // ✅ repaint on next/error/finalize
      .subscribe({
        next: (res) => {
          this.tokenStore.set(res.accessToken);
          this.router.navigateByUrl('/dashboard');
          // repaint après navigation (au cas où)
          this.u.repaint();
        },
        error: (err) => {
          const msg =
            err?.error?.message ??
            err?.error?.error ??
            err?.message ??
            'Registration failed. Please try again.';

          this.u.set(() => {
            this.error = msg;
            this.loading = false;
          });
        },
        complete: () => {
          this.u.set(() => {
            this.loading = false;
          });
        },
      });
  }

  // ---------- validators ----------

  private passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    return p && c && p !== c ? { passwordMismatch: true } : null;
  }

  get passwordMismatch(): boolean {
    return this.form?.hasError('passwordMismatch') ?? false;
  }
}

import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { TokenStore } from '../../../core/services/token-store.service';
import { ui, Ui } from '../../../core/utils/zoneless-ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  year = new Date().getFullYear();

  loading = false;
  error = '';
  showPassword = false;

  form!: FormGroup;
  private ui: Ui;

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    private tokenStore: TokenStore,
    private router: Router,
    cdr: ChangeDetectorRef
  ) {
    // ✅ zoneless helper
    this.ui = ui(cdr);

    // ✅ IMPORTANT: init ici (sinon TS2729)
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [true],
    });
  }

  togglePassword(): void {
    this.ui.set(() => {
      this.showPassword = !this.showPassword;
    });
  }

  submit(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.ui.repaint();
      return;
    }

    this.ui.set(() => {
      this.loading = true;
      this.error = '';
    });

    const raw = this.form.getRawValue() as {
      email: string | null;
      password: string | null;
      rememberMe: boolean | null;
    };

    const email = (raw.email ?? '').trim();
    const password = raw.password ?? '';
    const rememberMe = !!raw.rememberMe;

    this.authApi
      .login({ email, password, rememberMe })
      .pipe(
        take(1),
        this.ui.pipeRepaint() // ✅ repaint sur next/error/finalize (zoneless-safe)
      )
      .subscribe({
        next: (res) => {
          this.tokenStore.set(res.accessToken);
          this.router.navigateByUrl('/dashboard');

          // ✅ stop spinner
          this.loading = false;
        },
        error: (err) => {
          // ✅ stop spinner
          this.loading = false;

          if (err?.status === 401) {
            this.error = 'Email ou mot de passe incorrect.';
            return;
          }

          this.error = err?.error?.message ?? 'Erreur de connexion. Réessaie.';
        },
      });
  }
}

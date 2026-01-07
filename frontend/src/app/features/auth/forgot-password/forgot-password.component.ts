import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { ui } from '../../../core/utils/zoneless-ui';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  year = new Date().getFullYear();

  loading = false;
  error = '';
  success = false;

  form;

  private readonly U;

  constructor(
    private fb: FormBuilder,
    private authApi: AuthApiService,
    cdr: ChangeDetectorRef
  ) {
    this.U = ui(cdr);

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
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

    const raw = this.form.getRawValue() as { email: string | null };
    const email = (raw.email ?? '').trim();

    this.authApi
      .forgotPassword({ email })
      .pipe(this.U.pipeRepaint())
      .subscribe({
        next: () => {
          // IMPORTANT: on affiche toujours success même si email n’existe pas (anti enumeration)
          this.U.set(() => {
            this.success = true;
          });
        },
        error: (err) => {
          this.U.set(() => {
            this.error =
              err?.error?.message ??
              'Something went wrong. Please try again.';
          });
        },
        complete: () => {
          this.U.set(() => {
            this.loading = false;
          });
        },
      });
  }
}

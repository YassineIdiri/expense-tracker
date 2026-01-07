import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export type ForgotPasswordPayload = { email: string };
export type ResetPasswordPayload = { token: string; newPassword: string };

@Injectable({ providedIn: 'root' })
export class PasswordResetApiService {
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  forgotPassword(payload: ForgotPasswordPayload): Observable<void> {
    // pas besoin de withCredentials ici
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, payload);
  }
}

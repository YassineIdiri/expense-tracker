import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  budgetLimit?: number | null;
};

export type CategoryCreatePayload = {
  name: string;
  color: string;
  icon: string;
  budgetLimit?: number | null;
};

export type CategoryUpdatePayload = CategoryCreatePayload;

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly baseUrl = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.baseUrl);
  }

  // ✅ retourne void (ou Category si ton API le renvoie)
  create(payload: CategoryCreatePayload): Observable<void> {
    return this.http.post<void>(this.baseUrl, payload);
  }

  update(id: string, payload: CategoryUpdatePayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

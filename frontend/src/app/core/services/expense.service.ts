import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PageResponse<T> = {
  // ton backend devrait renvoyer content, mais on normalise aussi côté component
  content?: T[];
  items?: T[];
  data?: T[];

  pageNumber?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;

  // parfois Spring Page renvoie number/size/totalElements/totalPages
  number?: number;
  size?: number;
};

export type Expense = {
  id: string;
  amount: number;
  currency: string;
  expenseDate: string; // "YYYY-MM-DD"
  merchant: string;
  note?: string | null;
  categoryId: string;
  categoryName: string;
};

export type ExpenseSummary = {
  totalAmount: number;
  totalCount: number;
};

export type CreateExpensePayload = {
  amount: number;
  expenseDate: string;
  merchant: string;
  note?: string | null;
  categoryId: string;
};

export type UpdateExpensePayload = CreateExpensePayload;

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly baseUrl = `${environment.apiUrl}/api/expenses`;

  constructor(private http: HttpClient) {}

  search(args: {
    from: string;
    to: string;
    categoryId?: string | null;
    min?: number | null;
    max?: number | null;
    q?: string | null;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<PageResponse<Expense>> {
    let params = new HttpParams().set('from', args.from).set('to', args.to);

    if (args.categoryId) params = params.set('categoryId', args.categoryId);
    if (args.min != null) params = params.set('min', String(args.min));
    if (args.max != null) params = params.set('max', String(args.max));
    if (args.q) params = params.set('q', args.q);

    params = params.set('page', String(args.page ?? 0));
    params = params.set('size', String(args.size ?? 10));
    if (args.sort) params = params.set('sort', args.sort);

    return this.http.get<PageResponse<Expense>>(this.baseUrl, { params });
  }

  summary(from: string, to: string): Observable<ExpenseSummary> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<ExpenseSummary>(`${this.baseUrl}/summary`, { params });
  }

  create(payload: CreateExpensePayload): Observable<HttpResponse<unknown>> {
    return this.http.post(this.baseUrl, payload, { observe: 'response' });
  }

  update(id: string, payload: UpdateExpensePayload): Observable<HttpResponse<unknown>> {
    return this.http.put(`${this.baseUrl}/${id}`, payload, { observe: 'response' });
  }

  delete(id: string): Observable<HttpResponse<unknown>> {
    return this.http.delete(`${this.baseUrl}/${id}`, { observe: 'response' });
  }
}

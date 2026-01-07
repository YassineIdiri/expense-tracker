import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type DashboardResponse = {
  summary: {
    total: number; // BigDecimal -> number
    count: number; // long -> number
  };
  topCategories: Array<{
    categoryId: string;     // UUID -> string
    categoryName: string;
    total: number;          // BigDecimal -> number
  }>;
  monthlySeries: Array<{
    month: string;          // "YYYY-MM"
    total: number;          // BigDecimal -> number
  }>;
};

export type CategorySpendDto = {
  categoryId: string;       // UUID -> string
  categoryName: string;
  total: number;            // BigDecimal -> number
  count: number;            // long -> number
};

export type MerchantSpendDto = {
  merchant: string;         // coalesce(e.merchant, 'Unknown')
  total: number;            // BigDecimal -> number
  count: number;            // long -> number
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly baseUrl = `${environment.apiUrl}/api/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboard(args?: { from?: string; to?: string; top?: number }): Observable<DashboardResponse> {
    const params = this.buildDateParams(args).set('top', String(args?.top ?? 5));
    return this.http.get<DashboardResponse>(this.baseUrl, { params });
  }

  getSpendByCategory(args?: { from?: string; to?: string }): Observable<CategorySpendDto[]> {
    const params = this.buildDateParams(args);
    return this.http.get<CategorySpendDto[]>(`${this.baseUrl}/categories`, { params });
  }

  getSpendByMerchant(args?: { from?: string; to?: string; limit?: number }): Observable<MerchantSpendDto[]> {
    const params = this.buildDateParams(args).set('limit', String(args?.limit ?? 10));
    return this.http.get<MerchantSpendDto[]>(`${this.baseUrl}/merchants`, { params });
  }

  private buildDateParams(args?: { from?: string; to?: string }): HttpParams {
    let params = new HttpParams();
    if (args?.from) params = params.set('from', args.from);
    if (args?.to) params = params.set('to', args.to);
    return params;
  }
}

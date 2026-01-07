import { Component, ChangeDetectorRef, Inject, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ui, Ui } from '../../core/utils/zoneless-ui';
import { Expense, ExpenseService, PageResponse } from '../../core/services/expense.service';
import { Category, CategoryService } from '../../core/services/category.service';


function isoToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isoStartOfMonth(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './expenses.component.html',
})
export class Expenses implements OnInit {
  private readonly isBrowser: boolean;
  private readonly ui: Ui;

  categories: Category[] = [];

  // ✅ AU LIEU de page.content
  items: Expense[] = [];
  pageNumber = 0;
  totalPages = 1;
  totalElements = 0;

  // Summary
  totalAmount: number | null = null;
  totalCount: number | null = null;

  // UI state
  loading = true;
  saving = false;
  deleting = false;
  error = '';
  toast = '';

  // Filters (date range obligatoire)
  from = isoStartOfMonth();
  to = isoToday();
  categoryId: string | '' = '';
  q = '';
  min: number | null = null;
  max: number | null = null;

  // Pagination (client state)
  pageIndex = 0;
  pageSize = 10;

  // Modals
  isFormOpen = false;
  isDeleteOpen = false;
  editing: Expense | null = null;
  deletingTarget: Expense | null = null;

  form;

  constructor(
    private expensesApi: ExpenseService,
    private categoriesApi: CategoryService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.ui = ui(this.cdr);

    this.form = this.fb.group({
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      expenseDate: [this.to, [Validators.required]],
      merchant: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      note: [''],
      categoryId: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.bootstrap();
  }

  // ---------- Boot ----------
  bootstrap() {
    this.ui.set(() => {
      this.loading = true;
      this.error = '';
    });

    this.categoriesApi
      .list()
      .pipe(this.ui.pipeRepaint())
      .subscribe({
        next: (cats) => {
          this.ui.set(() => (this.categories = (cats ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))));
          this.refreshAll();
        },
        error: () => {
          this.ui.set(() => {
            this.loading = false;
            this.error = 'Unable to load categories. Please try again.';
          });
        },
      });
  }

  // ---------- Helpers ----------
  categoryMeta(id: string): { color: string; icon: string; name: string } {
    const c = this.categories.find((x) => x.id === id);
    return {
      color: c?.color ?? '#6B7280',
      icon: c?.icon ?? 'tag',
      name: c?.name ?? 'Unknown',
    };
  }

  private showToast(msg: string) {
    this.ui.set(() => (this.toast = msg));
    setTimeout(() => this.ui.set(() => (this.toast = '')), 2500);
  }

  // ---------- Normalizer ----------
  private normalizePage(p: PageResponse<Expense> | any) {
    const list = p?.content ?? p?.items ?? p?.data ?? [];
    const items = Array.isArray(list) ? list : [];

    const pageNumber = p?.pageNumber ?? p?.number ?? 0;
    const totalPages = p?.totalPages ?? 1;
    const totalElements = p?.totalElements ?? items.length;

    return { items, pageNumber, totalPages, totalElements };
  }

  // ---------- Fetch ----------
  refreshAll() {
    this.pageIndex = 0;
    this.fetchExpenses();
    this.fetchSummary();
  }

  fetchSummary() {
    this.expensesApi
      .summary(this.from, this.to)
      .pipe(this.ui.pipeRepaint())
      .subscribe({
        next: (s) =>
          this.ui.set(() => {
            this.totalAmount = s?.totalAmount ?? 0;
            this.totalCount = s?.totalCount ?? 0;
          }),
        error: () =>
          this.ui.set(() => {
            this.totalAmount = null;
            this.totalCount = null;
          }),
      });
  }

  fetchExpenses() {
    this.ui.set(() => {
      this.loading = true;
      this.error = '';
    });

    this.expensesApi
      .search({
        from: this.from,
        to: this.to,
        categoryId: this.categoryId || null,
        min: this.min,
        max: this.max,
        q: this.q?.trim() || null,
        page: this.pageIndex,
        size: this.pageSize,
        sort: 'expenseDate,desc',
      })
      .pipe(
        finalize(() => this.ui.set(() => (this.loading = false))),
        this.ui.pipeRepaint()
      )
      .subscribe({
        next: (p) => {
          const n = this.normalizePage(p);
          this.ui.set(() => {
            this.items = n.items;
            this.pageNumber = n.pageNumber;
            this.totalPages = n.totalPages;
            this.totalElements = n.totalElements;
          });
        },
        error: (err) =>
          this.ui.set(() => {
            this.items = [];
            this.pageNumber = 0;
            this.totalPages = 1;
            this.totalElements = 0;
            this.error = err?.status === 401 ? 'Session expired. Please login again.' : 'Unable to load expenses.';
          }),
      });
  }

  // ---------- Filters ----------
  applyFilters() {
    if (!this.from || !this.to) {
      this.ui.set(() => (this.error = 'Please choose a date range.'));
      return;
    }
    this.refreshAll();
  }

  quickThisMonth() {
    this.ui.set(() => {
      this.from = isoStartOfMonth();
      this.to = isoToday();
    });
    this.applyFilters();
  }

  quickToday() {
    const t = isoToday();
    this.ui.set(() => {
      this.from = t;
      this.to = t;
    });
    this.applyFilters();
  }

  clearAdvanced() {
    this.ui.set(() => {
      this.categoryId = '';
      this.q = '';
      this.min = null;
      this.max = null;
    });
    this.applyFilters();
  }

  // ---------- Pagination ----------
  nextPage() {
    if (this.pageNumber + 1 >= this.totalPages) return;
    this.pageIndex += 1;
    this.fetchExpenses();
  }

  prevPage() {
    if (this.pageIndex <= 0) return;
    this.pageIndex -= 1;
    this.fetchExpenses();
  }

  // ---------- Modal: Create/Edit ----------
  openCreate() {
    this.ui.set(() => {
      this.error = '';
      this.editing = null;
      this.form.reset({
        amount: null,
        expenseDate: this.to,
        merchant: '',
        note: '',
        categoryId: this.categories[0]?.id ?? '',
      });
      this.isFormOpen = true;
    });
  }

  openEdit(e: Expense) {
    this.ui.set(() => {
      this.error = '';
      this.editing = e;
      this.form.reset({
        amount: e.amount,
        expenseDate: e.expenseDate,
        merchant: e.merchant,
        note: e.note ?? '',
        categoryId: e.categoryId,
      });
      this.isFormOpen = true;
    });
  }

  closeForm() {
    this.ui.set(() => {
      this.isFormOpen = false;
      this.editing = null;
      this.saving = false;
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.ui.repaint();
      return;
    }

    this.ui.set(() => {
      this.saving = true;
      this.error = '';
    });

    const raw = this.form.getRawValue() as {
      amount: number;
      expenseDate: string;
      merchant: string;
      note: string;
      categoryId: string;
    };

    const payload = {
      amount: Number(raw.amount),
      expenseDate: raw.expenseDate,
      merchant: String(raw.merchant).trim(),
      note: raw.note?.trim() || null,
      categoryId: raw.categoryId,
    };

    const request$ = this.editing
      ? this.expensesApi.update(this.editing.id, payload)
      : this.expensesApi.create(payload);

    request$
      .pipe(
        finalize(() => this.ui.set(() => (this.saving = false))),
        this.ui.pipeRepaint()
      )
      .subscribe({
        next: (resp) => {
          if (resp.status >= 200 && resp.status < 300) {
            this.closeForm();
            this.showToast(this.editing ? 'Expense updated.' : 'Expense added.');
            this.fetchExpenses();
            this.fetchSummary();
            return;
          }
          this.ui.set(() => (this.error = 'Unexpected server response.'));
        },
        error: (err) => this.ui.set(() => (this.error = err?.error?.message ?? 'Operation failed. Please try again.')),
      });
  }

  // ---------- Modal: Delete ----------
  openDelete(e: Expense) {
    this.ui.set(() => {
      this.error = '';
      this.deletingTarget = e;
      this.isDeleteOpen = true;
    });
  }

  closeDelete() {
    this.ui.set(() => {
      this.isDeleteOpen = false;
      this.deletingTarget = null;
      this.deleting = false;
    });
  }

  confirmDelete() {
    if (!this.deletingTarget) return;

    this.ui.set(() => {
      this.deleting = true;
      this.error = '';
    });

    this.expensesApi
      .delete(this.deletingTarget.id)
      .pipe(
        finalize(() => this.ui.set(() => (this.deleting = false))),
        this.ui.pipeRepaint()
      )
      .subscribe({
        next: (resp) => {
          if (resp.status >= 200 && resp.status < 300) {
            this.closeDelete();
            this.showToast('Expense deleted.');
            this.fetchExpenses();
            this.fetchSummary();
            return;
          }
          this.ui.set(() => (this.error = 'Unexpected server response.'));
        },
        error: (err) => this.ui.set(() => (this.error = err?.error?.message ?? 'Delete failed. Please try again.')),
      });
  }
}

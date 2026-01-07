                                                                                                                                                                            import { Component, ChangeDetectorRef, Inject, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { CategorySpendDto, DashboardResponse, DashboardService, MerchantSpendDto } from '../../core/services/dashboard.service';
import { Category, CategoryService } from '../../core/services/category.service';
import { ui, Ui } from '../../core/utils/zoneless-ui';


type RangePreset = 'DEFAULT' | 'MONTH' | 'YEAR' | 'CUSTOM';

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
function isoStartOfYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function normalizeMonthKey(raw: string): string {
  const s = (raw ?? '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(s) ? s : raw;
}
function monthLabelFromKey(key: string): string {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

type TopCatVM = {
  id: string;
  name: string;
  total: number;
  color: string;
  icon: string;
  pct: number;
};

type MonthVM = {
  key: string;
  label: string;
  total: number;
  heightPct: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class Dashboard implements OnInit {
  private readonly isBrowser: boolean;
  private readonly ui: Ui;
  private applyingPreset = false;

  detailsLoading = false;

  loading = true;
  error = '';
  toast = '';

  preset: RangePreset = 'DEFAULT';
  fromInput = '';
  toInput = '';
  top = 5;

  // Data
  categories: Category[] = [];
  dash: DashboardResponse | null = null;

  // View models
  topVM: TopCatVM[] = [];
  monthsVM: MonthVM[] = [];

  // New detailed datasets
  spendByCategory: CategorySpendDto[] = [];
  spendByMerchant: MerchantSpendDto[] = [];
  merchantLimit = 10;

  // KPIs
  total = 0;
  count = 0;

  // “Today / Month” cards
  todayLabel = isoToday();
  todayTotal: number | null = null;
  todayCount: number | null = null;

  monthLabel = 'This month';
  monthTotal: number | null = null;
  monthCount: number | null = null;

  // prevent out-of-order responses
  private reqSeq = 0;

  // category meta cache
  private catMetaById = new Map<string, { color: string; icon: string; name: string }>();

  constructor(
    private dashboardApi: DashboardService,
    private categoriesApi: CategoryService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.ui = ui(this.cdr);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.bootstrap();
  }

  private showToast(msg: string) {
    this.ui.set(() => (this.toast = msg));
    setTimeout(() => this.ui.set(() => (this.toast = '')), 2200);
  }

  private rebuildCatIndex() {
    this.catMetaById = new Map(
      this.categories.map((c) => [c.id, { color: c.color, icon: c.icon, name: c.name }])
    );
  }

catColor(id: string): string {
  return this.catMetaById.get(id)?.color ?? '#6B7280';
}

catIcon(id: string): string {
  return this.catMetaById.get(id)?.icon ?? 'tag';
}

catName(id: string, fallback: string): string {
  return this.catMetaById.get(id)?.name ?? fallback;
}

  // ---------- bootstrap ----------
  bootstrap() {
    this.ui.set(() => {
      this.loading = true;
      this.error = '';
    });

    this.categoriesApi.list().pipe(this.ui.pipeRepaint()).subscribe({
      next: (cats) => {
        this.ui.set(() => {
          this.categories = (cats ?? []).slice();
          this.rebuildCatIndex();
        });
        this.presetDefault(false);
        this.refreshTodayAndMonthCards();
      },
      error: () => {
        this.ui.set(() => {
          this.categories = [];
          this.rebuildCatIndex();
        });
        this.presetDefault(false);
        this.refreshTodayAndMonthCards();
      },
    });
  }

  // ---------- preset / range ----------
  private computeRange(): { from?: string; to?: string } {
    const today = isoToday();
    if (this.preset === 'DEFAULT') return {};
    if (this.preset === 'MONTH') return { from: isoStartOfMonth(), to: today };
    if (this.preset === 'YEAR') return { from: isoStartOfYear(), to: today };
    // CUSTOM
    const f = this.fromInput?.trim();
    const t = this.toInput?.trim();
    return { from: f || undefined, to: t || undefined };
  }

  presetDefault(showToast = true) {
    this.applyingPreset = true;

    this.ui.set(() => {
      this.preset = 'DEFAULT';
      this.fromInput = '';
      this.toInput = '';
    });

    if (showToast) this.showToast('Last 12 months');

    Promise.resolve().then(() => {
      this.applyingPreset = false;
      this.refresh();
    });
  }

   presetThisMonth() {
      this.applyingPreset = true;

      this.ui.set(() => {
        this.preset = 'MONTH';
        this.fromInput = isoStartOfMonth();
        this.toInput = isoToday();
      });

      this.showToast('This month');

      Promise.resolve().then(() => {
        this.applyingPreset = false;
        this.refresh();
      });
    }

  presetThisYear() {
    this.applyingPreset = true;

    this.ui.set(() => {
      this.preset = 'YEAR';
      this.fromInput = isoStartOfYear();
      this.toInput = isoToday();
    });

    this.showToast('This year');

    // ✅ on laisse Angular appliquer ngModel, puis on refresh
    Promise.resolve().then(() => {
      this.applyingPreset = false;
      this.refresh();
    });
  }


  setCustom() {
    if (this.applyingPreset) return; // ✅ ignore les changements auto
    this.ui.set(() => (this.preset = 'CUSTOM'));
  }

  applyCustom() {
    if (this.preset !== 'CUSTOM') this.setCustom();

    const f = this.fromInput?.trim();
    const t = this.toInput?.trim();

    if (!f || !t) {
      this.ui.set(() => (this.error = 'Please choose both From and To (custom range).'));
      return;
    }
    if (f > t) {
      this.ui.set(() => (this.error = 'From must be before To.'));
      return;
    }

    this.showToast('Custom range applied');
    this.refresh();
  }

  // ---------- main refresh ----------
refresh() {
  const seq = ++this.reqSeq;

  this.ui.set(() => {
    this.loading = true;        // KPI + charts
    this.detailsLoading = true; // tables détails
    this.error = '';
  });

  const range = this.computeRange();

  // 1) Dashboard principal => c'est lui qui contrôle loading
  this.dashboardApi
    .getDashboard({ from: range.from, to: range.to, top: this.top })
    .pipe(this.ui.pipeRepaint())
    .subscribe({
      next: (d) => {
        if (seq !== this.reqSeq) return;

        this.ui.set(() => {
          this.dash = d;
          this.total = Number(d?.summary?.total ?? 0);
          this.count = Number(d?.summary?.count ?? 0);
          this.buildTopVM(d);
          this.buildMonthsVM(d);
          this.loading = false; // ✅ on stoppe le skeleton KPI ICI
        });

        // 2) détails : on les charge à part, sans bloquer les KPI
        this.loadDetails(seq, range.from, range.to);
      },
      error: (err) => {
        if (seq !== this.reqSeq) return;
        this.ui.set(() => {
          this.dash = null;
          this.topVM = [];
          this.monthsVM = [];
          this.total = 0;
          this.count = 0;

          this.spendByCategory = [];
          this.spendByMerchant = [];

          this.loading = false;
          this.detailsLoading = false;

          this.error =
            err?.status === 401
              ? 'Session expired. Please login again.'
              : 'Unable to load dashboard.';
        });
      },
    });
}

private loadDetails(seq: number, from?: string, to?: string) {
  let remaining = 2;

  const done = () => {
    remaining--;
    if (remaining <= 0) {
      this.ui.set(() => (this.detailsLoading = false));
    }
  };

  this.dashboardApi
    .getSpendByCategory({ from, to })
    .pipe(this.ui.pipeRepaint())
    .subscribe({
      next: (rows) => {
        if (seq !== this.reqSeq) return;
        this.ui.set(() => {
          this.spendByCategory = (rows ?? []).map((x) => ({
            ...x,
            total: Number(x.total ?? 0),
            count: Number(x.count ?? 0),
          }));
        });
        done();
      },
      error: () => {
        if (seq !== this.reqSeq) return;
        this.ui.set(() => (this.spendByCategory = []));
        done();
      },
    });

  this.dashboardApi
    .getSpendByMerchant({ from, to, limit: this.merchantLimit })
    .pipe(this.ui.pipeRepaint())
    .subscribe({
      next: (rows) => {
        if (seq !== this.reqSeq) return;
        this.ui.set(() => {
          this.spendByMerchant = (rows ?? []).map((x) => ({
            ...x,
            total: Number(x.total ?? 0),
            count: Number(x.count ?? 0),
          }));
        });
        done();
      },
      error: () => {
        if (seq !== this.reqSeq) return;
        this.ui.set(() => (this.spendByMerchant = []));
        done();
      },
    });
}


  private buildTopVM(d: DashboardResponse) {
    const top = d?.topCategories ?? [];
    const sumTop = top.reduce((acc, x) => acc + Number(x.total ?? 0), 0) || 0;

    this.topVM = top.map((x) => {
      const t = Number(x.total ?? 0);
      const pct = sumTop > 0 ? (t / sumTop) * 100 : 0;
      return {
        id: x.categoryId,
        name: this.catName(x.categoryId, x.categoryName),
        total: t,
        color: this.catColor(x.categoryId),
        icon: this.catIcon(x.categoryId),
        pct,
      };
    });
  }

  private buildMonthsVM(d: DashboardResponse) {
    const monthlyRaw = d?.monthlySeries ?? [];
    const byMonth = new Map<string, number>();

    for (const m of monthlyRaw) {
      const key = normalizeMonthKey(String(m.month));
      const total = Number(m.total ?? 0);
      byMonth.set(key, (byMonth.get(key) ?? 0) + total);
    }

    const keys = Array.from(byMonth.keys()).sort((a, b) => a.localeCompare(b));
    const monthly = keys.map((k) => ({
      key: k,
      label: monthLabelFromKey(k),
      total: byMonth.get(k) ?? 0,
    }));

    const max = monthly.reduce((acc, x) => Math.max(acc, x.total), 0) || 1;

    this.monthsVM = monthly.map((m) => ({
      ...m,
      heightPct: clamp((m.total / max) * 100, 2, 100),
    }));
  }

  // ---------- Today / Month cards ----------
  refreshTodayAndMonthCards() {
    const today = isoToday();
    const monthFrom = isoStartOfMonth();

    // Today
    this.dashboardApi.getDashboard({ from: today, to: today, top: 5 }).pipe(this.ui.pipeRepaint()).subscribe({
      next: (d) =>
        this.ui.set(() => {
          this.todayLabel = today;
          this.todayTotal = Number(d?.summary?.total ?? 0);
          this.todayCount = Number(d?.summary?.count ?? 0);
        }),
      error: () =>
        this.ui.set(() => {
          this.todayTotal = null;
          this.todayCount = null;
        }),
    });

    // Month
    this.dashboardApi.getDashboard({ from: monthFrom, to: today, top: 5 }).pipe(this.ui.pipeRepaint()).subscribe({
      next: (d) =>
        this.ui.set(() => {
          this.monthTotal = Number(d?.summary?.total ?? 0);
          this.monthCount = Number(d?.summary?.count ?? 0);
        }),
      error: () =>
        this.ui.set(() => {
          this.monthTotal = null;
          this.monthCount = null;
        }),
    });
  }

  // ---------- Donut segments ----------
donutSegments(): Array<{ dasharray: string; dashoffset: number; color: string }> {
  // Use 100 as full circumference (works with r=15.915 trick)
  const segs: Array<{ dasharray: string; dashoffset: number; color: string }> = [];

  // Stable order (largest first looks clean)
  const items = [...this.topVM].sort((a, b) => b.pct - a.pct);

  let offset = 0;

  for (const c of items) {
    const pct = clamp(c.pct, 0, 100);
    if (pct <= 0.01) continue;

    // No rounded ends => less overlap
    segs.push({
      dasharray: `${pct} ${100 - pct}`,
      dashoffset: -offset,
      color: c.color,
    });

    offset += pct;
  }

  return segs;
}


  avg(): number {
    if (!this.count) return 0;
    return this.total / this.count;
  }

  rangeLabel(): string {
    if (this.preset === 'DEFAULT') return 'Last 12 months';
    if (this.preset === 'MONTH') return 'This month';
    if (this.preset === 'YEAR') return 'This year';
    const f = this.fromInput || '—';
    const t = this.toInput || '—';
    return `${f} → ${t}`;
  }
}

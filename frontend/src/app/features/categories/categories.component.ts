import {
  Component,
  Inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { Category, CategoryService } from '../../core/services/category.service';


type CategoryForm = {
  name: FormControl<string>;
  color: FormControl<string>;
  icon: FormControl<string>;
  budgetLimit: FormControl<number | null>;
};

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './categories.component.html',
})
export class Categories implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly isBrowser: boolean;

  loading = true;
  saving = false;
  deleting = false;

  error = '';
  toast = '';

  categories: Category[] = [];
  q = '';

  isFormOpen = false;
  isDeleteOpen = false;

  editing: Category | null = null;
  deletingTarget: Category | null = null;

  form: FormGroup<CategoryForm>;

  constructor(
    private readonly api: CategoryService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.form = this.fb.group<CategoryForm>({
      name: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(40),
      ]),
      color: this.fb.nonNullable.control('#6366F1', [Validators.required]),
      icon: this.fb.nonNullable.control('tag', [Validators.required]),
      budgetLimit: this.fb.control<number | null>(null),
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.refresh();

    // ✅ Normalise toujours la couleur en #RRGGBB (et majuscules) sans boucle infinie
    this.form
      .get('color')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => {
        const normalized = this.normalizeHex(v);
        if (normalized !== v) {
          this.form.get('color')?.setValue(normalized, { emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- UI helpers ----------

  get filtered(): Category[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.categories;

    return this.categories.filter((c) => {
      return (
        c.name.toLowerCase().includes(s) ||
        (c.color ?? '').toLowerCase().includes(s) ||
        (c.icon ?? '').toLowerCase().includes(s)
      );
    });
  }

  private repaint(): void {
    // Change detection “soft” (sans setTimeout spam)
    this.cdr.markForCheck();
  }

  private showToast(msg: string): void {
    this.toast = msg;
    this.repaint();

    window.setTimeout(() => {
      this.toast = '';
      this.repaint();
    }, 3000);
  }

  // ---------- API ----------

  refresh(): void {
    this.loading = true;
    this.error = '';
    this.repaint();

    this.api
      .list()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.repaint();
        })
      )
      .subscribe({
        next: (data) => {
          this.categories = data ?? [];
          this.repaint();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Unable to load categories.';
          this.repaint();
        },
      });
  }

  // ---------- Modal create/edit ----------

  openCreate(): void {
    this.error = '';
    this.editing = null;

    this.form.reset(
      {
        name: '',
        color: '#6366F1',
        icon: 'tag',
        budgetLimit: null,
      },
      { emitEvent: true }
    );

    this.isFormOpen = true;
    this.repaint();
  }

  openEdit(cat: Category): void {
    this.error = '';
    this.editing = cat;

    this.form.reset(
      {
        name: cat.name ?? '',
        color: this.normalizeHex(cat.color ?? '#6366F1'),
        icon: cat.icon ?? 'tag',
        budgetLimit: cat.budgetLimit ?? null,
      },
      { emitEvent: true }
    );

    this.isFormOpen = true;
    this.repaint();
  }

  closeForm(): void {
    this.isFormOpen = false;
    this.editing = null;
    // ✅ on ne touche pas saving ici (finalize le gère)
    this.error = '';
    this.repaint();
  }

  private normalizeHex(v: string | null | undefined): string {
    const fallback = '#6366F1';
    if (!v) return fallback;

    let s = String(v).trim();

    if (!s.startsWith('#')) s = `#${s}`;

    // garde uniquement "#"+6 chars hex si possible
    s = s.replace(/[^#0-9a-fA-F]/g, '');

    // si user tape "#ABC" -> on tente d’expand en "#AABBCC"
    if (/^#[0-9a-fA-F]{3}$/.test(s)) {
      const r = s[1],
        g = s[2],
        b = s[3];
      s = `#${r}${r}${g}${g}${b}${b}`;
    }

    s = s.slice(0, 7);

    if (!/^#[0-9a-fA-F]{6}$/.test(s)) return fallback;

    return s.toUpperCase();
  }

  // Appelé par le color picker
  onColorPickerChange(v: string): void {
    this.form.get('color')?.setValue(this.normalizeHex(v), { emitEvent: true });
  }

  // Appelé par le champ texte
  onColorTextInput(v: string): void {
    // on normalise en live
    this.form.get('color')?.setValue(this.normalizeHex(v), { emitEvent: true });
  }

  submit(): void {
    if (this.saving) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.repaint();
      return;
    }

    this.saving = true;
    this.error = '';
    this.repaint();

    const raw = this.form.getRawValue();
    const isEdit = !!this.editing;

    const payload = {
      name: raw.name.trim(),
      color: this.normalizeHex(raw.color),
      icon: raw.icon || 'tag',
      budgetLimit: raw.budgetLimit,
    };

    const request$ = isEdit
      ? this.api.update(this.editing!.id, payload)
      : this.api.create(payload);

    // ✅ “béton” : on ferme sur next OU complete (si API renvoie 204 et/ou flux sans next)
    let didHandle = false;

    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.saving = false;
          this.repaint();
        })
      )
      .subscribe({
        next: () => {
          didHandle = true;
          this.showToast(isEdit ? 'Category updated.' : 'Category created.');
          this.closeForm();
          this.refresh();
        },
        complete: () => {
          if (!didHandle) {
            this.showToast(isEdit ? 'Category updated.' : 'Category created.');
            this.closeForm();
            this.refresh();
          }
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'Operation failed.';
          this.repaint();
        },
      });
  }

  // ---------- Delete modal ----------

  openDelete(cat: Category): void {
    this.error = '';
    this.deletingTarget = cat;
    this.isDeleteOpen = true;
    this.repaint();
  }

  closeDelete(): void {
    this.isDeleteOpen = false;
    this.deletingTarget = null;
    this.error = '';
    // ✅ pareil, ne pas forcer deleting=false ici si request en cours
    this.repaint();
  }

  confirmDelete(): void {
    if (!this.deletingTarget || this.deleting) return;

    this.deleting = true;
    this.error = '';
    this.repaint();

    this.api
      .delete(this.deletingTarget.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleting = false;
          this.repaint();
        })
      )
      .subscribe({
        next: () => {
          this.closeDelete();
          this.showToast('Category deleted.');
          this.refresh();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'Delete failed.';
          this.repaint();
        },
      });
  }
}

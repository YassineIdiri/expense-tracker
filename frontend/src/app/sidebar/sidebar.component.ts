// sidebar.component.ts
import {ChangeDetectorRef, Component, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {ui} from '../core/utils/zoneless-ui';
import {AuthService} from '../core/services/auth.service';
import {finalize} from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  // Helper basique si besoin, mais RouterLinkActive fait le job
  isActive(route: string): boolean {
    return false; // Laissez routerLinkActive gérer ça, c'est plus propre
  }

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly u = ui(inject(ChangeDetectorRef));

  loggingOut = false;

  onLogout(): void {
    if (this.loggingOut) return;

    this.u.set(() => {
      this.loggingOut = true;
    });

    this.auth.logout().pipe(
      finalize(() => {
        // même si erreur backend, on sort du mode loading côté UI
        this.u.set(() => (this.loggingOut = false));
      })
    ).subscribe({
      next: () => {
        this.router.navigateByUrl('/login');
        this.u.repaint();
      },
      error: () => {
        // on ne devrait pas arriver ici grâce au catchError dans auth.logout()
        this.router.navigateByUrl('/login');
        this.u.repaint();
      },
    });
  }
}

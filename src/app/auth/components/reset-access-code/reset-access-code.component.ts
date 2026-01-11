import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ResetAccessCodeResponse } from '../../types/reset-access-code-response';

@Component({
  selector: 'app-reset-access-code',
  standalone: false,
  templateUrl: './reset-access-code.component.html',
  styleUrl: './reset-access-code.component.css'
})
export class ResetAccessCodeComponent {
  loading = false;
  error = '';
  success = '';

  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) { }

  ngOnInit(): void {

    this.form = this.fb.group({
      currentAccessCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      newAccessCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      confirmNewAccessCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });
  }

  submit() {
    if (this.form.invalid) return;

    const { currentAccessCode, newAccessCode, confirmNewAccessCode } = this.form.value as {
      currentAccessCode: string; newAccessCode: string; confirmNewAccessCode: string;
    };

    if (newAccessCode !== confirmNewAccessCode) {
      this.error = 'Les deux nouveaux codes ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.auth.resetAccessCode({ currentAccessCode, newAccessCode }).subscribe({
      next: (res: ResetAccessCodeResponse) => {
        if (!res.ok) {
          this.error = res.message || 'Impossible de réinitialiser le code.';
          return;
        }
        if (res.token) localStorage.setItem('token', res.token);
        localStorage.setItem('mustReset', 'false');

        const token = res.token || localStorage.getItem('token') || '';
        const roles = this.getRolesFromToken(token);

        this.success = 'Code réinitialisé avec succès.';


        if (roles.includes('admin') || roles.includes('hr')) {
          this.router.navigateByUrl('/dashboard-admin');
        } else {

          this.router.navigateByUrl('/dashboard-super');
        }
      },
      error: (err) => {
        if (err?.status === 401) this.error = 'Code actuel incorrect.';
        else if (err?.status === 400) this.error = 'Nouveau code invalide (6 caractères).';
        else this.error = 'Erreur serveur. Réessaie.';
      },
      complete: () => (this.loading = false),
    });
  }

  private getRolesFromToken(token: string): string[] {
    const payload = this.getPayloadFromToken(token);
    const raw = payload?.roles ?? [];
    const list = Array.isArray(raw) ? raw : [raw];

    return list
      .map((r: any) => String(r?.name ?? r).toLowerCase())
      .filter(Boolean);
  }

  private getPayloadFromToken(token: string): any | null {
    try {
      const payloadPart = token.split('.')[1];
      const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

}

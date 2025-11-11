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

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

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

        this.success = 'Code réinitialisé avec succès.';
        setTimeout(() => this.router.navigateByUrl('/dashboard-employee'), 500);
      },
      error: (err) => {
        if (err?.status === 401) this.error = 'Code actuel incorrect.';
        else if (err?.status === 400) this.error = 'Nouveau code invalide (6 caractères).';
        else this.error = 'Erreur serveur. Réessaie.';
      },
      complete: () => (this.loading = false),
    });
  }

}

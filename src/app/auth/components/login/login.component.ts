import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loading = false;
  error = '';
  form!: FormGroup;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],

      accessCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
     
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const { email, accessCode } = this.form.value as { email: string; accessCode: string };

    this.auth.login(email, accessCode).subscribe({
      next: (res) => {
   
        if (res?.token) localStorage.setItem('token', res.token);

      
        if (res?.mustReset) {
          this.router.navigateByUrl('/reset-access-code');
        } else {
          this.router.navigateByUrl('/dashboard-employee');
        }
      },
      error: (err) => {

        if (err?.status === 401) this.error = 'Email ou code d’accès invalide.';
        else this.error = 'Connexion impossible. Réessaie dans un instant.';
      },
      complete: () => (this.loading = false),
    });
  }
}

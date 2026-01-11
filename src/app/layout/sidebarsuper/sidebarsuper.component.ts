import { Component } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-sidebarsuper',
  standalone: false,
  templateUrl: './sidebarsuper.component.html',
  styleUrl: './sidebarsuper.component.css'
})
export class SidebarsuperComponent { constructor(public authService: AuthService) {}

}

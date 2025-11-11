import { Component } from '@angular/core';
import { interval, map, startWith } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  now$ = interval(1000).pipe(            
  startWith(0),                        
  map(() => new Date())
);
greeting$ = this.now$.pipe(
  map(d => {
    const h = d.getHours();           
    if (h < 5)  return 'Good Night';
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 22) return 'Good Evening';
    return 'Good Night';
  })
);

}

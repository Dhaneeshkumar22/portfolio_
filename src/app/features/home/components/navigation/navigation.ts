import { Component } from '@angular/core';

@Component({
  selector: 'app-navigation',
  standalone: true,
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss'],
})
export class NavigationComponent {
  readonly links = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Skills', target: 'skills' },
    { label: 'Projects', target: 'projects' },
  ];
}

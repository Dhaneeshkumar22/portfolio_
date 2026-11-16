import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss'],
})
export class Footer {
  readonly currentYear = 2026;

  readonly socialLinks: ReadonlyArray<{ label: string; url: string }> = [
    { label: 'GitHub', url: 'https://github.com/dhaneesh' },
    { label: 'LinkedIn', url: 'https://linkedin.com/in/dhaneesh' },
  ];
}

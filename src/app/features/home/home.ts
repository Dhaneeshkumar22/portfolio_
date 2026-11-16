import { Component } from '@angular/core';
import { HeroComponent } from './components/hero/hero';
import { AboutComponent } from './components/about/about';
import { SkillsComponent } from './components/skills/skills';
import { ProjectsComponent } from './components/projects/projects';
import { ContactComponent } from './components/contact/contact';
import { Footer } from './components/footer/footer';
import { NavigationComponent } from './components/navigation/navigation';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavigationComponent, HeroComponent, AboutComponent, SkillsComponent, ProjectsComponent, ContactComponent, Footer],
  template: `
    <div class="ambient-network" aria-hidden="true">
      <svg viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="network-line" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d41514" stop-opacity=".1"/><stop offset=".5" stop-color="#b8b7b6" stop-opacity=".25"/><stop offset="1" stop-color="#d41514" stop-opacity=".08"/></linearGradient>
          <filter id="node-glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <g class="network-lines" fill="none" stroke="url(#network-line)" stroke-width="1">
          <path d="M-70 245 C190 170 272 422 482 360 S770 130 970 254 1230 427 1510 300"/>
          <path d="M-90 748 C140 655 232 522 438 600 S740 829 956 706 1226 523 1510 645"/>
          <path d="M132 1000 C220 770 354 724 482 360"/>
          <path d="M482 360 C594 520 744 582 956 706"/>
          <path d="M970 254 C936 437 952 564 956 706"/>
          <path d="M720 -80 C688 132 744 260 970 254"/>
          <path d="M438 600 C625 741 760 845 956 706 S1190 230 1380 -40"/>
          <path d="M86 320 C330 420 412 512 438 600 S395 786 250 962"/>
          <path class="network-trace" d="M-70 245 C190 170 272 422 482 360 S770 130 970 254 1230 427 1510 300"/>
        </g>
        <g class="network-nodes" filter="url(#node-glow)">
          <circle cx="132" cy="293" r="2.5"/><circle cx="272" cy="422" r="3"/><circle cx="482" cy="360" r="4"/>
          <circle cx="438" cy="600" r="3.5"/><circle cx="720" cy="510" r="2.5"/><circle cx="970" cy="254" r="4"/>
          <circle cx="956" cy="706" r="3.5"/><circle cx="1194" cy="541" r="2.5"/><circle cx="1320" cy="335" r="3"/>
          <circle cx="250" cy="816" r="2.5"/><circle cx="690" cy="154" r="2.5"/><circle cx="1226" cy="523" r="3"/>
        </g>
      </svg>
    </div>
    <app-navigation />
    <main id="home">
      <app-hero />
      <app-about />
      <app-skills />
      <app-projects />
      <app-contact />
    </main>
    <app-footer />
  `,
  styles: [`
    :host { display: block; }
    main, app-footer { position: relative; z-index: 1; }
    .ambient-network { position: fixed; z-index: 0; inset: 0; overflow: hidden; pointer-events: none; opacity: .65; }
    .ambient-network svg { width: 100%; height: 100%; }
    .network-nodes circle { fill: #d4d1d0; opacity: .58; animation: nodePulse 4.6s ease-in-out infinite; }
    .network-nodes circle:nth-child(3n) { fill: #d41514; opacity: .72; animation-delay: -1.8s; }
    .network-nodes circle:nth-child(2n) { animation-delay: -3s; }
    .network-trace { stroke: rgba(212,21,20,.55); stroke-width: 1.3; stroke-dasharray: 3 20; animation: traceFlow 18s linear infinite; }
    @keyframes traceFlow { to { stroke-dashoffset: -460; } }
    @keyframes nodePulse { 0%, 100% { opacity: .32; } 50% { opacity: .9; } }
    @media (prefers-reduced-motion: reduce) { .network-nodes circle, .network-trace { animation: none; } }
  `],
})
export class HomeComponent {}

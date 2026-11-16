import { Component } from '@angular/core';
import { SkillDiceComponent } from '../skill-dice/skill-dice';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [SkillDiceComponent],
  templateUrl: './hero.html',
  styleUrls: ['./hero.scss'],
})
export class HeroComponent {}

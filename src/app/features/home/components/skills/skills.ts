import { Component, ViewEncapsulation } from '@angular/core';

interface SkillDie {
  name: string;
  color: string;
  category: string;
  detail: string;
  mark: string;
  face?: 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';
}

@Component({
  selector: 'app-skills',
  standalone: true,
  templateUrl: './skills.html',
  styleUrls: ['./skills.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class SkillsComponent {
  readonly skills: SkillDie[] = [
    { name: 'Java', mark: 'J', face: 'front', color: '#f89820', category: 'Programming language', detail: 'Building application logic and backend features.' },
    { name: 'React', mark: 'R', face: 'right', color: '#61dafb', category: 'Frontend library', detail: 'Creating component-based user interfaces.' },
    { name: 'Python', mark: 'Py', color: '#ffd343', category: 'Programming language', detail: 'Writing readable scripts and application logic.' },
    { name: 'JavaScript', mark: 'JS', color: '#f7df1e', category: 'Programming language', detail: 'Adding interactive behavior to web applications.' },
    { name: 'Spring', mark: 'S', face: 'back', color: '#6db33f', category: 'Java framework', detail: 'Developing services and application backends.' },
    { name: 'MongoDB', mark: 'M', face: 'left', color: '#47a248', category: 'Document database', detail: 'Storing and working with document-based data.' },
    { name: 'MySQL', mark: 'SQL', face: 'bottom', color: '#57a5ce', category: 'Relational database', detail: 'Working with structured data and SQL.' },
    { name: 'Docker', mark: 'D', color: '#2496ed', category: 'Container platform', detail: 'Packaging applications and their runtime environment.' },
    { name: 'Git', mark: 'Git', color: '#f05032', category: 'Version control', detail: 'Tracking code changes and collaborating on projects.' },
    { name: 'HTML', mark: '5', color: '#e34f26', category: 'Markup language', detail: 'Structuring content for web pages.' },
    { name: 'CSS', mark: 'CSS', face: 'top', color: '#8b6bdb', category: 'Styling', detail: 'Creating layouts, visual styles, and responsive interfaces.' },
    { name: 'Node', mark: 'JS', color: '#83cd29', category: 'JavaScript runtime', detail: 'Running JavaScript on the server side.' },
    { name: 'DSA', mark: 'DSA', color: '#d41514', category: 'Problem solving', detail: 'Using data structures and algorithms to break down problems and build efficient solutions.' },
  ];

  activeSkill: SkillDie | null = null;
  pinnedSkill: SkillDie | null = null;

  get currentSkill(): SkillDie | null {
    return this.activeSkill ?? this.pinnedSkill;
  }

  get featuredSkills(): SkillDie[] {
    return this.skills.filter((skill) => skill.face);
  }

  get extraSkills(): SkillDie[] {
    return this.skills.filter((skill) => !skill.face);
  }

  previewSkill(skill: SkillDie): void {
    this.activeSkill = skill;
  }

  clearPreview(skill?: SkillDie): void {
    if (!skill || this.activeSkill === skill) this.activeSkill = null;
  }

  toggleSkill(skill: SkillDie): void {
    if (this.pinnedSkill === skill) {
      this.pinnedSkill = null;
      this.activeSkill = null;
      return;
    }
    this.pinnedSkill = skill;
    this.activeSkill = skill;
  }
}

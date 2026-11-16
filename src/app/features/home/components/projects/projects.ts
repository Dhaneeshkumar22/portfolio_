import { Component } from '@angular/core';

interface Project {
  number: string;
  name: string;
  description: string;
  tech: string[];
  github?: string;
  demo?: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  templateUrl: './projects.html',
  styleUrls: ['./projects.scss'],
})
export class ProjectsComponent {
  readonly projects: Project[] = [
    {
      number: '01',
      name: 'CodeLeopard',
      description: 'A student-focused platform for practicing problems, learning data structures and algorithms, and tracking progress on a scoreboard.',
      tech: ['Angular', 'Spring Boot', 'MySQL'],
      github: 'https://github.com/Dhaneeshkumar22',
      demo: 'https://codeleopard.netlify.app/',
    },
    {
      number: '02',
      name: 'E-commerce REST API',
      description: 'A secure REST API for an online store, with email integration for customer communications.',
      tech: ['Java', 'Spring Boot', 'Aiven', 'Resend'],
      demo: 'https://ecommerce-api.onrender.com',
    },
    {
      number: '03',
      name: 'Kotlin Calculator',
      description: 'A clean, responsive native Android calculator built from scratch for standard arithmetic, with a modern interface.',
      tech: ['Kotlin', 'Android Studio', 'XML'],
    },
    {
      number: '04',
      name: 'Premium Nuts Store',
      description: 'An e-commerce platform focused on premium nuts, with a dynamic shopping cart and secure Stripe checkout.',
      tech: ['React', 'Spring Boot', 'MySQL', 'Stripe'],
    },
    {
      number: '05',
      name: 'Health Analysis Tracker',
      description: 'A machine-learning web app that predicts health risks from patient data using Python and Scikit-learn.',
      tech: ['Python', 'Scikit-learn', 'Pandas', 'Machine Learning'],
    },
    {
      number: '06',
      name: 'Spider Calendar',
      description: 'A place for students to connect with classmates, plan study sessions, and work together around a shared schedule.',
      tech: ['React', 'Spring Boot', 'MySQL'],
      github: 'https://github.com/Dhaneeshkumar22',
      demo: 'https://spidercalendar.netlify.app/',
    },
    {
      number: '07',
      name: 'AgriDairy',
      description: 'A dairy marketplace connecting customers with products from trusted farmers.',
      tech: ['React', 'Spring', 'PostgreSQL'],
      github: 'https://github.com/Dhaneeshkumar22',
      demo: 'https://agridairy.netlify.app/',
    },
  ];
}

import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class ContactComponent {
  contactForm: FormGroup;
  submitted = false;

  constructor(private readonly fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const { name, email, subject, message } = this.contactForm.getRawValue();
    const body = `From: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:kumardhaneesh53@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    this.submitted = true;
    this.contactForm.reset();
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SupportedLang } from '../services/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  template: `
    <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-bg/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a [routerLink]="['/', lang]" class="flex items-center gap-2 text-lg font-bold text-white">
          <img src="/img/ts-typed.png" alt="TS Typed" class="h-8 w-8" width="1024" height="1024">
          <span>TS Typed</span>
        </a>
        <nav class="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
          <a [routerLink]="['/', lang, 'docs', 'introduction']" class="hover:text-cyan">{{ 'nav.docs' | translate }}</a>
          <a [routerLink]="['/', lang, 'changelog']" class="hover:text-cyan">{{ 'nav.changelog' | translate }}</a>
          <a href="https://github.com/ts-typed" target="_blank" rel="noopener" class="hover:text-cyan">GitHub</a>
        </nav>
        <select
          class="rounded-md border border-white/20 bg-transparent px-3 py-1 text-sm text-slate-200 hover:border-cyan hover:text-cyan focus:outline-none focus:border-cyan"
          [value]="lang"
          (change)="setLang($any($event.target).value)"
        >
          <option value="pt">🇧🇷 PT-BR</option>
          <option value="en">🇬🇧 EN</option>
        </select>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  public get lang(): SupportedLang {
    return (this.translate.getCurrentLang() as SupportedLang) || 'en';
  }

  public setLang(next: SupportedLang): void {
    this.translate.use(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ts-typed-lang', next);
    }
    const url = this.router.url.replace(/^\/(en|pt)/, `/${next}`);
    this.router.navigateByUrl(url);
  }
}

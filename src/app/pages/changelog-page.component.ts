import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MarkdownModule } from 'ngx-markdown';
import { TranslatePipe } from '@ngx-translate/core';

interface ChangelogPackage {
  readonly id: string;
  readonly name: string;
  readonly repo: string;
  readonly npm: string;
}

const PACKAGES: ChangelogPackage[] = [
  { id: 'core', name: '@ts-typed/core', repo: 'https://github.com/ts-typed/ts-typed', npm: 'https://www.npmjs.com/package/@ts-typed/core' },
  { id: 'nestjs', name: '@ts-typed/nestjs', repo: 'https://github.com/ts-typed/nestjs', npm: 'https://www.npmjs.com/package/@ts-typed/nestjs' },
  { id: 'express', name: '@ts-typed/express', repo: 'https://github.com/ts-typed/express', npm: 'https://www.npmjs.com/package/@ts-typed/express' },
  { id: 'validators', name: '@ts-typed/validators', repo: 'https://github.com/ts-typed/validators', npm: 'https://www.npmjs.com/package/@ts-typed/validators' },
];

@Component({
  selector: 'app-changelog-page',
  standalone: true,
  imports: [MarkdownModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="mx-auto max-w-4xl px-4 py-12">
      <header class="mb-10">
        <p class="eyebrow text-sm font-semibold uppercase tracking-wide text-cyan">{{ 'changelog.eyebrow' | translate }}</p>
        <h1 class="mt-2 text-3xl font-bold text-white">{{ 'changelog.title' | translate }}</h1>
        <p class="mt-3 leading-7 text-slate-300">{{ 'changelog.intro' | translate }}</p>
      </header>
      <div class="flex flex-col gap-10">
        @for (pkg of packages; track pkg.id) {
          <section class="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <h2 class="text-xl font-bold text-white">{{ pkg.name }}</h2>
              <div class="flex items-center gap-4 text-sm">
                <a [href]="pkg.repo" target="_blank" rel="noopener" class="text-slate-300 hover:text-cyan">{{ 'changelog.repo' | translate }}</a>
                <a [href]="pkg.npm" target="_blank" rel="noopener" class="text-slate-300 hover:text-cyan">{{ 'changelog.npm' | translate }}</a>
              </div>
            </div>
            <article class="prose prose-invert mt-4 max-w-none prose-pre:bg-slate-950 prose-a:text-cyan prose-h2:text-lg prose-h2:mt-6">
              <markdown [src]="'/changelogs/' + pkg.id + '.md'"></markdown>
            </article>
          </section>
        }
      </div>
    </article>
  `,
})
export class ChangelogPageComponent {
  public readonly packages = PACKAGES;
}

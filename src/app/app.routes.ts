import { Routes } from '@angular/router';
import { RootRedirectComponent } from './pages/root-redirect.component';
import { LandingComponent } from './pages/landing/landing.component';
import { DocsLayoutComponent } from './pages/docs/docs-layout.component';
import { DocPageComponent } from './pages/docs/doc-page.component';
import { PerformancePageComponent } from './pages/docs/performance-page.component';
import { FrameworkChoiceComponent } from './pages/docs/framework-choice.component';
import { ChangelogPageComponent } from './pages/changelog-page.component';
import { CURRENT_DOCUMENTATION_VERSION } from './docs-versions';
import { langResolver } from './services/lang-resolver';

export const routes: Routes = [
  { path: '', component: RootRedirectComponent },
  {
    path: ':lang',
    resolve: { lang: langResolver },
    children: [
      { path: '', component: LandingComponent },
      { path: 'changelog', component: ChangelogPageComponent },
      {
        path: 'docs',
        component: DocsLayoutComponent,
        children: [
          { path: '', redirectTo: `${CURRENT_DOCUMENTATION_VERSION}/introduction`, pathMatch: 'full' },
          { path: ':version/getting-started', component: FrameworkChoiceComponent },
          { path: ':version/performance', component: PerformancePageComponent },
          { path: ':version/:framework/:slug', component: DocPageComponent },
          { path: ':version/requests', component: FrameworkChoiceComponent },
          { path: ':version/:slug', component: DocPageComponent },
          { path: 'getting-started', component: FrameworkChoiceComponent },
          { path: 'performance', component: PerformancePageComponent },
          { path: 'requests', component: FrameworkChoiceComponent },
          { path: ':slug', component: DocPageComponent },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

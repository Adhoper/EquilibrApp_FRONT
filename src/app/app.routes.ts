import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./autenticacion/login/login').then((c) => c.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./autenticacion/register/register').then((c) => c.Register),
  },

  {
    path: '',
    canActivate: [AuthGuard],
    loadComponent: () => import('./shared/components/layout/layout').then((c) => c.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/categorias/categorias').then((c) => c.Categorias)
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },

  // {
  //     path: '',
  //     redirectTo: 'login',
  //     pathMatch: 'full'
  // },
  // {
  //     path: 'login',
  //     loadComponent: () => import("./autenticacion/login/login").then(c => c.Login)
  // },
  // {
  //     path: '',
  //     loadComponent: () => import("./shared/components/layout/layout").then(c => c.Layout),
  //     canActivate:[AuthGuard],
  //     children: [
  //         {
  //         path: 'dashboard',
  //         loadComponent: () => import("./pages/dashboard/dashboard").then(c => c.Dashboard),
  //         },
  //         ...laboratoriosRoutes,
  //         ...aulasRoutes,
  //         ...usuarioRoutes,
  //         ...historialExperimentoRoutes,
  //         {
  //             path: '**',
  //             redirectTo: 'dashboard',
  //         },

  // ]
  // },
];

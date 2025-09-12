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
      {
        path: 'cuentas',
        loadComponent: () => import('./pages/cuentas/cuentas').then((c) => c.Cuentas)
      },
      {
        path: 'presupuestos',
        loadComponent: () => import('./pages/presupuestos/presupuestos').then((c) => c.Presupuestos)
      },
      {
        path: 'transacciones',
        loadComponent: () => import('./pages/transacciones/transacciones').then((c) => c.Transacciones)
      },
      {
        path: 'resumen-categoria',
        loadComponent: () => import('./pages/resumen-categoria/resumen-categoria').then((c) => c.ResumenCategoria)
      },
      {
        path: 'saldos',
        loadComponent: () => import('./pages/saldos-periodo/saldos-periodo').then((c) => c.SaldosPeriodo)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil').then((c) => c.Perfil)
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

import { Routes } from '@angular/router';

export const routes: Routes = [

    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        //loadComponent: () => import("./autenticacion/login/login.component").then(c => c.LoginComponent)
    },
    // {
    //     path: '',
    //     loadComponent: () => import("./shared/components/layout/layout.component").then(c => c.LayoutComponent),
    //     canActivate:[AuthGuard],
    //     children: [
    //         {
    //         path: 'dashboard',
    //         loadComponent: () => import("./pages/dashboard/dashboard.component").then(c => c.DashboardComponent),
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

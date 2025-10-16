# 🌐 EquilibrApp – Frontend

**EquilibrApp** es una aplicación web para gestionar **gastos e ingresos por períodos**, con una interfaz moderna y componentes standalone.

Permite organizar tus cuentas, transacciones y reportes de manera clara, manteniendo siempre el equilibrio financiero.

## 📂 Estructura General

- **Angular 20.2.0** con **Tailwind CSS** (UI responsiva y limpia).
- **Componentes standalone** y **Signals** para estado reactivo.
- Integración con la **API** (auth, categorías, cuentas, presupuestos, transacciones, reportes).
- **Flujo por período (YYYY-MM)**: los movimientos se consultan por mes; las **cuentas y su saldo inicial se mantienen como base**.

## 🚀 Funcionalidades Principales

- 🔐 **Autenticación con JWT** (login / registro).
- 👤 **Perfil**: cambio de nombre y contraseña (validación de contraseña actual y confirmación).
- 🧭 **Dashboard** con resumen rápido.
- 🗂️ **Categorías**: alta/edición, activación/inactivación y búsqueda.
- 💳 **Cuentas**: creación/edición, estatus y saldos por período.
- 💸 **Transacciones**: ingreso/gasto, filtro y paginación; navegación por meses.
- 📊 **Reportes** de saldos por período.
- 🔔 **Alertas** (campana en header) para umbrales de presupuesto.

## 📦 Instalación

```bash
npm install
ng serve
```

## 🌈 Tecnologías

- **Angular 20.2.0**
- **Tailwind CSS**
- **RxJS & Angular Services**
- **SweetAlert2**
- **NgxPagination**

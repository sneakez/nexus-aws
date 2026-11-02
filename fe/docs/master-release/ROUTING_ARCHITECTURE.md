# 14. CLIENT-SIDE ROUTING & NAVIGATION ARCHITECTURE

## 1. Architectural Strategy
NexusOMS V5 implements a zero-dependency, URL-synchronized client router via `src/lib/router.ts`.

### Key Advantages
- **Zero Bundle Overhead:** Eliminates external router dependencies while maintaining standard browser History API behavior.
- **Deep Linking Support:** Direct URL access to `/pricing`, `/solutions`, `/features/orders`, `/demo`, `/app` functions seamlessly.
- **Back/Forward Navigation:** Standard `popstate` event listeners synchronize browser history state with React state.
- **Secure Fallbacks:** Protected workspace routes automatically redirect unauthenticated guests to `/login` while preserving target location.

---

## 2. Route Categorization Matrix

| Path | Access Level | Component Target |
| :--- | :--- | :--- |
| `/` | Public | `LandingPage.tsx` |
| `/solutions` | Public | `SolutionsPage.tsx` |
| `/pricing` | Public | `PricingPage.tsx` |
| `/about` | Public | `AboutPage.tsx` |
| `/contact` | Public | `ContactPage.tsx` |
| `/demo` | Public (Simulated) | `DemoSandboxPage.tsx` |
| `/features/*` | Public | Feature Detail Pages |
| `/login` | Public / Guest | `LoginPage.tsx` |
| `/register` | Public / Guest | `RegisterPage.tsx` |
| `/forgot-password` | Public / Guest | `ForgotPasswordPage.tsx` |
| `/reset-password` | Public / Token | `ResetPasswordPage.tsx` |
| `/verify-email` | Public / Status | `VerifyEmailPage.tsx` |
| `/accept-invite` | Public / Token | `AcceptInvitePage.tsx` |
| `/onboarding` | Authenticated (New) | `OnboardingWizard.tsx` |
| `/app` | Authenticated (Active) | `AuthenticatedWorkspace` (Sidebar + Topbar) |

# Authentication UI Specification

VendoFlow's authentication pages (Login and Signup) have been redesigned for a premium, high-impact first impression.

## 1. Visual Layout
- **Two-Column Design**: Desktop views feature a 50/50 split layout.
- **Form Side (Left)**: Concentrated white-on-black interface with a focus on high-legibility inputs.
- **Experience Side (Right)**: A rounded dark pane (`rounded-[2.5rem]`) displaying high-fashion imagery and branding.

## 2. Image Rotation Logic
The `AuthImageRotation` component handles the dynamic experience on the right side of the screen.

- **Storage Path**: `public/assets/auth/`
- **Naming Convention**: `fashion-1.webp` through `fashion-10.webp`.
- **Rotation Interval**: 10 minutes (600,000ms).
- **Animations**: 
    - Smooth opacity fade (1.5s duration).
    - Subtle scale change (1.05 down to 1) for a "zoom-out" cinematic effect.
- **Overlay**: High-end branding with the text: *"Redefining Fashion Tech."*

## 3. Form States & Components
- **Inputs**: Zinc-900 background with Zinc-800 borders. White focus rings with low opacity.
- **Buttons**: Full-width white buttons with black uppercase text. No harsh rounding (using `rounded-sm`).
- **Success/Error**: Managed via `sonner` toasts for a non-intrusive floating feedback experience.
- **Loading**: Provisioning and authentication states trigger a subtle pulse or localized loading indicators within buttons.

## 4. Mobile Responsiveness
- **Breakpoint**: Imagery is hidden below the `lg` (1024px) breakpoint.
- **Mobile View**: Reverts to a centered, high-contrast single-column form to prioritize speed and usability on-the-go.

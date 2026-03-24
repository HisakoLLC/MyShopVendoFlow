import { toast } from "sonner"

/**
 * VendoFlow Admin Toast Utility
 * Stylized for the high-fashion monochrome aesthetic.
 */
export const adminToast = {
  success: (msg: string) => 
    toast.success(msg, { 
      style: { 
        background: '#0a0a0a', 
        border: '1px solid #1f1f1f', 
        color: '#fff',
        borderRadius: '12px',
        fontSize: '11px',
        textTransform: 'uppercase',
        fontWeight: '900',
        letterSpacing: '0.1em'
      } 
    }),
    
  error: (msg: string) => 
    toast.error(msg, { 
      style: { 
        background: '#0a0a0a', 
        border: '1px solid #ef4444', 
        color: '#fff',
        borderRadius: '12px',
        fontSize: '11px',
        textTransform: 'uppercase',
        fontWeight: '900',
        letterSpacing: '0.1em'
      } 
    }),
    
  loading: (msg: string) => 
    toast.loading(msg, { 
      style: { 
        background: '#0a0a0a', 
        border: '1px solid #1f1f1f', 
        color: '#fff',
        borderRadius: '12px',
        fontSize: '11px',
        textTransform: 'uppercase',
        fontWeight: '900',
        letterSpacing: '0.1em'
      } 
    }),

  dismiss: (id?: string | number) => toast.dismiss(id)
}

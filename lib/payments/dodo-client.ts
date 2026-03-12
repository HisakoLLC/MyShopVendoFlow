import DodoPayments from "dodopayments"
import { createHmac } from "crypto"

const DODO_API_KEY = process.env.DODO_API_KEY!
const DODO_SECRET_KEY = process.env.DODO_SECRET_KEY!
const DODO_ENV = (process.env.DODO_ENV || "test_mode") as "test_mode" | "live_mode"

// Product IDs from Dodo dashboard - set via env
const DODO_PRODUCT_IDS = {
  starter: process.env.DODO_PRODUCT_ID_STARTER!,
  core: process.env.DODO_PRODUCT_ID_CORE!,
  scale: process.env.DODO_PRODUCT_ID_SCALE!,
}

interface CreateCheckoutParams {
  customerEmail: string
  customerName: string
  customerPhone?: string
  planTier: "starter" | "core" | "scale"
  accountId: string
  returnUrl: string
}

interface CreateCheckoutResponse {
  success: boolean
  checkoutUrl?: string
  sessionId?: string
  error?: string
}

export class DodoPaymentsClient {
  private client: any

  constructor() {
    this.client = new DodoPayments({
      bearerToken: DODO_API_KEY,
      environment: DODO_ENV,
    })
  }

  /**
   * Create a checkout session for subscription purchase
   */
  async createCheckoutSession(params: CreateCheckoutParams): Promise<CreateCheckoutResponse> {
    try {
      const productId = DODO_PRODUCT_IDS[params.planTier]

      if (!productId) {
        throw new Error(`No product ID configured for plan: ${params.planTier}`)
      }

      const session = await this.client.checkoutSessions.create({
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
          },
        ],
        customer: {
          email: params.customerEmail,
          name: params.customerName,
          phone_number: params.customerPhone || undefined,
        },
        return_url: params.returnUrl,
        metadata: {
          vendoflow_account_id: params.accountId,
          plan_tier: params.planTier,
        },
      })

      return {
        success: true,
        checkoutUrl: session.checkout_url,
        sessionId: session.id,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Dodo checkout creation failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Create Customer Portal session for payment method management.
   *
   * Note: As of the current Dodo docs, the Customer Portal session API
   * is `client.customers.customerPortal.create(customerId)` and does not
   * take a return_url parameter. The returned object includes a `link`
   * property which is the URL to redirect the user to.
   */
  async createCustomerPortalSession(
    customerId: string,
    // Kept for future compatibility if Dodo adds explicit return URLs
    // (currently unused by the SDK call itself).
    _returnUrl: string
  ): Promise<{ success: boolean; portalUrl?: string; error?: string }> {
    try {
      const session = await this.client.customers.customerPortal.create(customerId)

      return {
        success: true,
        portalUrl: session.link,
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Customer portal creation failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      return await this.client.subscriptions.get(subscriptionId)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to get subscription:", error)
      return null
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      await this.client.subscriptions.cancel(subscriptionId)
      return { success: true }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to cancel subscription:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hmac = createHmac("sha256", DODO_SECRET_KEY)
      hmac.update(payload)
      const expectedSignature = hmac.digest("hex")
      return signature === expectedSignature
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Webhook signature verification failed:", error)
      return false
    }
  }
}

// Singleton instance
export const dodoClient = new DodoPaymentsClient()


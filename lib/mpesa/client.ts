/**
 * M-Pesa Daraja API Client
 * Handles OAuth, STK Push, and payment status queries
 */

type StkPushParams = {
  phoneNumber: string // Format: 254712345678
  amount: number
  accountReference: string // sale_id
}

type StkPushResponse = {
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CustomerMessage: string
}

type StkStatusResponse = {
  ResultCode: string
  ResultDesc: string
  MerchantRequestID?: string
  CheckoutRequestID?: string
}

type MpesaError = {
  errorCode: string
  errorMessage: string
}

export class MpesaClient {
  private consumerKey: string
  private consumerSecret: string
  private passkey: string
  private shortCode: string
  private environment: "sandbox" | "production"
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || ""
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || ""
    this.passkey = process.env.MPESA_PASSKEY || ""
    this.shortCode = process.env.MPESA_SHORTCODE || ""
    this.environment = (process.env.MPESA_ENVIRONMENT as "sandbox" | "production") || "sandbox"

    this.baseUrl =
      this.environment === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke"

    // Validate required credentials
    if (!this.consumerKey || !this.consumerSecret || !this.passkey || !this.shortCode) {
      console.warn(
        "M-Pesa credentials not fully configured. Some features may not work."
      )
    }
  }

  /**
   * Get OAuth access token from M-Pesa
   * Caches token for 1 hour (tokens expire after 1 hour)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    const now = Date.now()
    if (this.accessToken && this.tokenExpiry > now + 5 * 60 * 1000) {
      return this.accessToken
    }

    const url = `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`
    const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString(
      "base64"
    )

    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error_description || data.error)
        }

        if (!data.access_token) {
          throw new Error("No access token in response")
        }

        // Cache token (expires in 1 hour, but we'll refresh after 55 minutes)
        this.accessToken = data.access_token
        this.tokenExpiry = Date.now() + 55 * 60 * 1000

        return this.accessToken
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Exponential backoff: 1s, 2s, 4s
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw new Error(`Failed to get access token after 3 attempts: ${lastError?.message}`)
  }

  /**
   * Initiate STK Push payment request
   */
  async initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
    const { phoneNumber, amount, accountReference } = params

    // Validate phone number format (12 digits, starts with 254)
    if (!/^254\d{9}$/.test(phoneNumber)) {
      throw new Error("Invalid phone number format. Must be 12 digits starting with 254")
    }

    // Validate amount
    if (amount <= 0 || amount > 70000) {
      throw new Error("Amount must be between 1 and 70,000 KES")
    }

    const accessToken = await this.getAccessToken()
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, -5)
    const password = Buffer.from(`${this.shortCode}${this.passkey}${timestamp}`).toString(
      "base64"
    )

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/mpesa/callback`

    const payload = {
      BusinessShortCode: this.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount), // Round to whole number (M-Pesa doesn't accept decimals)
      PartyA: phoneNumber,
      PartyB: this.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: `Payment for sale ${accountReference}`,
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        // M-Pesa returns ResponseCode in the response
        if (data.ResponseCode !== "0") {
          // Handle specific error codes
          const errorMessages: Record<string, string> = {
            "1032": "Customer cancelled the request",
            "1037": "Request timeout - customer did not enter PIN",
            "1012": "Invalid phone number",
            "2001": "Insufficient balance",
            "2002": "Transaction failed",
          }

          const errorMsg =
            errorMessages[data.ResponseCode] || data.CustomerMessage || "Payment request failed"
          throw new Error(errorMsg)
        }

        return {
          CheckoutRequestID: data.CheckoutRequestID,
          ResponseCode: data.ResponseCode,
          ResponseDescription: data.ResponseDescription,
          MerchantRequestID: data.MerchantRequestID,
          CustomerMessage: data.CustomerMessage,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Don't retry on user errors (invalid phone, cancelled, etc.)
        if (
          lastError.message.includes("cancelled") ||
          lastError.message.includes("Invalid phone") ||
          lastError.message.includes("Insufficient balance")
        ) {
          throw lastError
        }
        // Exponential backoff for network errors
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw new Error(
      `Failed to initiate STK Push after 3 attempts: ${lastError?.message}`
    )
  }

  /**
   * Query STK Push payment status
   */
  async queryStkStatus(checkoutRequestId: string): Promise<StkStatusResponse> {
    const accessToken = await this.getAccessToken()
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, -5)
    const password = Buffer.from(`${this.shortCode}${this.passkey}${timestamp}`).toString(
      "base64"
    )

    const payload = {
      BusinessShortCode: this.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()

        return {
          ResultCode: data.ResultCode,
          ResultDesc: data.ResultDesc,
          MerchantRequestID: data.MerchantRequestID,
          CheckoutRequestID: data.CheckoutRequestID,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        // Exponential backoff
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    }

    throw new Error(
      `Failed to query STK status after 3 attempts: ${lastError?.message}`
    )
  }
}

// Export singleton instance
export const mpesaClient = new MpesaClient()
